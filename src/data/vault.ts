// Encrypted on-device storage.
// A random 256-bit key is kept in the OS keystore (expo-secure-store → Android Keystore / iOS Keychain).
// App state is serialised to JSON and sealed with AES-256-GCM into a file in the app's private documents
// directory. Nothing is sent anywhere.

import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Web is only used for design previews: plain localStorage, no encryption.
const WEB = Platform.OS === 'web';
const WEB_KEY = 'kova.preview.state';

const KEY_NAME = 'kova.vault.key.v1';
const FILE_NAME = 'kova.vault';
const LEGACY_ASYNC_KEY = 'kova/state/v1'; // plain-text storage used by the first demo build
const MAGIC = utf8ToBytes('KV1'); // file header so we can change the format later

let cachedKey: Uint8Array | null = null;

async function getKey(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey;
  const stored = await SecureStore.getItemAsync(KEY_NAME);
  if (stored) {
    cachedKey = hexToBytes(stored);
  } else {
    cachedKey = Crypto.getRandomBytes(32);
    await SecureStore.setItemAsync(KEY_NAME, bytesToHex(cachedKey), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return cachedKey;
}

function vaultFile() {
  return new File(Paths.document, FILE_NAME);
}

export function encrypt(key: Uint8Array, plaintext: string): Uint8Array {
  const nonce = Crypto.getRandomBytes(12);
  const sealed = gcm(key, nonce).encrypt(utf8ToBytes(plaintext));
  const out = new Uint8Array(MAGIC.length + nonce.length + sealed.length);
  out.set(MAGIC, 0);
  out.set(nonce, MAGIC.length);
  out.set(sealed, MAGIC.length + nonce.length);
  return out;
}

export function decrypt(key: Uint8Array, data: Uint8Array): string {
  for (let i = 0; i < MAGIC.length; i++) if (data[i] !== MAGIC[i]) throw new Error('Not a Kova vault file');
  const nonce = data.subarray(MAGIC.length, MAGIC.length + 12);
  const sealed = data.subarray(MAGIC.length + 12);
  return bytesToUtf8(gcm(key, nonce).decrypt(sealed));
}

/** Loads saved state. Returns null on first run. Migrates the old plain-text demo storage once. */
export async function loadState<T>(): Promise<T | null> {
  if (WEB) {
    const raw = globalThis.localStorage?.getItem(WEB_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const file = vaultFile();
  if (file.exists) {
    const key = await getKey();
    return JSON.parse(decrypt(key, await file.bytes())) as T;
  }
  const legacy = await AsyncStorage.getItem(LEGACY_ASYNC_KEY);
  if (legacy) {
    const parsed = JSON.parse(legacy) as T;
    await saveState(parsed);
    await AsyncStorage.removeItem(LEGACY_ASYNC_KEY);
    return parsed;
  }
  return null;
}

let writing: Promise<void> = Promise.resolve();

/** Serialised writes so two saves never interleave. */
export function saveState(state: unknown): Promise<void> {
  if (WEB) {
    globalThis.localStorage?.setItem(WEB_KEY, JSON.stringify(state));
    return Promise.resolve();
  }
  writing = writing
    .catch(() => {})
    .then(async () => {
      const key = await getKey();
      const file = vaultFile();
      const tmp = new File(Paths.document, FILE_NAME + '.tmp');
      if (tmp.exists) tmp.delete();
      tmp.create();
      await tmp.write(encrypt(key, JSON.stringify(state)));
      if (file.exists) file.delete();
      await tmp.move(file);
    });
  return writing;
}

/** Deletes the data file and the key. Used by "Erase all data". */
export async function wipeVault(): Promise<void> {
  if (WEB) {
    globalThis.localStorage?.removeItem(WEB_KEY);
    return;
  }
  await writing.catch(() => {});
  const file = vaultFile();
  if (file.exists) file.delete();
  await SecureStore.deleteItemAsync(KEY_NAME);
  cachedKey = null;
}
