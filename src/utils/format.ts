// Indian-style grouping (1,23,456.78) without relying on Intl support in Hermes.
export function inr(amount: number, opts: { decimals?: boolean } = {}): string {
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const decimals = opts.decimals ?? abs % 1 !== 0;
  const [whole, frac] = abs.toFixed(decimals ? 2 : 0).split('.');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return `${neg ? '-' : ''}₹${grouped}${frac ? '.' + frac : ''}`;
}

export function daysFromToday(iso: string): number {
  const d = new Date(iso);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function dueLabel(iso: string): string {
  const n = daysFromToday(iso);
  if (n < 0) return `overdue by ${-n} day${n === -1 ? '' : 's'}`;
  if (n === 0) return 'due today';
  if (n === 1) return 'due tomorrow';
  return `due in ${n} days`;
}

export function expiryLabel(iso: string): string {
  const n = daysFromToday(iso);
  if (n < 0) return `expired ${-n}d ago`;
  if (n === 0) return 'expires today';
  return `expires in ${n}d`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [, m] = key.split('-');
  return MONTHS[Number(m) - 1];
}

export function addDays(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function maskPhone(p: string): string {
  return p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function urgencyColor(days: number, c: { bad: string; warn: string; muted: string }) {
  if (days < 0 || days <= 2) return c.bad;
  if (days <= 7) return c.warn;
  return c.muted;
}
