import type { SmsImport } from '../data/store';
import type { AppState, Transaction } from '../data/types';
import { guessCategory, parseSms, type ParsedSms } from './parse';

export type ImportPreview = {
  data: SmsImport;
  scanned: number;
  spends: number;
  statements: { cardLabel: string; total: number; dueDate?: string }[];
  balances: { accountLabel: string; balance: number }[];
  unknownCards: string[]; // last4s seen in card SMS with no matching card in Kova
  unknownAccounts: string[];
};

/** Turns raw inbox messages into changes for Kova, matching cards/accounts by last 4 digits. */
export function buildImport(state: AppState, messages: { id: string; body: string; date: number }[]): ImportPreview {
  const parsed = messages.map(parseSms).filter((p): p is ParsedSms => !!p);
  const cardBy = new Map(state.cards.map((c) => [c.last4, c]));
  const accBy = new Map(state.accounts.map((a) => [a.last4, a]));
  const known = new Set(state.transactions.map((t) => t.id));

  const transactions: Transaction[] = [];
  const unknownCards = new Set<string>();
  const unknownAccounts = new Set<string>();
  // Newest statement / balance per card or account wins.
  const latestStatement = new Map<string, Extract<ParsedSms, { kind: 'statement' }>>();
  const latestBalance = new Map<string, Extract<ParsedSms, { kind: 'balance' }>>();

  for (const p of parsed) {
    if (p.kind === 'spend') {
      const card = cardBy.get(p.last4);
      if (!card) {
        unknownCards.add(p.last4);
        continue;
      }
      const id = `sms_${p.smsId}`;
      if (known.has(id)) continue;
      transactions.push({ id, cardId: card.id, merchant: p.merchant, category: guessCategory(p.merchant), amount: p.amount, date: new Date(p.date).toISOString(), source: 'sms' });
    } else if (p.kind === 'statement') {
      if (!cardBy.has(p.last4)) unknownCards.add(p.last4);
      else if ((latestStatement.get(p.last4)?.date ?? 0) < p.date) latestStatement.set(p.last4, p);
    } else {
      if (!accBy.has(p.last4)) unknownAccounts.add(p.last4);
      else if ((latestBalance.get(p.last4)?.date ?? 0) < p.date) latestBalance.set(p.last4, p);
    }
  }

  const cardUpdates: SmsImport['cardUpdates'] = [];
  const statements: ImportPreview['statements'] = [];
  for (const [last4, s] of latestStatement) {
    const card = cardBy.get(last4)!;
    // Don't overwrite a newer statement the user typed in by hand.
    if (new Date(card.statementDate).getTime() > s.date) continue;
    // Spends after the statement are not part of it; payments already recorded since then reduce it.
    const paidSince = state.payments.filter((p) => p.kind === 'card' && p.refId === card.id && new Date(p.date).getTime() > s.date).reduce((n, p) => n + p.amount, 0);
    const outstanding = Math.max(0, +(s.total - paidSince).toFixed(2));
    cardUpdates.push({ cardId: card.id, outstanding, minDue: s.minDue, dueDate: s.dueDate, statementDate: new Date(s.date).toISOString() });
    statements.push({ cardLabel: `${card.bank} •• ${last4}`, total: outstanding, dueDate: s.dueDate });
  }

  const accountUpdates: SmsImport['accountUpdates'] = [];
  const balances: ImportPreview['balances'] = [];
  for (const [last4, b] of latestBalance) {
    const acc = accBy.get(last4)!;
    accountUpdates.push({ accountId: acc.id, balance: b.balance });
    balances.push({ accountLabel: `${acc.bank} •• ${last4}`, balance: b.balance });
  }

  const lastScan = messages.reduce((m, x) => Math.max(m, x.date), state.settings.smsLastScan ?? 0);
  return {
    data: { transactions, cardUpdates, accountUpdates, lastScan },
    scanned: messages.length,
    spends: transactions.length,
    statements,
    balances,
    unknownCards: [...unknownCards],
    unknownAccounts: [...unknownAccounts],
  };
}
