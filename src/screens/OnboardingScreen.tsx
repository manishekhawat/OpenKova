import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { canUseLock, confirmIdentity } from '../components/LockGate';
import { Logo } from '../components/Logo';
import { Button, Field, IconBadge, IconName, Screen, Surface, ToggleRow } from '../components/ui';
import { useStore } from '../data/store';
import { ensureReminderPermission } from '../services/reminders';
import { colors, radius, space, type } from '../theme';

type Step = 'name' | 'start';

export default function OnboardingScreen() {
  const { dispatch } = useStore();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [withSample, setWithSample] = useState(false);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [lock, setLock] = useState(false);

  useEffect(() => {
    canUseLock()
      .then((ok) => {
        setLockAvailable(ok);
        setLock(ok);
      })
      .catch(() => {});
  }, []);

  const next = () => {
    if (name.trim().length < 2) return setError('Please enter your name');
    setError('');
    setStep('start');
  };

  const finish = async () => {
    // Confirm the lock works before turning it on, so nobody gets locked out on day one.
    let lockEnabled = false;
    if (lock && lockAvailable) lockEnabled = await confirmIdentity('Confirm to turn on app lock').catch(() => false);
    const remindersEnabled = await ensureReminderPermission().catch(() => false);
    dispatch({ type: 'settings', patch: { lockEnabled, remindersEnabled } });
    dispatch({ type: 'onboard', user: { name: name.trim() }, withSample });
  };

  const choice = (on: boolean, icon: IconName, title: string, sub: string, press: () => void) => (
    <Pressable
      onPress={press}
      style={{ flexDirection: 'row', alignItems: 'center', padding: space(4), borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}
    >
      <IconBadge name={icon} color={on ? colors.accent : colors.ink} />
      <View style={{ flex: 1, marginLeft: space(3) }}>
        <Text style={type.body}>{title}</Text>
        <Text style={[type.small, { marginTop: 2 }]}>{sub}</Text>
      </View>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ marginTop: space(8) }}>
          <Logo size={34} />
          <Text style={[type.hero, { marginTop: space(6) }]}>
            {step === 'name' ? 'Every card, bill and\nvehicle. One place.' : `Hi ${name.trim().split(' ')[0]}.\nHow do you want to start?`}
          </Text>
          <Text style={[type.small, { marginTop: space(3), fontSize: 15, lineHeight: 22 }]}>
            {step === 'name'
              ? 'Your data stays encrypted on this phone. No account, no server.'
              : 'You can change any of this later in Settings.'}
          </Text>
        </View>

        <View style={{ marginTop: space(8) }}>
          {step === 'name' ? (
            <>
              <Field label="Your name" value={name} onChangeText={setName} placeholder="As on your cards" autoFocus autoCapitalize="words" error={error} onSubmitEditing={next} returnKeyType="next" />
              <Button label="Continue" onPress={next} />
            </>
          ) : (
            <>
              <View style={{ gap: space(3) }}>
                {choice(!withSample, 'sparkles-outline', 'Start fresh', 'Add your own cards, bills and vehicles', () => setWithSample(false))}
                {choice(withSample, 'flask-outline', 'Explore with sample data', 'Try the app first; erase it any time', () => setWithSample(true))}
              </View>
              <Surface style={{ marginTop: space(5), paddingVertical: space(1) }}>
                <ToggleRow
                  title="App lock"
                  subtitle={lockAvailable ? 'Fingerprint, face or phone PIN to open Kova' : 'Set a screen lock on your phone to use this'}
                  value={lock && lockAvailable}
                  onChange={setLock}
                  disabled={!lockAvailable}
                  last
                />
              </Surface>
              <Button label="Get started" onPress={finish} style={{ marginTop: space(6) }} />
              <Pressable onPress={() => setStep('name')} style={{ alignSelf: 'center', padding: space(4) }}>
                <Text style={{ color: colors.muted }}>Back</Text>
              </Pressable>
            </>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
