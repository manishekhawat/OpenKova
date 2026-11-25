// Run with: npx tsx src/sms/parse.test.ts
import assert from 'node:assert/strict';
import { detectBank, guessCategory, parseDate, parseSms, regFrom } from './parse';

const T = Date.UTC(2026, 10, 20);
let n = 0;
const p = (body: string, address?: string) => parseSms({ id: String(++n), body, date: T, address });

// ---- Card spends (formats modelled on common Indian bank alerts)
let r = p('Rs.1,234.00 spent on HDFC Bank Card x4821 at AMAZON PAY on 2026-11-20:10:12:11.Avl Lmt:Rs.3,50,000', 'VM-HDFCBK');
assert.equal(r?.kind, 'spend');
if (r?.kind === 'spend') {
  assert.equal(r.last4, '4821'); assert.equal(r.amount, 1234); assert.match(r.merchant, /amazon/i);
  assert.equal(r.availableLimit, 350000); assert.equal(r.bank, 'HDFC Bank');
}

r = p('INR 499.00 spent using ICICI Bank Card XX9012 on 20-Nov-26 on NETFLIX. Avl Limit: INR 1,20,000.00. If not you, call 1800 2662.');
assert.equal(r?.kind, 'spend');
if (r?.kind === 'spend') { assert.equal(r.last4, '9012'); assert.equal(r.amount, 499); assert.equal(r.bank, 'ICICI Bank'); }

r = p('Transaction of INR 2,150.50 on your Axis Bank Credit Card no. XX1190 at SWIGGY on 20-11-2026 10:15. Avl Limit INR 2,30,000');
assert.equal(r?.kind, 'spend');
if (r?.kind === 'spend') { assert.equal(r.last4, '1190'); assert.equal(r.amount, 2150.5); assert.match(r.merchant, /swiggy/i); }

r = p('Your SBI Credit Card ending 7703 has been used for Rs 3,000.00 at INDIAN OIL on 19/11/26.', 'JD-SBICRD');
assert.equal(r?.kind, 'spend');
if (r?.kind === 'spend') { assert.equal(r.last4, '7703'); assert.equal(r.amount, 3000); assert.equal(r.bank, 'SBI Card'); }

// ---- Statements
r = p('Statement for HDFC Bank Credit Card ending 4821: Total Amt Due Rs 48,250.50, Min Amt Due Rs 2,413.00, due by 28-Nov-26.');
assert.equal(r?.kind, 'statement');
if (r?.kind === 'statement') {
  assert.equal(r.last4, '4821'); assert.equal(r.total, 48250.5); assert.equal(r.minDue, 2413);
  assert.equal(new Date(r.dueDate!).getDate(), 28);
}

r = p('Your Axis Bank Credit Card XX1190 statement is generated. Total Amount Due: INR 17,840.00; Minimum Amount Due: INR 892.00; Payment Due Date: 05/12/2026.');
assert.equal(r?.kind, 'statement');
if (r?.kind === 'statement') { assert.equal(r.total, 17840); assert.equal(r.minDue, 892); assert.equal(new Date(r.dueDate!).getMonth(), 11); }

// ---- Card payments
r = p('Payment of Rs 48,250.50 received towards your HDFC Bank Credit Card x4821. Thank you.');
assert.equal(r?.kind, 'cardPayment');
if (r?.kind === 'cardPayment') { assert.equal(r.last4, '4821'); assert.equal(r.amount, 48250.5); }

// ---- Bank balances
r = p('Rs.5,000.00 debited from A/c XX3307 on 20-11-26 to VPA abc@okhdfc. Avl Bal Rs 1,81,420.75', 'AD-HDFCBK');
assert.equal(r?.kind, 'balance');
if (r?.kind === 'balance') { assert.equal(r.last4, '3307'); assert.equal(r.balance, 181420.75); assert.equal(r.bank, 'HDFC Bank'); }

