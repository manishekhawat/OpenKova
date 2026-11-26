import { addDays } from '../utils/format';
import type { AppState, Settings, SpendCategory, Transaction } from './types';

// Sample data for trying the app out (Settings → Load sample data). Dates are relative to today so the app always looks "live".

type SampleCategory = Exclude<SpendCategory, 'Other'>;

const MERCHANTS: Record<SampleCategory, string[]> = {
  Food: ['Swiggy', 'Zomato', 'Blue Tokai', 'Third Wave Coffee'],
  Shopping: ['Amazon', 'Myntra', 'Flipkart', 'Croma'],
  Travel: ['IndiGo', 'IRCTC', 'Uber', 'MakeMyTrip'],
  Fuel: ['Indian Oil', 'HP Petrol', 'Shell'],
  Groceries: ['Blinkit', 'Zepto', 'BigBasket', 'DMart'],
  Entertainment: ['BookMyShow', 'Netflix', 'Spotify', 'PVR'],
  Utilities: ['Airtel', 'Jio', 'Tata Play'],
  Health: ['Apollo Pharmacy', 'PharmEasy', 'Cult.fit'],
};

const RANGES: Record<SampleCategory, [number, number]> = {
  Food: [180, 1400],
  Shopping: [600, 9000],
  Travel: [250, 12000],
  Fuel: [1500, 3500],
  Groceries: [300, 2800],
  Entertainment: [149, 1200],
  Utilities: [299, 1500],
  Health: [200, 2500],
};

// Deterministic PRNG so the sample history is stable between installs.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeTransactions(cardIds: string[]): Transaction[] {
  const r = rng(42);
  const cats = Object.keys(MERCHANTS) as SampleCategory[];
  const out: Transaction[] = [];
  for (let day = 0; day < 180; day++) {
    const perDay = r() < 0.55 ? 1 : r() < 0.5 ? 2 : 0;
    for (let k = 0; k < perDay; k++) {
      const category = cats[Math.floor(r() * cats.length)];
      const [lo, hi] = RANGES[category];
      const list = MERCHANTS[category];
      out.push({
        id: `t_${day}_${k}`,
        cardId: cardIds[Math.floor(r() * cardIds.length)],
        merchant: list[Math.floor(r() * list.length)],
        category,
        amount: Math.round(lo + r() * (hi - lo)),
        date: addDays(-day),
        source: 'sample',
      });
    }
  }
  return out;
}

export function seedState(): AppState {
  const cards: AppState['cards'] = [
    {
      id: 'c_hdfc',
      bank: 'HDFC Bank',
      name: 'Regalia Gold',
      network: 'Visa',
      last4: '4821',
      holder: '',
      limit: 400000,
      outstanding: 48250.5,
      minDue: 2413,
      dueDate: addDays(3),
      statementDate: addDays(-17),
      palette: ['#3B2F63', '#211A3D'],
    },
    {
      id: 'c_axis',
      bank: 'Axis Bank',
      name: 'Atlas',
      network: 'Mastercard',
      last4: '1190',
      holder: '',
      limit: 250000,
      outstanding: 17840,
      minDue: 892,
      dueDate: addDays(9),
      statementDate: addDays(-11),
      palette: ['#5A2533', '#36141E'],
    },
    {
      id: 'c_sbi',
      bank: 'SBI Card',
      name: 'Cashback',
      network: 'Visa',
      last4: '7703',
      holder: '',
      limit: 150000,
      outstanding: 0,
      minDue: 0,
      dueDate: addDays(21),
      statementDate: addDays(1),
      palette: ['#1F4A44', '#10302B'],
    },
  ];

  return {
    user: null,
    cards,
    accounts: [
      { id: 'a_hdfc', bank: 'HDFC Bank', type: 'Salary', last4: '3307', ifsc: 'HDFC0001234', balance: 186420.75, primary: true },
      { id: 'a_icici', bank: 'ICICI Bank', type: 'Savings', last4: '9012', ifsc: 'ICIC0000456', balance: 52310 },
      { id: 'a_kotak', bank: 'Kotak Mahindra Bank', type: 'Savings', last4: '5568', ifsc: 'KKBK0000789', balance: 8940.2 },
    ],
    bills: [
      { id: 'b_elec', category: 'Electricity', biller: 'BESCOM', consumerId: '7710 2245 91', amount: 2140, dueDate: addDays(2) },
      { id: 'b_net', category: 'Broadband', biller: 'ACT Fibernet', consumerId: '1023998', amount: 1178, dueDate: addDays(5) },
      { id: 'b_mob', category: 'Mobile postpaid', biller: 'Airtel Postpaid', consumerId: '98450 12345', amount: 699, dueDate: addDays(11) },
      { id: 'b_rent', category: 'Rent', biller: 'Rent to Mr. Rao', consumerId: 'Flat 402', amount: 32000, dueDate: addDays(14) },
      { id: 'b_gas', category: 'Gas', biller: 'Indane LPG', consumerId: 'IND-55021', amount: 903, dueDate: addDays(-1) },
      { id: 'b_ins', category: 'Insurance', biller: 'HDFC Life', consumerId: 'POL 88213', amount: 18500, dueDate: addDays(26) },
    ],
    vehicles: [
      {
        id: 'v_city',
        regNo: 'KA 03 MN 4521',
        make: 'Honda',
        model: 'City',
        fuel: 'Petrol',
        kind: 'Car',
        year: 2021,
        insurer: 'ICICI Lombard',
        insuranceExpiry: addDays(18),
        pucExpiry: addDays(-4),
        serviceDue: addDays(40),
        fastagBalance: 212,
        challans: [
          { id: 'ch1', offence: 'Over-speeding', location: 'Outer Ring Rd, Bengaluru', date: addDays(-22), amount: 1000 },
          { id: 'ch2', offence: 'No parking', location: 'Indiranagar 100ft Rd', date: addDays(-9), amount: 500 },
        ],
      },
      {
        id: 'v_bike',
        regNo: 'KA 51 HX 0917',
        make: 'Royal Enfield',
        model: 'Classic 350',
        fuel: 'Petrol',
        kind: 'Bike',
        year: 2023,
        insurer: 'Acko',
        insuranceExpiry: addDays(190),
        pucExpiry: addDays(64),
        serviceDue: addDays(6),
        fastagBalance: 0,
        challans: [],
      },
    ],
    transactions: makeTransactions(cards.map((c) => c.id)),
    payments: [],
    settings: defaultSettings(),
  };
}

export function defaultSettings(): Settings {
  return { lockEnabled: false, remindersEnabled: true, reminderDaysBefore: [3, 1, 0], reminderHour: 9 };
}

/** What a real user starts with: nothing but their name. */
export function emptyState(): AppState {
  return { user: null, cards: [], accounts: [], bills: [], vehicles: [], transactions: [], payments: [], settings: defaultSettings() };
}
