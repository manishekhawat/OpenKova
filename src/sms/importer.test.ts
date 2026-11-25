// Run with: npx tsx src/sms/importer.test.ts
import assert from 'node:assert/strict';
import { seedState } from '../data/seed';
import { buildImport } from './importer';

const s = seedState();
const now = Date.now();
const msgs = [
  { id: '1', date: now - 3600e3, body: 'Rs.1,234.00 spent on HDFC Bank Card x4821 at SWIGGY on 2026-11-20. Avl Lmt:Rs.3,50,000' },
  { id: '2', date: now - 7200e3, body: 'INR 499.00 spent using ICICI Bank Card XX9999 on 20-Nov-26 on NETFLIX.' }, // unknown card
  { id: '3', date: now - 864e5, body: 'Your Axis Bank Credit Card XX1190 statement is generated. Total Amount Due: INR 20,000.00; Minimum Amount Due: INR 1,000.00; Payment Due Date: 05/12/2026.' },
  { id: '4', date: now - 2 * 864e5, body: 'Your Axis Bank Credit Card XX1190 statement: Total Amount Due: INR 9,999.00; Minimum Amount Due: INR 500.00; Payment Due Date: 05/11/2026.' }, // older
  { id: '5', date: now - 600e3, body: 'Rs.5,000.00 debited from A/c XX3307 on 20-11-26. Avl Bal Rs 1,81,420.75' },
  { id: '6', date: now - 900e3, body: 'Rs.2,000.00 debited from A/c XX3307. Avl Bal Rs 1,86,420.75' }, // older balance
  { id: '7', date: now, body: '552211 is your OTP. Do not share.' },
];
const p = buildImport(s, msgs);
assert.equal(p.scanned, 7);
assert.equal(p.spends, 1);
assert.equal(p.data.transactions[0].category, 'Food');
assert.deepEqual(p.unknownCards, ['9999']);
assert.equal(p.data.cardUpdates.length, 1);
assert.equal(p.data.cardUpdates[0].outstanding, 20000);
assert.equal(p.data.accountUpdates[0].balance, 181420.75);
// Re-import doesn't duplicate spends
const again = buildImport({ ...s, transactions: [...p.data.transactions, ...s.transactions] }, msgs);
assert.equal(again.spends, 0);
console.log('importer tests: all passed');
