// Turns what the scanner found (OCR lines or NFC data) into card fields. Pure, testable in Node.
import type { Network } from '../data/types';
import { detectBank, detectNetwork } from '../sms/parse';

export type CardGuess = {
  last4?: string;
  network?: Network;
  bank?: string;
  holder?: string;
  product?: string;
  expiry?: { month: number; year: number };
};

/** Network from the first digits of the card number (issuer identification number). */
export function networkFromIin(iin?: string | null): Network | undefined {
  if (!iin) return undefined;
  const two = Number(iin.slice(0, 2));
  const four = Number(iin.slice(0, 4));
  const three = Number(iin.slice(0, 3));
  if (iin[0] === '4') return 'Visa';
  if ((two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) return 'Mastercard';
  if (two === 34 || two === 37) return 'Amex';
  if (two === 36 || two === 38 || two === 39 || (three >= 300 && three <= 305)) return 'Diners';
  if (two === 60 || two === 65 || two === 81 || two === 82 || three === 508 || three === 353 || three === 356) return 'RuPay';
  return undefined;
}

export function networkFromAid(aid?: string | null): Network | undefined {
  if (!aid) return undefined;
  if (aid.startsWith('A000000003')) return 'Visa';
  if (aid.startsWith('A000000004')) return 'Mastercard';
  if (aid.startsWith('A000000524')) return 'RuPay';
  if (aid.startsWith('A000000025')) return 'Amex';
  if (aid.startsWith('A000000152')) return 'Diners';
  return undefined;
}

const NOT_A_NAME = /\b(bank|card|credit|debit|visa|master|rupay|amex|express|diners|platinum|signature|world|valid|thru|from|month|year|member|since|customer|electronic|use|only|international|gold|titanium|select|infinite|business|rewards?|cashback|elite|prime|select|classic|india|limited|ltd)\b/i;

const PRODUCTS = /\b(Regalia(?: Gold)?|Millennia|Infinia|Diners Club Black|MoneyBack\+?|Swiggy|Tata Neu(?: Infinity| Plus)?|Amazon Pay|Coral|Rubyx|Sapphiro|Emeralde|Atlas|Magnus|Ace|Flipkart|Airtel|Neo|Select|Privilege|Vistara|SimplyCLICK|SimplySAVE|Cashback|Elite|Prime|Prime|Zeta|Wealth|Platinum(?: Rewards)?|Signature|Infinite|Titanium|Freedom|IRCTC|BPCL|Myntra|Amazon|OneCard|Scapia|Edge|Kiwi|Uni)\b/i;

/** Reads bank, network, expiry and name from OCR lines (numbers already masked except last 4). */
export function guessFromOcr(lines: string[], last4?: string | null, iin?: string | null): CardGuess {
  const text = lines.join('\n');
  const g: CardGuess = { last4: last4 ?? undefined };
  g.network = networkFromIin(iin) ?? detectNetwork(text);
  g.bank = detectBank(undefined, text);
  g.product = text.match(PRODUCTS)?.[1];

  // Expiry: the latest MM/YY on the card ("valid thru" beats "valid from").
  let best: { month: number; year: number } | undefined;
  for (const m of text.matchAll(/\b(0[1-9]|1[0-2])\s*[\/\-]\s*(\d{2}|\d{4})\b/g)) {
    const month = Number(m[1]);
    const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    if (year < 2015 || year > 2045) continue;
    if (!best || year * 12 + month > best.year * 12 + best.month) best = { month, year };
  }
  g.expiry = best;

  // Name: an all-caps line of 2–4 words that isn't bank or card wording.
  for (const raw of lines) {
    const line = raw.trim();
    if (!/^[A-Z][A-Z .']{3,30}$/.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) continue;
    if (NOT_A_NAME.test(line)) continue;
    g.holder = line;
    break;
  }
  return g;
}
