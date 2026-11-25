// Where to pay for common Indian banks. Package names are the banks' official Android apps;
// if the app isn't installed Kova falls back to the website. Users can override both per card.

export interface BankLinks {
  label: string;
  app?: string;
  url: string;
}

const BANKS: { match: RegExp; links: BankLinks }[] = [
  { match: /hdfc/i, links: { label: 'HDFC Bank', app: 'com.snapwork.hdfc', url: 'https://netbanking.hdfcbank.com' } },
  { match: /icici/i, links: { label: 'ICICI Bank', app: 'com.csam.icici.bank.imobile', url: 'https://infinity.icicibank.com' } },
  { match: /axis/i, links: { label: 'Axis Bank', app: 'com.axis.mobile', url: 'https://omni.axisbank.co.in' } },
  { match: /kotak/i, links: { label: 'Kotak', app: 'com.msf.kbank.mobile', url: 'https://netbanking.kotak.com' } },
  { match: /sbi\s*card/i, links: { label: 'SBI Card', url: 'https://www.sbicard.com' } },
  { match: /\bsbi\b|state bank/i, links: { label: 'SBI YONO', app: 'com.sbi.lotusintouch', url: 'https://www.onlinesbi.sbi' } },
  { match: /idfc/i, links: { label: 'IDFC FIRST', url: 'https://my.idfcfirstbank.com' } },
  { match: /amex|american express/i, links: { label: 'American Express', url: 'https://www.americanexpress.com/en-in/' } },
  { match: /yes\s*bank/i, links: { label: 'YES Bank', url: 'https://www.yesbank.in' } },
  { match: /indusind/i, links: { label: 'IndusInd', url: 'https://www.indusind.com' } },
  { match: /au\s*(small|bank)/i, links: { label: 'AU Bank', url: 'https://www.aubank.in' } },
  { match: /\bbob\b|baroda/i, links: { label: 'Bank of Baroda', url: 'https://www.bankofbaroda.in' } },
];

export function bankLinks(bankName: string): BankLinks | undefined {
  return BANKS.find((b) => b.match.test(bankName))?.links;
}
