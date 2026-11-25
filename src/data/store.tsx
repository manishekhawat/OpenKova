import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { addDays, uid } from '../utils/format';
import { defaultSettings, emptyState, seedState } from './seed';
import type { AppState, BankAccount, Bill, CreditCard, PaymentKind, Payment, Settings, Transaction, User, Vehicle } from './types';
import { loadState, saveState, wipeVault } from './vault';

import type { SmsChanges } from '../sms/importer';

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'onboard'; user: User; withSample: boolean }
  | { type: 'rename'; name: string }
  | { type: 'loadSample' }
  | { type: 'erase' }
  | { type: 'restore'; state: AppState }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'addCard'; card: CreditCard }
  | { type: 'updateCard'; card: CreditCard }
  | { type: 'removeCard'; id: string }
  | { type: 'addAccount'; account: BankAccount }
  | { type: 'updateAccount'; account: BankAccount }
  | { type: 'removeAccount'; id: string }
  | { type: 'addBill'; bill: Bill }
  | { type: 'updateBill'; bill: Bill }
  | { type: 'removeBill'; id: string }
  | { type: 'addVehicle'; vehicle: Vehicle }
  | { type: 'updateVehicle'; vehicle: Vehicle }
  | { type: 'removeVehicle'; id: string }
  | { type: 'importSms'; changes: SmsChanges }
  | { type: 'pay'; kind: PaymentKind; refId: string; subId?: string; amount: number; fromAccountId?: string; title: string };

/** Fills in fields added after the first build so older saved data keeps working. */
export function migrate(raw: Partial<AppState>): AppState {
  const base = emptyState();
  return {
    ...base,
    ...raw,
    settings: { ...defaultSettings(), ...(raw.settings ?? {}) },
  } as AppState;
}

function applyPayment(state: AppState, a: Extract<Action, { type: 'pay' }>): AppState {
  const now = new Date().toISOString();
  const payment: Payment = {
    id: uid('p'),
    kind: a.kind,
    refId: a.refId,
    title: a.title,
    amount: a.amount,
    fromAccountId: a.fromAccountId,
    date: now,
  };
  const accounts = state.accounts.map((acc) =>
    acc.id === a.fromAccountId ? { ...acc, balance: +(acc.balance - a.amount).toFixed(2) } : acc,
  );
  let { cards, bills, vehicles } = state;

  if (a.kind === 'card') {
    cards = cards.map((c) => {
      if (c.id !== a.refId) return c;
      const outstanding = Math.max(0, +(c.outstanding - a.amount).toFixed(2));
      return { ...c, outstanding, minDue: outstanding === 0 ? 0 : Math.max(0, c.minDue - a.amount) };
    });
  } else if (a.kind === 'bill') {
    // Paid bills stay in history; the next cycle is scheduled a month later.
    bills = bills.flatMap((b) => {
      if (b.id !== a.refId) return [b];
      const next: Bill = { ...b, id: uid('b'), dueDate: addDays(30, new Date(b.dueDate)), paidOn: undefined };
      return [{ ...b, paidOn: now }, next];
    });
  } else if (a.kind === 'challan') {
    vehicles = vehicles.map((v) =>
      v.id !== a.refId
        ? v
        : { ...v, challans: v.challans.map((ch) => (ch.id === a.subId ? { ...ch, paidOn: now } : ch)) },
    );
  } else if (a.kind === 'fastag') {
    vehicles = vehicles.map((v) => (v.id === a.refId ? { ...v, fastagBalance: v.fastagBalance + a.amount } : v));
  }
  return { ...state, accounts, cards, bills, vehicles, payments: [payment, ...state.payments] };
}

