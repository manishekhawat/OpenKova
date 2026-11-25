import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type OcrResult = { lines: string[]; last4: string | null; iin: string | null };
export type NfcResult = { last4: string; iin: string; expiryYear: number | null; expiryMonth: number | null; label: string | null; aid: string };

type Native = {
  nfcState(): 'unsupported' | 'disabled' | 'ready';
  recognizeCard(uri: string): Promise<OcrResult>;
  readCardNfc(timeoutMs: number): Promise<NfcResult>;
  cancelNfc(): Promise<void>;
};

const native = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('KovaCard') : null;

export const cardScanAvailable = !!native;

export function nfcState(): 'unsupported' | 'disabled' | 'ready' {
  return native ? native.nfcState() : 'unsupported';
}

/** Runs on-device text recognition on a card photo. Long numbers come back masked. */
export function recognizeCard(uri: string): Promise<OcrResult> {
  if (!native) return Promise.reject(new Error('Card scanning needs the Kova Android app'));
  return native.recognizeCard(uri);
}

/** Waits for a contactless card to be tapped. Only last 4 / first 6 digits are returned. */
export function readCardNfc(timeoutMs = 30000): Promise<NfcResult> {
  if (!native) return Promise.reject(new Error('NFC needs the Kova Android app'));
  return native.readCardNfc(timeoutMs);
}

export function cancelNfc(): Promise<void> {
  return native ? native.cancelNfc() : Promise.resolve();
}
