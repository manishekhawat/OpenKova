// Heuristic parser for Indian bank, card, biller and vehicle SMS. Pure functions, no React Native
// imports, so it can be unit-tested in Node. Formats vary by sender; anything we can't read
// confidently is skipped rather than guessed.

import type { BillCategory, Network, SpendCategory } from '../data/types';

type Base = { smsId: string; date: number; bank?: string };

export type ParsedSms =
  | (Base & { kind: 'spend'; last4: string; amount: number; merchant: string; availableLimit?: number; network?: Network })
  | (Base & { kind: 'statement'; last4: string; total: number; minDue?: number; dueDate?: string; network?: Network })
  | (Base & { kind: 'cardPayment'; last4: string; amount: number })
  | (Base & { kind: 'balance'; last4: string; balance: number })
  | (Base & { kind: 'bill'; biller: string; category: BillCategory; amount: number; dueDate: string; consumerId?: string })
  | (Base & { kind: 'fastag'; regNo: string; balance: number })
  | (Base & { kind: 'challan'; regNo: string; amount: number; challanNo?: string; offence: string; paid: boolean })
  | (Base & { kind: 'vehicleDoc'; regNo: string; doc: 'insurance' | 'puc'; expiry: string; insurer?: string });

export type Sms = { id: string; body: string; date: number; address?: string };

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

// ---------- Who sent it ----------

// DLT sender IDs look like "VM-HDFCBK" or "JD-ICICIT-S". Key = the 6-letter header.
const SENDER_BANKS: [RegExp, string][] = [
  [/HDFC/, 'HDFC Bank'],
  [/ICICI/, 'ICICI Bank'],
  [/AXIS/, 'Axis Bank'],
  [/SBICRD|SBICARD|SBIPSG|CARDSBI/, 'SBI Card'],
  [/SBI|CBSSBI|SBMSMS/, 'SBI'],
  [/KOTAK/, 'Kotak Mahindra Bank'],
  [/IDFC/, 'IDFC FIRST Bank'],
  [/YESB/, 'YES Bank'],
  [/INDUS/, 'IndusInd Bank'],
  [/AUBANK|AUSFB/, 'AU Small Finance Bank'],
  [/BOBCRD|BOBCARD/, 'BOB Card'],
  [/BOB|BARODA/, 'Bank of Baroda'],
  [/AMEX/, 'American Express'],
  [/PNB/, 'Punjab National Bank'],
  [/CANBNK|CANARA/, 'Canara Bank'],
  [/UNION|UBOI/, 'Union Bank'],
  [/FEDBNK|FEDERAL/, 'Federal Bank'],
  [/RBL/, 'RBL Bank'],
  [/SCBANK|STANC/, 'Standard Chartered'],
  [/HSBC/, 'HSBC'],
  [/ONECRD|ONECARD/, 'OneCard'],
];

const BODY_BANKS: [RegExp, string][] = [
  [/\bhdfc\b/i, 'HDFC Bank'],
  [/\bicici\b/i, 'ICICI Bank'],
  [/\baxis\b/i, 'Axis Bank'],
  [/\bsbi\s*card\b/i, 'SBI Card'],
  [/\bsbi\b|state bank/i, 'SBI'],
  [/\bkotak\b/i, 'Kotak Mahindra Bank'],
  [/\bidfc\b/i, 'IDFC FIRST Bank'],
  [/\byes\s*bank\b/i, 'YES Bank'],
  [/\bindusind\b/i, 'IndusInd Bank'],
  [/\bau\s*(small finance\s*)?bank\b/i, 'AU Small Finance Bank'],
  [/\bbob\s*card\b/i, 'BOB Card'],
  [/bank of baroda/i, 'Bank of Baroda'],
  [/american express|\bamex\b/i, 'American Express'],
  [/\bpnb\b|punjab national/i, 'Punjab National Bank'],
  [/\bcanara\b/i, 'Canara Bank'],
  [/\bfederal bank\b/i, 'Federal Bank'],
  [/\brbl\b/i, 'RBL Bank'],
  [/standard chartered/i, 'Standard Chartered'],
  [/\bhsbc\b/i, 'HSBC'],
  [/\bonecard\b/i, 'OneCard'],
];

