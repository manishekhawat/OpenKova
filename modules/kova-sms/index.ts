import { requireOptionalNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

export type RawSms = { id: string; address: string; body: string; date: number };

type NativeSms = {
  hasPermission(): boolean;
  readInbox(sinceMs: number, limit: number): Promise<RawSms[]>;
};

const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeSms>('KovaSms') : null;

/** True on Android builds that include the native module (not in Expo Go or on iOS). */
export const smsAvailable = !!native;

export async function requestSmsPermission(): Promise<boolean> {
  if (!native) return false;
  if (native.hasPermission()) return true;
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'Read bank SMS alerts',
    message: 'Kova reads bank and card SMS on this phone to log spends, statements and balances. Messages never leave your phone.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export async function readInbox(sinceMs: number, limit = 2000): Promise<RawSms[]> {
  if (!native) return [];
  return native.readInbox(sinceMs, limit);
}
