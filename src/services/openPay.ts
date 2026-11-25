import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

/** Opens a bank app by Android package, falling back to its website. Returns how it opened. */
export async function openPaymentTarget(target: { app?: string; url?: string }): Promise<'app' | 'web' | 'failed'> {
  if (target.app && Platform.OS === 'android') {
    try {
      IntentLauncher.openApplication(target.app);
      return 'app';
    } catch {
      // not installed — fall through to the website
    }
  }
  if (target.url) {
    try {
      await Linking.openURL(target.url);
      return 'web';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}

export function normaliseUrl(u: string): string | undefined {
  const t = u.trim();
  if (!t) return undefined;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
