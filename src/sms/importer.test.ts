// Run with: npx tsx src/sms/importer.test.ts
import assert from 'node:assert/strict';
import { emptyState, seedState } from '../data/seed';
import { addDays } from '../utils/format';
import { buildImport, isEmpty } from './importer';

const now = Date.now();
const dd = (days: number) => {
  const d = new Date(addDays(days));
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

// ---- Updating existing data (sample state)
{
  const s = seedState();
  const msgs = [
    { id: '1', date: now - 3600e3, body: 'Rs.1,234.00 spent on HDFC Bank Card x4821 at SWIGGY on 2026-11-20. Avl Lmt:Rs.3,50,000' },
    { id: '3', date: now - 864e5, body: `Your Axis Bank Credit Card XX1190 statement is generated. Total Amount Due: INR 20,000.00; Minimum Amount Due: INR 1,000.00; Payment Due Date: ${dd(10)}.` },
    { id: '4', date: now - 2 * 864e5, body: 'Your Axis Bank Credit Card XX1190 statement: Total Amount Due: INR 9,999.00; Minimum Amount Due: INR 500.00; Payment Due Date: 05/11/2026.' },
    { id: '5', date: now - 600e3, body: 'Rs.5,000.00 debited from A/c XX3307 on 20-11-26. Avl Bal Rs 1,81,420.75' },
    { id: '6', date: now - 900e3, body: 'Rs.2,000.00 debited from A/c XX3307. Avl Bal Rs 1,86,420.75' },
    { id: '7', date: now - 1200e3, body: 'Payment of Rs 5,000.00 received towards your Axis Bank Credit Card XX1190. Thank you.' },
    { id: '8', date: now, body: '552211 is your OTP. Do not share.' },
  ];
  const p = buildImport(s, msgs, { discover: false });
  assert.equal(p.scanned, 7);
  assert.equal(p.changes.transactions.length, 1);
  assert.equal(p.changes.transactions[0].category, 'Food');
  const axis = p.changes.cards.find((c) => c.last4 === '1190')!;
  assert.equal(axis.outstanding, 15000, 'statement 20,000 minus payment 5,000 made after it');
  assert.equal(p.changes.payments.length, 1);
  assert.equal(p.changes.accounts[0].balance, 181420.75, 'newest balance wins');
  assert.equal(p.changes.newCards.length, 0);
  // Re-import doesn't duplicate spends or payments
  const again = buildImport({ ...s, transactions: [...p.changes.transactions, ...s.transactions], payments: p.changes.payments }, msgs, { discover: false });
  assert.equal(again.changes.transactions.length + again.changes.payments.length, 0);
}

// ---- Discovering everything from an empty app
{
  const s = { ...emptyState(), user: { name: 'Asha Rao' } };
  const msgs = [
    { id: 'a', address: 'VM-HDFCBK', date: now - 5 * 864e5, body: 'Rs.1,234.00 spent on HDFC Bank Credit Card x4821 at AMAZON on 2026-11-20. Avl Lmt:Rs.3,00,000' },
    { id: 'b', address: 'VM-HDFCBK', date: now - 4 * 864e5, body: `Statement for HDFC Bank Credit Card ending 4821: Total Amt Due Rs 48,250.50, Min Amt Due Rs 2,413.00, due by ${dd(12)}.` },
    { id: 'c', address: 'AD-ICICIB', date: now - 3 * 864e5, body: 'Your A/c no. XXXXXX9012 is credited with INR 85,000.00 on 01-Nov-26. Available balance: INR 1,37,310.00' },
    { id: 'd', address: 'VM-BESCOM', date: now - 2 * 864e5, body: `Your BESCOM electricity bill of Rs 2,140.00 for consumer no 7710224591 is due on ${dd(6)}.` },
    { id: 'e', address: 'VM-ICICIT', date: now - 864e5, body: 'FASTag: Rs 120.00 debited for toll for vehicle KA03MN4521. Avl Bal Rs 212.50' },
    { id: 'f', date: now - 864e5, body: 'e-Challan no KA12345678901 of Rs 1000 issued against vehicle KA-03-MN-4521 for Over Speeding on 02/11/2026.' },
    { id: 'g', date: now - 3600e3, body: `Your motor insurance policy from ICICI Lombard for vehicle KA03MN4521 expires on ${dd(30)}. Renew now.` },
  ];
  const p = buildImport(s, msgs);
  const c = p.changes;
  assert.equal(c.newCards.length, 1);
  assert.equal(c.newCards[0].bank, 'HDFC Bank');
  assert.equal(c.newCards[0].holder, 'ASHA RAO');
  assert.equal(c.newCards[0].outstanding, 48250.5);
  assert.equal(c.newCards[0].limit, Math.round(300000 + 48250.5));
  assert.equal(c.newAccounts.length, 1);
  assert.equal(c.newAccounts[0].bank, 'ICICI Bank');
  assert.equal(c.newAccounts[0].primary, true);
  assert.equal(c.newBills.length, 1);
  assert.equal(c.newBills[0].biller, 'BESCOM');
  assert.equal(c.newVehicles.length, 1);
  const v = c.newVehicles[0];
  assert.equal(v.regNo, 'KA 03 MN 4521');
  assert.equal(v.fastagBalance, 212.5);
  assert.equal(v.challans.length, 1);
  assert.equal(v.insurer, 'ICICI Lombard');
  assert.ok(v.insuranceExpiry);
  assert.equal(c.transactions.length, 1);
  assert.equal(c.transactions[0].cardId, c.newCards[0].id);
  assert.equal(isEmpty(c), false);

  // Same bill again isn't duplicated
  const again = buildImport({ ...s, bills: c.newBills }, msgs.slice(3, 4));
  assert.equal(again.changes.newBills.length, 0);
}

console.log('importer tests: all passed');
