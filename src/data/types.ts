export type Network = 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'Diners';

export interface CreditCard {
  id: string;
  bank: string;
  name: string; // product name, e.g. "Regalia"
  network: Network;
  last4: string;
  holder: string;
  limit: number;
  outstanding: number;
  minDue: number;
  dueDate: string; // ISO
  statementDate: string; // ISO
  palette: [string, string];
}

export interface BankAccount {
  id: string;
  bank: string;
  type: 'Savings' | 'Current' | 'Salary';
  last4: string;
  ifsc: string;
  balance: number;
  primary?: boolean;
}

export type BillCategory =
  | 'Electricity'
  | 'Broadband'
  | 'Mobile postpaid'
  | 'Rent'
  | 'Gas'
  | 'Water'
  | 'Insurance'
  | 'DTH';

export interface Bill {
  id: string;
  category: BillCategory;
  biller: string;
  consumerId: string;
  amount: number;
  dueDate: string;
  paidOn?: string;
}

export interface Challan {
  id: string;
  offence: string;
  location: string;
  date: string;
  amount: number;
  paidOn?: string;
}

export interface Vehicle {
  id: string;
  regNo: string;
  make: string;
  model: string;
  fuel: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
  kind: 'Car' | 'Bike';
  year: number;
  insurer: string;
  insuranceExpiry: string;
  pucExpiry: string;
  serviceDue: string;
  fastagBalance: number;
  challans: Challan[];
}

export type SpendCategory =
  | 'Food'
  | 'Shopping'
  | 'Travel'
  | 'Fuel'
  | 'Groceries'
  | 'Entertainment'
  | 'Utilities'
  | 'Health';

export interface Transaction {
  id: string;
  cardId: string;
  merchant: string;
  category: SpendCategory;
  amount: number;
  date: string;
}

export type PaymentKind = 'card' | 'bill' | 'challan' | 'fastag';

export interface Payment {
  id: string;
  kind: PaymentKind;
  refId: string;
  title: string;
  amount: number;
  fromAccountId: string;
  date: string;
}

export interface User {
  name: string;
  phone: string;
}

export interface AppState {
  user: User | null;
  cards: CreditCard[];
  accounts: BankAccount[];
  bills: Bill[];
  vehicles: Vehicle[];
  transactions: Transaction[];
  payments: Payment[];
}
