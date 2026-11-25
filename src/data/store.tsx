import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { addDays, uid } from '../utils/format';
import { seedState } from './seed';
import type { AppState, Bill, CreditCard, Payment, PaymentKind, User, Vehicle, BankAccount } from './types';

const STORAGE_KEY = 'kova/state/v1';

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'login'; user: User }
  | { type: 'logout' }
  | { type: 'reset' }
  | { type: 'addCard'; card: CreditCard }
  | { type: 'removeCard'; id: string }
  | { type: 'addAccount'; account: BankAccount }
  | { type: 'addBill'; bill: Bill }
  | { type: 'removeBill'; id: string }
  | { type: 'addVehicle'; vehicle: Vehicle }
  | { type: 'removeVehicle'; id: string }
  | { type: 'pay'; kind: PaymentKind; refId: string; subId?: string; amount: number; fromAccountId: string; title: string };

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

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'hydrate':
      return a.state;
    case 'login':
      return {
        ...state,
        user: a.user,
        cards: state.cards.map((c) => ({ ...c, holder: c.holder || a.user.name.toUpperCase() })),
      };
    case 'logout':
      return { ...state, user: null };
    case 'reset':
      return { ...seedState(), user: state.user };
    case 'addCard':
      return { ...state, cards: [...state.cards, a.card] };
    case 'removeCard':
      return { ...state, cards: state.cards.filter((c) => c.id !== a.id) };
    case 'addAccount':
      return { ...state, accounts: [...state.accounts, a.account] };
    case 'addBill':
      return { ...state, bills: [...state.bills, a.bill] };
    case 'removeBill':
      return { ...state, bills: state.bills.filter((b) => b.id !== a.id) };
    case 'addVehicle':
      return { ...state, vehicles: [...state.vehicles, a.vehicle] };
    case 'removeVehicle':
      return { ...state, vehicles: state.vehicles.filter((v) => v.id !== a.id) };
    case 'pay':
      return applyPayment(state, a);
  }
}

interface StoreValue {
  state: AppState;
  ready: boolean;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'hydrate', state: JSON.parse(raw) as AppState });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const value = useMemo(() => ({ state, dispatch, ready }), [state, ready]);
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
    items.push({ key: 'i' + v.id, kind: 'insurance', title: `${v.make} ${v.model} insurance`, subtitle: v.regNo, dueDate: v.insuranceExpiry, refId: v.id });
    items.push({ key: 'p' + v.id, kind: 'puc', title: `${v.make} ${v.model} PUC`, subtitle: v.regNo, dueDate: v.pucExpiry, refId: v.id });
    items.push({ key: 's' + v.id, kind: 'service', title: `${v.make} ${v.model} service`, subtitle: v.regNo, dueDate: v.serviceDue, refId: v.id });
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

export const totalCardDue = (s: AppState) => s.cards.reduce((n, c) => n + c.outstanding, 0);
export const totalBalance = (s: AppState) => s.accounts.reduce((n, a) => n + a.balance, 0);
