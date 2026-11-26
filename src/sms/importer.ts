// Turns parsed SMS into changes for Kova. Existing cards/accounts are matched by last 4 digits,
// vehicles by registration number. With `discover`, things Kova doesn't know yet (a new card,
// account, bill or vehicle) are created too.

import type { AppState, BankAccount, Bill, Challan, CreditCard, Payment, Transaction, Vehicle } from '../data/types';
import { daysFromToday } from '../utils/format';
import { guessCategory, parseSms, type ParsedSms, type Sms } from './parse';
import { CARD_PALETTES as PALETTES } from '../cards/palettes';

export type SmsChanges = {
  newCards: CreditCard[];
  newAccounts: BankAccount[];
  newBills: Bill[];
  newVehicles: Vehicle[];
  cards: CreditCard[]; // updated versions of existing cards
  accounts: BankAccount[];
  vehicles: Vehicle[];
  transactions: Transaction[];
  payments: Payment[];
  lastScan: number;
};

export type ImportPreview = {
  changes: SmsChanges;
  scanned: number;
  recognised: number;
  summary: { cardsUpdated: number; accountsUpdated: number; vehiclesUpdated: number; spends: number; payments: number };
};


type P<K extends ParsedSms['kind']> = Extract<ParsedSms, { kind: K }>;
const iso = (ms: number) => new Date(ms).toISOString();

