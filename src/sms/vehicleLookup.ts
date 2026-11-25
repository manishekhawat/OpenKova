import { readInbox, requestSmsPermission, smsAvailable } from '../../modules/kova-sms';
import { emptyState } from '../data/seed';
import type { Vehicle } from '../data/types';
import { buildImport } from './importer';
import { regFrom } from './parse';

export type VehicleFromSms = Pick<Vehicle, 'fastagBalance' | 'challans' | 'insuranceExpiry' | 'pucExpiry' | 'insurer'> & { messages: number };

/** Searches the last 6 months of SMS for one registration number. Null if nothing was found. */
export async function findVehicleInSms(regNo: string): Promise<VehicleFromSms | null | 'no-permission' | 'unavailable'> {
  if (!smsAvailable) return 'unavailable';
  if (!(await requestSmsPermission())) return 'no-permission';
  const all = await readInbox(Date.now() - 182 * 864e5, 8000);
  const mine = all.filter((m) => regFrom(m.body) === regNo);
  if (!mine.length) return null;
  const v = buildImport(emptyState(), mine, { discover: true }).changes.newVehicles[0];
  if (!v) return null;
  return { fastagBalance: v.fastagBalance, challans: v.challans, insuranceExpiry: v.insuranceExpiry, pucExpiry: v.pucExpiry, insurer: v.insurer, messages: mine.length };
}
