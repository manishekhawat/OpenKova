// Covers the app until the user unlocks with fingerprint/face or the phone's PIN/pattern.
// Locks on launch and again after the app has been in the background for LOCK_AFTER_MS.
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../data/store';
import { colors, fonts, space, type } from '../theme';
import { Logo } from './Logo';
import { Button } from './ui';

const LOCK_AFTER_MS = 30_000;

export async function canUseLock(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

export async function confirmIdentity(reason: string): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancel' });
  return res.success;
}

export function LockGate({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const enabled = !!state.user && state.settings.lockEnabled;
  const [locked, setLocked] = useState(enabled);
  const [hidden, setHidden] = useState(false); // cover content in the app switcher
  const [error, setError] = useState('');
  const backgroundAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setError('');
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Kova', cancelLabel: 'Cancel' });
      if (res.success) setLocked(false);
      else if (res.error !== 'user_cancel' && res.error !== 'system_cancel' && res.error !== 'app_cancel') setError('Could not verify. Try again.');
    } catch {
      setError('Could not start unlock. Try again.');
    } finally {
      prompting.current = false;
    }
  }, []);

  // Enabling the lock in Settings shouldn't lock the user out immediately.
  useEffect(() => {
    if (!enabled) setLocked(false);
  }, [enabled]);

  useEffect(() => {
    if (enabled && locked) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        if (!prompting.current) {
          backgroundAt.current ??= Date.now();
          if (enabled) setHidden(true);
        }
      } else if (next === 'active') {
        setHidden(false);
        const away = backgroundAt.current ? Date.now() - backgroundAt.current : 0;
        backgroundAt.current = null;
        if (enabled && away > LOCK_AFTER_MS) {
          setLocked(true);
          unlock();
        }
      }
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {enabled && (locked || hidden) && (
        <View style={[StyleSheet.absoluteFill, s.cover]}>
          <Logo size={40} />
          {locked && (
            <>
              <Ionicons name="lock-closed" size={36} color={colors.ink} style={{ marginTop: space(10) }} />
              <Text style={[type.title, { marginTop: space(4) }]}>Kova is locked</Text>
              <Text style={[type.small, { marginTop: space(2), textAlign: 'center' }]}>Use your fingerprint, face or phone PIN.</Text>
              {error ? <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.bad, marginTop: space(3) }}>{error}</Text> : null}
              <Button label="Unlock" icon="finger-print" onPress={unlock} style={{ marginTop: space(8), alignSelf: 'stretch' }} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cover: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space(8), zIndex: 100 },
});
