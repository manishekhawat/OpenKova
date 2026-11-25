// Heuristic parser for Indian bank / card SMS alerts. Pure functions, no React Native imports,
// so it can be unit-tested in Node. Formats vary by bank; anything we can't read confidently is skipped.

import type { SpendCategory } from '../data/types';

export type ParsedSms =
  | { kind: 'spend'; last4: string; amount: number; merchant: string; date: number; smsId: string }
  | { kind: 'statement'; last4: string; total: number; minDue?: number; dueDate?: string; smsId: string; date: number }
  | { kind: 'balance'; last4: string; balance: number; smsId: string; date: number };

const AMT = String.raw`(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)`;
const amountRe = new RegExp(AMT, 'i');

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function num(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Parses 28-11-2026, 28/11/26, 28-Nov-26, 28 Nov 2026, 2026-11-28, Nov 28, 2026. Returns ISO at local noon. */
export function parseDate(s: string): string | undefined {
  let d: number | undefined, m: number | undefined, y: number | undefined;
  let r = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (r) [y, m, d] = [Number(r[1]), Number(r[2]) - 1, Number(r[3])];
  else if ((r = s.match(/(\d{1,2})[-\/ .](\d{1,2})[-\/ .](\d{2,4})/))) [d, m, y] = [Number(r[1]), Number(r[2]) - 1, Number(r[3])];
  else if ((r = s.match(/(\d{1,2})[-\/ ]?([A-Za-z]{3})[A-Za-z]*[-\/ ,]*(\d{2,4})/))) [d, m, y] = [Number(r[1]), MONTHS[r[2].toLowerCase()], Number(r[3])];
  else if ((r = s.match(/([A-Za-z]{3})[A-Za-z]*\s+(\d{1,2}),?\s+(\d{4})/))) [m, d, y] = [MONTHS[r[1].toLowerCase()], Number(r[2]), Number(r[3])];
  if (d == null || m == null || y == null || Number.isNaN(m)) return undefined;
  if (y < 100) y += 2000;
  if (m < 0 || m > 11 || d < 1 || d > 31) return undefined;
  return new Date(y, m, d, 12).toISOString();
}

const cardRe = /(?:credit\s*card|card|cc)[^\d]{0,25}?(?:ending(?:\s*(?:with|in))?|no\.?|number|xx+|x+|\*+|\s)\s*[x*]*\s*(\d{4})\b/i;
const acctRe = /(?:a\/c|acct|account|ac)\s*(?:no\.?)?\s*[x*.]*\s*(\d{3,6})\b/i;

function last4From(re: RegExp, body: string): string | undefined {
  const m = body.match(re);
  return m ? m[1].slice(-4) : undefined;
}

function merchantFrom(body: string): string {
  const m =
    body.match(/\b(?:at|to|towards|@)\s+([A-Za-z0-9][A-Za-z0-9&.'*\-_ ]{1,40}?)(?=\s+(?:on|at|for|via|ref|txn|avl|available|is|was)\b|[.,;]|\s*$)/i) ??
    body.match(/\binfo[:\s]+([A-Za-z0-9&.'*\-_ ]{2,30})/i);
  if (!m) return 'Card spend';
  return m[1]
    .replace(/\s+/g, ' ')
    .replace(/[*_]+/g, ' ')
    .trim()
    .replace(/\b\w+/g, (w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .slice(0, 32);
}

const IGNORE = /\b(otp|one[- ]time password|verification code|do not share|declined|failed|unsuccessful|reversed|reversal)\b/i;
const CREDIT = /\b(credited|refund(?:ed)?|received|cashback|payment (?:of .{0,30})?(?:has been )?received|thank you for (?:your )?payment)\b/i;

export function parseSms(sms: { id: string; body: string; date: number }): ParsedSms | null {
  const body = sms.body.replace(/\s+/g, ' ').trim();
  if (IGNORE.test(body)) return null;

  // Statements: "Total Amt Due Rs 48,250.50, Min Amt Due Rs 2,413, due by 28-Nov-26"
  const total = body.match(new RegExp(String.raw`(?:total|tot\.?)\s*(?:amt\.?|amount)?\s*(?:due|payable)\s*(?:is|of|:|-)?\s*${AMT}`, 'i'));
  if (total && /card/i.test(body)) {
    const last4 = last4From(cardRe, body);
    if (!last4) return null;
    const min = body.match(new RegExp(String.raw`min(?:imum|\.)?\s*(?:amt\.?|amount)?\s*(?:due|payable)\s*(?:is|of|:|-)?\s*${AMT}`, 'i'));
    const dueStr = body.match(/(?:due\s*(?:date|by|on)|pay\s*by|payable\s*by)\s*(?:is|:|-|on)?\s*([0-9A-Za-z][0-9A-Za-z ,\/-]{5,14})/i);
    return {
      kind: 'statement',
      last4,
      total: num(total[1])!,
      minDue: num(min?.[1]),
      dueDate: dueStr ? parseDate(dueStr[1]) : undefined,
      smsId: sms.id,
      date: sms.date,
    };
  }

  if (CREDIT.test(body)) {
    // Credits can still carry a balance update for a bank account.
    return balanceOnly(body, sms);
  }

  // Card spends: "Rs.1,234.00 spent on HDFC Bank Card x4821 at AMAZON on 2026-11-20"
  const isSpend = /\b(spent|used|debited|charged|purchase|txn|transaction)\b/i.test(body);
  const cardLast4 = last4From(cardRe, body);
  if (isSpend && cardLast4 && /card/i.test(body) && !/debit card/i.test(body)) {
    const amt = body.match(amountRe);
    const amount = num(amt?.[1]);
    if (!amount) return null;
    return { kind: 'spend', last4: cardLast4, amount, merchant: merchantFrom(body), date: sms.date, smsId: sms.id };
  }

  return balanceOnly(body, sms);
}

function balanceOnly(body: string, sms: { id: string; date: number }): ParsedSms | null {
  const bal = body.match(new RegExp(String.raw`(?:avl\.?|avbl\.?|available|avail\.?|clear|closing|net)\s*(?:bal(?:ance)?\.?|bal)\s*(?:is|:|-|of)?\s*${AMT}`, 'i'));
  const last4 = last4From(acctRe, body);
  if (!bal || !last4) return null;
  const balance = num(bal[1]);
  if (balance == null) return null;
  return { kind: 'balance', last4, balance, smsId: sms.id, date: sms.date };
}

const CATEGORY_WORDS: [SpendCategory, RegExp][] = [
  ['Food', /swiggy|zomato|eatsure|domino|pizza|mcdonald|kfc|starbucks|cafe|coffee|restaurant|burger|biryani|chai/i],
  ['Groceries', /blinkit|zepto|bigbasket|dmart|instamart|grocer|jiomart|more retail|reliance fresh|nature'?s basket/i],
  ['Travel', /uber|ola|rapido|irctc|indigo|air ?india|vistara|akasa|makemytrip|goibibo|cleartrip|redbus|metro|hotel|airbnb|ixigo/i],
  ['Fuel', /petrol|fuel|indian ?oil|iocl|hpcl|bpcl|bharat petroleum|shell|nayara/i],
  ['Entertainment', /netflix|spotify|hotstar|prime video|bookmyshow|pvr|inox|youtube|sony ?liv|zee5|steam|playstation/i],
  ['Utilities', /airtel|jio|vodafone|\bvi\b|bescom|tata power|electricity|broadband|act fibernet|bsnl|tata play|gas/i],
  ['Health', /pharm|apollo|medplus|1mg|netmeds|hospital|clinic|cult\.?fit|diagnostic|lab/i],
  ['Shopping', /amazon|flipkart|myntra|ajio|nykaa|croma|reliance digital|meesho|decathlon|ikea|tata cliq|apple/i],
];

export function guessCategory(merchant: string): SpendCategory {
  for (const [cat, re] of CATEGORY_WORDS) if (re.test(merchant)) return cat;
  return 'Other';
}