r = p('Your A/c no. XXXXXX9012 is credited with INR 85,000.00 on 01-Nov-26 (Salary). Available balance: INR 1,37,310.00', 'VK-ICICIB');
assert.equal(r?.kind, 'balance');
if (r?.kind === 'balance') { assert.equal(r.last4, '9012'); assert.equal(r.balance, 137310); assert.equal(r.bank, 'ICICI Bank'); }

// ---- Bills
r = p('Dear Customer, your BESCOM electricity bill of Rs 2,140.00 for consumer no 7710224591 is due on 28-11-2026. Pay now to avoid disconnection.', 'VM-BESCOM');
assert.equal(r?.kind, 'bill');
if (r?.kind === 'bill') { assert.equal(r.biller, 'BESCOM'); assert.equal(r.category, 'Electricity'); assert.equal(r.amount, 2140); assert.equal(r.consumerId, '7710224591'); }

r = p('Your Airtel bill of Rs 699.00 for 9845012345 is due on 05-Dec-26. Pay via Airtel Thanks app.', 'AX-AIRTEL');
assert.equal(r?.kind, 'bill');
if (r?.kind === 'bill') { assert.equal(r.category, 'Mobile postpaid'); assert.equal(r.amount, 699); }

r = p('Premium of Rs 18,500 for policy no 88213456 is due on 20-12-2026. Renew to stay protected.', 'VM-HDFCLI');
assert.equal(r?.kind, 'bill');
if (r?.kind === 'bill') { assert.equal(r.category, 'Insurance'); assert.equal(r.amount, 18500); }

// ---- Vehicles
r = p('FASTag: Rs 120.00 debited for toll at Electronic City Plaza for vehicle KA03MN4521. Avl Bal Rs 212.50', 'VM-ICICIT');
assert.equal(r?.kind, 'fastag');
if (r?.kind === 'fastag') { assert.equal(r.regNo, 'KA 03 MN 4521'); assert.equal(r.balance, 212.5); }

r = p('e-Challan no KA12345678901 of Rs 1000 issued against vehicle KA-03-MN-4521 for Over Speeding on 02/11/2026. Pay at echallan.parivahan.gov.in');
assert.equal(r?.kind, 'challan');
if (r?.kind === 'challan') { assert.equal(r.regNo, 'KA 03 MN 4521'); assert.equal(r.amount, 1000); assert.equal(r.challanNo, 'KA12345678901'); assert.equal(r.paid, false); }

r = p('Your motor insurance policy from ICICI Lombard for vehicle KA03MN4521 expires on 12-Dec-2026. Renew now.');
assert.equal(r?.kind, 'vehicleDoc');
if (r?.kind === 'vehicleDoc') { assert.equal(r.doc, 'insurance'); assert.equal(r.insurer, 'ICICI Lombard'); assert.equal(new Date(r.expiry).getMonth(), 11); }

// ---- Ignored
assert.equal(p('123456 is your OTP for txn of Rs 2,000 on HDFC Bank Card x4821. Do not share.'), null);
assert.equal(p('Txn of Rs 999 on Card x4821 at MYNTRA declined due to incorrect PIN'), null);
assert.equal(p('Congratulations! You are eligible for a pre-approved loan of up to Rs 5,00,000.'), null);
assert.equal(p('Hey, are we meeting at 5?'), null);

// ---- Helpers
assert.equal(new Date(parseDate('Nov 28, 2026')!).getMonth(), 10);
assert.equal(parseDate('99/99/2026'), undefined);
assert.equal(regFrom('vehicle 22BH1234AA'), '22 BH 1234 AA');
assert.equal(detectBank('JM-KOTAKB-S', 'x'), 'Kotak Mahindra Bank');
assert.equal(guessCategory('Swiggy Instamart'), 'Food');
assert.equal(guessCategory('Uber India'), 'Travel');
assert.equal(guessCategory('Random Shop'), 'Other');

console.log('parse tests: all passed');
