// Run with: npx tsx src/cards/cardDetails.test.ts
import assert from 'node:assert/strict';
import { guessFromOcr, networkFromAid, networkFromIin } from './cardDetails';

assert.equal(networkFromIin('438628'), 'Visa');
assert.equal(networkFromIin('552260'), 'Mastercard');
assert.equal(networkFromIin('222300'), 'Mastercard');
assert.equal(networkFromIin('376911'), 'Amex');
assert.equal(networkFromIin('608326'), 'RuPay');
assert.equal(networkFromIin('508534'), 'RuPay');
assert.equal(networkFromAid('A0000005241010'), 'RuPay');
assert.equal(networkFromAid('A0000000041010'), 'Mastercard');

// Lines as ML Kit returns them, card number already masked by the native side.
let g = guessFromOcr(['HDFC BANK', 'Regalia Gold', '•••• 4821', 'VALID FROM 03/22', 'VALID THRU 03/29', 'ASHA RAO', 'VISA', 'Signature'], '4821', '438628');
assert.equal(g.bank, 'HDFC Bank');
assert.equal(g.network, 'Visa');
assert.equal(g.product, 'Regalia Gold');
assert.deepEqual(g.expiry, { month: 3, year: 2029 });
assert.equal(g.holder, 'ASHA RAO');
assert.equal(g.last4, '4821');

g = guessFromOcr(['AXIS BANK', 'Atlas', 'R K SHARMA', 'world', 'mastercard', '11/28'], null, null);
assert.equal(g.bank, 'Axis Bank');
assert.equal(g.network, 'Mastercard');
assert.equal(g.holder, 'R K SHARMA');
assert.deepEqual(g.expiry, { month: 11, year: 2028 });
assert.equal(g.last4, undefined);

console.log('card details tests: all passed');