export function detectBank(address: string | undefined, body: string): string | undefined {
  const header = (address ?? '').toUpperCase().replace(/^[A-Z]{2}-/, '').replace(/-[A-Z]$/, '');
  for (const [re, name] of SENDER_BANKS) if (re.test(header)) return name;
  for (const [re, name] of BODY_BANKS) if (re.test(body)) return name;
  return undefined;
}

export function detectNetwork(body: string): Network | undefined {
  if (/\bvisa\b/i.test(body)) return 'Visa';
  if (/master\s*card/i.test(body)) return 'Mastercard';
  if (/\brupay\b/i.test(body)) return 'RuPay';
  if (/american express|\bamex\b/i.test(body)) return 'Amex';
  if (/\bdiners\b/i.test(body)) return 'Diners';
  return undefined;
}

// ---------- Field extractors ----------

const cardRe = /(?:credit\s*card|card|cc)[^\d]{0,25}?(?:ending(?:\s*(?:with|in))?|no\.?|number|xx+|x+|\*+|\s)\s*[x*]*\s*(\d{4})\b/i;
const acctRe = /(?:a\/c|acct|account|ac)\s*(?:no\.?)?\s*[x*.]*\s*(\d{3,6})\b/i;
const regRe = /\b([A-Z]{2})[\s-]?(\d{1,2})[\s-]?([A-Z]{1,3})[\s-]?(\d{4})\b|\b(\d{2})[\s-]?BH[\s-]?(\d{4})[\s-]?([A-Z]{1,2})\b/;

function last4From(re: RegExp, body: string): string | undefined {
  const m = body.match(re);
  return m ? m[1].slice(-4) : undefined;
}

