// Decodes an Indian registration number into its state/UT and RTO code. Offline, no API.

const STATES: Record<string, string> = {
  AN: 'Andaman & Nicobar', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar', CG: 'Chhattisgarh',
  CH: 'Chandigarh', DD: 'Dadra & Nagar Haveli and Daman & Diu', DL: 'Delhi', DN: 'Dadra & Nagar Haveli', GA: 'Goa',
  GJ: 'Gujarat', HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand', JK: 'Jammu & Kashmir', KA: 'Karnataka',
  KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MH: 'Maharashtra', ML: 'Meghalaya', MN: 'Manipur', MP: 'Madhya Pradesh',
  MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', OR: 'Odisha', PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim',
  TN: 'Tamil Nadu', TR: 'Tripura', TS: 'Telangana', TG: 'Telangana', UK: 'Uttarakhand', UA: 'Uttarakhand', UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};

// A few of the busiest RTOs, so common numbers read naturally. Others show just the code.
const RTOS: Record<string, string> = {
  'KA-01': 'Bengaluru Central', 'KA-02': 'Bengaluru West', 'KA-03': 'Bengaluru East', 'KA-04': 'Bengaluru North',
  'KA-05': 'Bengaluru South', 'KA-51': 'Electronic City', 'KA-53': 'K R Puram',
  'MH-01': 'Mumbai Central', 'MH-02': 'Mumbai West', 'MH-03': 'Mumbai East', 'MH-04': 'Thane', 'MH-12': 'Pune', 'MH-14': 'Pimpri-Chinchwad',
  'DL-01': 'Delhi North', 'DL-03': 'Delhi South', 'DL-08': 'Wazirpur', 'DL-12': 'Vasant Vihar',
  'TN-01': 'Chennai Central', 'TN-07': 'Chennai South', 'TN-09': 'Chennai West', 'TS-09': 'Hyderabad Central', 'TG-09': 'Hyderabad Central',
  'HR-26': 'Gurugram', 'UP-16': 'Noida', 'WB-01': 'Kolkata', 'GJ-01': 'Ahmedabad', 'RJ-14': 'Jaipur', 'KL-07': 'Ernakulam',
};

export type RegInfo = { state: string; rto?: string; code: string; bharat: boolean };

export function decodeReg(regNo: string): RegInfo | undefined {
  const s = regNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bh = s.match(/^(\d{2})BH\d{4}[A-Z]{1,2}$/);
  if (bh) return { state: 'Bharat series (valid in all states)', code: 'BH', bharat: true };
  const m = s.match(/^([A-Z]{2})(\d{1,2})/);
  if (!m || !STATES[m[1]]) return undefined;
  const code = `${m[1]}-${m[2].padStart(2, '0')}`;
  return { state: STATES[m[1]], rto: RTOS[code], code, bharat: false };
}

export function describeReg(regNo: string): string | undefined {
  const r = decodeReg(regNo);
  if (!r) return undefined;
  if (r.bharat) return r.state;
  return `Registered in ${r.state}, RTO ${r.code}${r.rto ? ` (${r.rto})` : ''}`;
}