function replace<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x));
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'hydrate':
      return a.state;
    case 'onboard': {
      const base = a.withSample ? seedState() : emptyState();
      const user = a.user;
      return {
        ...base,
        user,
        settings: { ...base.settings, ...state.settings },
        cards: base.cards.map((c) => ({ ...c, holder: user.name.toUpperCase() })),
      };
    }
    case 'rename':
      return state.user ? { ...state, user: { ...state.user, name: a.name } } : state;
    case 'loadSample': {
      const s = seedState();
      return { ...s, user: state.user, settings: state.settings, cards: s.cards.map((c) => ({ ...c, holder: state.user?.name.toUpperCase() ?? '' })) };
    }
    case 'erase':
      return emptyState();
    case 'restore':
      return { ...migrate(a.state), user: a.state.user ?? state.user };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'addCard':
      return { ...state, cards: [...state.cards, a.card] };
    case 'updateCard':
      return { ...state, cards: replace(state.cards, a.card) };
    case 'removeCard':
      return { ...state, cards: state.cards.filter((c) => c.id !== a.id), transactions: state.transactions.filter((t) => t.cardId !== a.id) };
    case 'addAccount':
      return { ...state, accounts: [...state.accounts, a.account] };
    case 'updateAccount':
      return { ...state, accounts: replace(state.accounts, a.account) };
    case 'removeAccount':
      return { ...state, accounts: state.accounts.filter((x) => x.id !== a.id) };
    case 'addBill':
      return { ...state, bills: [...state.bills, a.bill] };
    case 'updateBill':
      return { ...state, bills: replace(state.bills, a.bill) };
    case 'removeBill':
      return { ...state, bills: state.bills.filter((b) => b.id !== a.id) };
    case 'addVehicle':
      return { ...state, vehicles: [...state.vehicles, a.vehicle] };
    case 'updateVehicle':
      return { ...state, vehicles: replace(state.vehicles, a.vehicle) };
    case 'removeVehicle':
      return { ...state, vehicles: state.vehicles.filter((v) => v.id !== a.id) };
    case 'importSms': {
      const c = a.changes;
      const merge = <T extends { id: string }>(list: T[], updated: T[], added: T[]) => {
        const byId = new Map(updated.map((x) => [x.id, x]));
        return [...list.map((x) => byId.get(x.id) ?? x), ...added.filter((x) => !list.some((y) => y.id === x.id))];
      };
      const knownT = new Set(state.transactions.map((t) => t.id));
      const knownP = new Set(state.payments.map((p) => p.id));
      return {
        ...state,
        cards: merge(state.cards, c.cards, c.newCards),
        accounts: merge(state.accounts, c.accounts, c.newAccounts),
        vehicles: merge(state.vehicles, c.vehicles, c.newVehicles),
        bills: [...state.bills, ...c.newBills.filter((b) => !state.bills.some((x) => x.id === b.id))],
        transactions: [...c.transactions.filter((t) => !knownT.has(t.id)), ...state.transactions].sort((x, y) => +new Date(y.date) - +new Date(x.date)),
        payments: [...c.payments.filter((p) => !knownP.has(p.id)), ...state.payments].sort((x, y) => +new Date(y.date) - +new Date(x.date)),
        settings: { ...state.settings, smsLastScan: Math.max(state.settings.smsLastScan ?? 0, c.lastScan) },
      };
    }
    case 'pay':
      return applyPayment(state, a);
  }
}

interface StoreValue {
  state: AppState;
  ready: boolean;
  loadError: string | null;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    loadState<AppState>()
      .then((saved) => {
        if (saved) dispatch({ type: 'hydrate', state: migrate(saved) });
      })
      .catch((e) => setLoadError(String(e?.message ?? e)))
      .finally(() => setReady(true));
  }, []);

  // Debounced encrypted save. Never save while a load error is showing, so a failed
  // decrypt can't overwrite the user's file with an empty state.
  useEffect(() => {
    if (!ready || loadError) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (!state.user) wipeVault().catch(() => {});
      else saveState(state).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [state, ready, loadError]);

  const value = useMemo(
    () => ({
      state,
      ready,
      loadError,
      dispatch: (a: Action) => {
        if (a.type === 'erase') setLoadError(null);
        dispatch(a);
      },
    }),
    [state, ready, loadError],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ---------- Derived selectors ----------

export type UpcomingItem = {
  key: string;
  kind: 'card' | 'bill' | 'insurance' | 'puc' | 'service' | 'challan';
  title: string;
  subtitle: string;
  amount?: number;
  dueDate: string;
  refId: string;
};

export function selectUpcoming(state: AppState): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  for (const c of state.cards) {
    if (c.outstanding > 0)
      items.push({ key: 'c' + c.id, kind: 'card', title: `${c.bank} ${c.name}`, subtitle: `Card •• ${c.last4}`, amount: c.outstanding, dueDate: c.dueDate, refId: c.id });
  }
  for (const b of state.bills) {
    if (!b.paidOn)
      items.push({ key: 'b' + b.id, kind: 'bill', title: b.biller, subtitle: b.category, amount: b.amount, dueDate: b.dueDate, refId: b.id });
  }
  for (const v of state.vehicles) {
    const name = vehicleName(v);
    if (v.insuranceExpiry) items.push({ key: 'i' + v.id, kind: 'insurance', title: `${name} insurance`, subtitle: v.regNo, dueDate: v.insuranceExpiry, refId: v.id });
    if (v.pucExpiry) items.push({ key: 'p' + v.id, kind: 'puc', title: `${name} PUC`, subtitle: v.regNo, dueDate: v.pucExpiry, refId: v.id });
    if (v.serviceDue) items.push({ key: 's' + v.id, kind: 'service', title: `${name} service`, subtitle: v.regNo, dueDate: v.serviceDue, refId: v.id });
    const open = v.challans.filter((c) => !c.paidOn);
    if (open.length)
      items.push({
        key: 'ch' + v.id,
        kind: 'challan',
        title: `${open.length} pending challan${open.length > 1 ? 's' : ''}`,
        subtitle: v.regNo,
        amount: open.reduce((s, c) => s + c.amount, 0),
        dueDate: open[0].date,
        refId: v.id,
      });
  }
  return items.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
}

export function vehicleName(v: Vehicle): string {
  const n = `${v.make} ${v.model}`.trim();
  return n || (v.kind === 'Bike' ? 'Your bike' : 'Your car');
}

export const totalCardDue = (s: AppState) => s.cards.reduce((n, c) => n + c.outstanding, 0);
export const totalBalance = (s: AppState) => s.accounts.reduce((n, a) => n + a.balance, 0);