export function regFrom(body: string): string | undefined {
  const m = body.toUpperCase().match(regRe);
  if (!m) return undefined;
  if (m[5]) return `${m[5]} BH ${m[6]} ${m[7]}`;
  return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

function titleCase(s: string) {
  return s.replace(/\b\w+/g, (w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()));
}

function merchantFrom(body: string): string {
  const m =
    body.match(/\b(?:at|to|towards|@)\s+([A-Za-z0-9][A-Za-z0-9&.'*\-_ ]{1,40}?)(?=\s+(?:on|at|for|via|ref|txn|avl|available|is|was)\b|[.,;]|\s*$)/i) ??
    body.match(/\binfo[:\s]+([A-Za-z0-9&.'*\-_ ]{2,30})/i);
  if (!m) return 'Card spend';
  return titleCase(m[1].replace(/\s+/g, ' ').replace(/[*_]+/g, ' ').trim()).slice(0, 32);
}

function dueDateFrom(body: string): string | undefined {
  // "Total Amt Due Rs 500, due by 28-Nov-26": try every "due …" phrase until one holds a date.
  for (const m of body.matchAll(/(?:due\s*(?:date|by|on)?|pay\s*by|payable\s*by|last\s*date)\s*(?:is|:|-|on)?\s*(?!rs\b|rs\.|inr\b|₹)([0-9A-Za-z][0-9A-Za-z ,\/.-]{5,14})/gi)) {
    const d = parseDate(m[1]);
    if (d) return d;
  }
  return undefined;
}

const IGNORE = /\b(otp|one[- ]time password|verification code|do not share|declined|failed|unsuccessful|reversed|reversal|pre-?approved|offer|congratulations|apply now|loan of up to|eligible for)\b/i;
const CREDIT = /\b(credited|refund(?:ed)?|received|cashback|thank you for (?:your )?payment)\b/i;

// ---------- Bills ----------

const BILLERS: [RegExp, string, BillCategory][] = [
  [/BESCOM/i, 'BESCOM', 'Electricity'],
  [/MSEDCL|MAHADISCOM/i, 'MSEDCL', 'Electricity'],
  [/TATA ?POWER|TATAPW/i, 'Tata Power', 'Electricity'],
  [/ADANI ?(ELEC|ELECTRICITY)|ADANIE/i, 'Adani Electricity', 'Electricity'],
  [/BSES/i, 'BSES', 'Electricity'],
  [/TANGEDCO|TNEB/i, 'TNEB', 'Electricity'],
  [/KSEB/i, 'KSEB', 'Electricity'],
  [/TSSPDCL|APSPDCL|CESC|UPPCL|PSPCL|JVVNL|DHBVN|WBSEDCL/i, '', 'Electricity'],
  [/ACT ?FIBERNET|ACTFBR/i, 'ACT Fibernet', 'Broadband'],
  [/AIRTEL ?(XSTREAM|BROADBAND|FIBER)/i, 'Airtel Xstream Fiber', 'Broadband'],
  [/JIO ?FIBER|JIOFBR/i, 'JioFiber', 'Broadband'],
  [/HATHWAY|EXCITEL|YOU ?BROADBAND/i, '', 'Broadband'],
  [/AIRTEL/i, 'Airtel Postpaid', 'Mobile postpaid'],
  [/\bJIO\b|JIOINF/i, 'Jio Postpaid', 'Mobile postpaid'],
  [/\bVI\b|VODAFONE|VIINFO/i, 'Vi Postpaid', 'Mobile postpaid'],
  [/BSNL/i, 'BSNL', 'Mobile postpaid'],
  [/INDANE|BHARAT ?GAS|HP ?GAS|\bIGL\b|\bMGL\b|PIPED GAS|\bPNG\b/i, '', 'Gas'],
  [/TATA ?PLAY|DISH ?TV|D2H|SUN ?DIRECT|AIRTEL ?DTH/i, '', 'DTH'],
  [/WATER|BWSSB|DJB/i, '', 'Water'],
  [/PREMIUM|POLICY/i, '', 'Insurance'],
];

const CATEGORY_WORDS_BILL: [RegExp, BillCategory][] = [
  [/electricity|power|energy|kwh/i, 'Electricity'],
  [/broadband|fiber|fibre|internet|wi-?fi/i, 'Broadband'],
  [/postpaid|mobile bill/i, 'Mobile postpaid'],
  [/\bgas\b|lpg/i, 'Gas'],
  [/water/i, 'Water'],
  [/premium|policy|insurance/i, 'Insurance'],
  [/dth|set ?top|tv subscription/i, 'DTH'],
];

function parseBill(body: string, sms: Sms): ParsedSms | null {
  if (!/\b(bill|premium|amount due|due amount|amt due|payment due|is due|due on|due by|due date)\b/i.test(body)) return null;
  if (/card/i.test(body)) return null; // card statements are handled separately
  const amt = num(body.match(amountRe)?.[1]);
  const dueDate = dueDateFrom(body);
  if (!amt || !dueDate) return null;
  const header = (sms.address ?? '').toUpperCase();
  let biller = '';
  let category: BillCategory | undefined;
  for (const [re, name, cat] of BILLERS) {
    if (re.test(header) || re.test(body)) {
      biller = name;
      category = cat;
      break;
    }
  }
  if (!category) for (const [re, cat] of CATEGORY_WORDS_BILL) if (re.test(body)) { category = cat; break; }
  if (!category) return null;
  if (!biller) {
    const m = body.match(/\byour\s+([A-Z][A-Za-z&.\- ]{1,25}?)\s+(?:bill|premium|account)/);
    biller = m ? titleCase(m[1].trim()) : category;
  }
  const consumer = body.match(/(?:consumer|ca|customer|account|acct|a\/c|policy|subscriber|mobile|service)\s*(?:no\.?|number|id)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{4,19})\b/i);
  return { kind: 'bill', biller, category, amount: amt, dueDate, consumerId: consumer?.[1], smsId: sms.id, date: sms.date };
}

// ---------- Vehicles ----------

function parseVehicle(body: string, sms: Sms): ParsedSms | null {
  const regNo = regFrom(body);
  if (!regNo) return null;

  if (/fastag|toll/i.test(body)) {
    const bal = body.match(new RegExp(String.raw`(?:avl\.?|avbl\.?|available|closing|current|tag|wallet)?\s*bal(?:ance)?\.?\s*(?:is|:|-|of)?\s*${AMT}`, 'i'));
    const balance = num(bal?.[1]);
    if (balance == null) return null;
    return { kind: 'fastag', regNo, balance, smsId: sms.id, date: sms.date };
  }

  if (/challan/i.test(body)) {
    const amount = num(body.match(amountRe)?.[1]);
    if (!amount) return null;
    const challanNo = body.match(/challan\s*(?:no\.?|number|id)?\s*[:\-]?\s*([A-Z0-9]{8,})/i)?.[1];
    const offence = body.match(/(?:for|offen[cs]e|violation)\s*[:\-]?\s*([A-Za-z][A-Za-z ,/\-]{3,40}?)(?=\s+(?:on|at|of|with|vide|amount|fine|rs|inr)\b|[.,;]|$)/i)?.[1];
    const paid = /\b(paid|payment (?:of .{0,20})?(?:is )?successful|disposed)\b/i.test(body);
    return { kind: 'challan', regNo, amount, challanNo, offence: offence ? titleCase(offence.trim()) : 'Traffic challan', paid, smsId: sms.id, date: sms.date };
  }

  const doc = /\bpuc\b|pollution/i.test(body) ? 'puc' : /insurance|policy/i.test(body) ? 'insurance' : null;
  if (doc && /expir|renew|valid|due/i.test(body)) {
    const when = body.match(/(?:expir\w*|valid\s*(?:till|upto|until)|due|renew\w*\s*(?:by|before|on))\s*(?:on|by|is|:)?\s*([0-9A-Za-z][0-9A-Za-z ,\/.-]{5,14})/i);
    const expiry = when ? parseDate(when[1]) : undefined;
    if (!expiry) return null;
    const insurer = doc === 'insurance' ? body.match(/\b(ICICI Lombard|HDFC ERGO|Bajaj Allianz|Tata AIG|Acko|Digit|SBI General|Reliance General|New India|United India|Oriental|National Insurance|Royal Sundaram|Kotak General|Zuno|Chola MS|IFFCO Tokio|Liberty)\b/i)?.[1] : undefined;
    return { kind: 'vehicleDoc', regNo, doc, expiry, insurer, smsId: sms.id, date: sms.date };
  }
  return null;
}

// ---------- Entry point ----------

export function parseSms(sms: Sms): ParsedSms | null {
  const body = sms.body.replace(/\s+/g, ' ').trim();
  if (IGNORE.test(body)) return null;
  const withBank = <T extends ParsedSms>(p: T | null): T | null => (p ? { ...p, bank: detectBank(sms.address, body) } : null);

  const vehicle = parseVehicle(body, sms);
  if (vehicle) return vehicle;

  // Card statements: "Total Amt Due Rs 48,250.50, Min Amt Due Rs 2,413, due by 28-Nov-26"
  const total = body.match(new RegExp(String.raw`(?:total|tot\.?)\s*(?:amt\.?|amount)?\s*(?:due|payable)\s*(?:is|of|:|-)?\s*${AMT}`, 'i'));
  if (total && /card/i.test(body)) {
    const last4 = last4From(cardRe, body);
    if (!last4) return null;
    const min = body.match(new RegExp(String.raw`min(?:imum|\.)?\s*(?:amt\.?|amount)?\s*(?:due|payable)\s*(?:is|of|:|-)?\s*${AMT}`, 'i'));
    return withBank({ kind: 'statement', last4, total: num(total[1])!, minDue: num(min?.[1]), dueDate: dueDateFrom(body), network: detectNetwork(body), smsId: sms.id, date: sms.date });
  }

  if (CREDIT.test(body)) {
    // "Payment of Rs 48,250.50 received towards your HDFC Bank Credit Card x4821"
    const cardLast4 = last4From(cardRe, body);
    if (cardLast4 && /card/i.test(body) && /payment|paid|received/i.test(body) && !/debit card/i.test(body)) {
      const amount = num(body.match(amountRe)?.[1]);
      if (amount) return withBank({ kind: 'cardPayment', last4: cardLast4, amount, smsId: sms.id, date: sms.date });
    }
    // Other credits can still carry a bank balance.
    return withBank(balanceOnly(body, sms));
  }

  // Card spends: "Rs.1,234.00 spent on HDFC Bank Card x4821 at AMAZON on 2026-11-20"
  const isSpend = /\b(spent|used|debited|charged|purchase|txn|transaction)\b/i.test(body);
  const cardLast4 = last4From(cardRe, body);
  if (isSpend && cardLast4 && /card/i.test(body) && !/debit card/i.test(body)) {
    const amount = num(body.match(amountRe)?.[1]);
    if (!amount) return null;
    const avl = body.match(new RegExp(String.raw`(?:avl\.?|avbl\.?|available)\s*(?:credit\s*)?(?:lmt|limit)\.?\s*(?:is|:|-)?\s*${AMT}`, 'i'));
    return withBank({ kind: 'spend', last4: cardLast4, amount, merchant: merchantFrom(body), availableLimit: num(avl?.[1]), network: detectNetwork(body), date: sms.date, smsId: sms.id });
  }

  const bill = parseBill(body, sms);
  if (bill) return bill;

  return withBank(balanceOnly(body, sms));
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