export function buildImport(state: AppState, messages: Sms[], opts: { discover?: boolean } = {}): ImportPreview {
  const discover = opts.discover ?? true;
  const parsed = messages
    .map(parseSms)
    .filter((p): p is ParsedSms => !!p)
    .sort((a, b) => a.date - b.date); // oldest first so later messages win

  const holder = state.user?.name.toUpperCase() ?? '';
  const knownTxn = new Set(state.transactions.map((t) => t.id));
  const knownPay = new Set(state.payments.map((p) => p.id));

  // Working copies keyed by last4 / reg number.
  const cards = new Map(state.cards.map((c) => [c.last4, { ...c }]));
  const accounts = new Map(state.accounts.map((a) => [a.last4, { ...a }]));
  const vehicles = new Map(state.vehicles.map((v) => [v.regNo, { ...v, challans: [...v.challans] }]));
  const created = { cards: new Set<string>(), accounts: new Set<string>(), vehicles: new Set<string>() };
  const touched = { cards: new Set<string>(), accounts: new Set<string>(), vehicles: new Set<string>() };

  const transactions: Transaction[] = [];
  const payments: Payment[] = [];
  const newBills: Bill[] = [];
  const maxAvailable = new Map<string, number>();

  const card = (p: { last4: string; bank?: string; network?: CreditCard['network'] }, ms: number): CreditCard | undefined => {
    let c = cards.get(p.last4);
    if (!c && discover) {
      c = {
        id: `c_sms_${p.last4}`,
        bank: p.bank ?? 'Credit card',
        name: 'Credit Card',
        network: p.network ?? 'Other',
        last4: p.last4,
        holder,
        limit: 0,
        outstanding: 0,
        minDue: 0,
        dueDate: iso(ms),
        statementDate: iso(0),
        palette: PALETTES[(state.cards.length + created.cards.size) % PALETTES.length],
      };
      cards.set(p.last4, c);
      created.cards.add(p.last4);
    }
    if (c && p.network && c.network === 'Other') c.network = p.network;
    return c;
  };

  const vehicle = (regNo: string): Vehicle | undefined => {
    let v = vehicles.get(regNo);
    if (!v && discover) {
      v = { id: `v_sms_${regNo.replace(/\s/g, '')}`, regNo, make: '', model: '', fuel: 'Petrol', kind: 'Car', year: new Date().getFullYear(), insurer: 'Not added', fastagBalance: 0, challans: [] };
      vehicles.set(regNo, v);
      created.vehicles.add(regNo);
    }
    return v;
  };

  for (const p of parsed) {
    switch (p.kind) {
      case 'spend': {
        const c = card(p, p.date);
        if (!c) break;
        if (p.availableLimit) maxAvailable.set(p.last4, Math.max(maxAvailable.get(p.last4) ?? 0, p.availableLimit));
        const id = `sms_${p.smsId}`;
        if (knownTxn.has(id)) break;
        transactions.push({ id, cardId: c.id, merchant: p.merchant, category: guessCategory(p.merchant), amount: p.amount, date: iso(p.date), source: 'sms' });
        // Spends after the last statement aren't billed yet, so they don't change "outstanding".
        touched.cards.add(p.last4);
        break;
      }
      case 'statement': {
        const c = card(p, p.date);
        if (!c || new Date(c.statementDate).getTime() > p.date) break; // keep a newer, hand-entered statement
        c.outstanding = p.total;
        c.minDue = p.minDue ?? Math.round(p.total * 0.05);
        if (p.dueDate) c.dueDate = p.dueDate;
        c.statementDate = iso(p.date);
        touched.cards.add(p.last4);
        break;
      }
      case 'cardPayment': {
        const c = card(p, p.date);
        if (!c) break;
        const id = `sms_${p.smsId}`;
        if (knownPay.has(id)) break;
        payments.push({ id, kind: 'card', refId: c.id, title: `${c.bank} card payment`, amount: p.amount, date: iso(p.date) });
        // Only payments after the current statement reduce what's due.
        if (p.date > new Date(c.statementDate).getTime()) {
          c.outstanding = Math.max(0, +(c.outstanding - p.amount).toFixed(2));
          c.minDue = c.outstanding === 0 ? 0 : Math.max(0, c.minDue - p.amount);
        }
        touched.cards.add(p.last4);
        break;
      }
      case 'balance': {
        let a = accounts.get(p.last4);
        if (!a && discover) {
          a = { id: `a_sms_${p.last4}`, bank: p.bank ?? 'Bank account', type: 'Savings', last4: p.last4, ifsc: '', balance: 0, primary: state.accounts.length === 0 && created.accounts.size === 0 };
          accounts.set(p.last4, a);
          created.accounts.add(p.last4);
        }
        if (!a) break;
        a.balance = p.balance;
        touched.accounts.add(p.last4);
        break;
      }
      case 'bill': {
        if (!discover || daysFromToday(p.dueDate) < -7) break; // skip long-past bills
        const same = (b: Bill) =>
          b.category === p.category &&
          (b.biller.toLowerCase() === p.biller.toLowerCase() || (!!p.consumerId && b.consumerId === p.consumerId)) &&
          Math.abs(new Date(b.dueDate).getTime() - new Date(p.dueDate).getTime()) < 10 * 864e5;
        if (state.bills.some(same) || newBills.some(same)) break;
        newBills.push({ id: `b_sms_${p.smsId}`, category: p.category, biller: p.biller, consumerId: p.consumerId ?? '—', amount: p.amount, dueDate: p.dueDate });
        break;
      }
      case 'fastag': {
        const v = vehicle(p.regNo);
        if (!v) break;
        v.fastagBalance = p.balance;
        touched.vehicles.add(p.regNo);
        break;
      }
      case 'challan': {
        const v = vehicle(p.regNo);
        if (!v) break;
        const existing = v.challans.find((c) => (p.challanNo && c.challanNo === p.challanNo) || (c.amount === p.amount && Math.abs(new Date(c.date).getTime() - p.date) < 3 * 864e5));
        if (existing) {
          if (p.paid && !existing.paidOn) existing.paidOn = iso(p.date);
        } else {
          const ch: Challan = { id: `ch_sms_${p.smsId}`, offence: p.offence, location: '—', date: iso(p.date), amount: p.amount, challanNo: p.challanNo, paidOn: p.paid ? iso(p.date) : undefined };
          v.challans = [ch, ...v.challans];
        }
        touched.vehicles.add(p.regNo);
        break;
      }
      case 'vehicleDoc': {
        const v = vehicle(p.regNo);
        if (!v) break;
        if (p.doc === 'insurance') {
          v.insuranceExpiry = p.expiry;
          if (p.insurer) v.insurer = p.insurer;
        } else v.pucExpiry = p.expiry;
        touched.vehicles.add(p.regNo);
        break;
      }
    }
  }

  // A new card's limit is roughly what's available plus what's owed.
  for (const [last4, avl] of maxAvailable) {
    const c = cards.get(last4)!;
    if (!c.limit) c.limit = Math.round(avl + c.outstanding);
  }

  const pick = <T,>(m: Map<string, T>, keys: Set<string>, include: boolean) => [...m.entries()].filter(([k]) => keys.has(k) === include).map(([, v]) => v);
  const updatedOnly = <T,>(m: Map<string, T>, t: Set<string>, c: Set<string>) => [...m.entries()].filter(([k]) => t.has(k) && !c.has(k)).map(([, v]) => v);

  const changes: SmsChanges = {
    newCards: pick(cards, created.cards, true),
    newAccounts: pick(accounts, created.accounts, true),
    newVehicles: pick(vehicles, created.vehicles, true),
    newBills,
    cards: updatedOnly(cards, touched.cards, created.cards),
    accounts: updatedOnly(accounts, touched.accounts, created.accounts),
    vehicles: updatedOnly(vehicles, touched.vehicles, created.vehicles),
    transactions,
    payments,
    lastScan: messages.reduce((m, x) => Math.max(m, x.date), state.settings.smsLastScan ?? 0),
  };

  return {
    changes,
    scanned: messages.length,
    recognised: parsed.length,
    summary: {
      cardsUpdated: changes.cards.length,
      accountsUpdated: changes.accounts.length,
      vehiclesUpdated: changes.vehicles.length,
      spends: transactions.length,
      payments: payments.length,
    },
  };
}

export function isEmpty(c: SmsChanges) {
  return (
    c.newCards.length + c.newAccounts.length + c.newBills.length + c.newVehicles.length + c.cards.length + c.accounts.length + c.vehicles.length + c.transactions.length + c.payments.length ===
    0
  );
}
