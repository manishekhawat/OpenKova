import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Button, Field, Screen } from '../components/ui';
import { useStore } from '../data/store';
import { colors, radius, space, type } from '../theme';
import { maskPhone } from '../utils/format';

// Simulated OTP. In production, call your auth backend (e.g. Firebase Phone Auth, MSG91, Twilio Verify).
const DEMO_OTP = '123456';

type Step = 'phone' | 'otp' | 'name';

export default function LoginScreen() {
  const { dispatch } = useStore();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit Indian mobile number');
    setError('');
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStep('otp');
      setTimer(30);
      setTimeout(() => otpRef.current?.focus(), 200);
    }, 700);
  };

  const verify = (code = otp) => {
    if (code.length < 6) return;
    if (code !== DEMO_OTP) {
      setError('That code is incorrect. Try again.');
      setOtp('');
      return;
    }
    setError('');
    setStep('name');
  };

  const finish = () => {
    if (name.trim().length < 2) return setError('Please enter your name');
    dispatch({ type: 'login', user: { name: name.trim(), phone } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll={false}>
        <View style={{ marginTop: space(10) }}>
          <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '800', letterSpacing: 2 }}>kova</Text>
          <Text style={[type.hero, { marginTop: space(6) }]}>
            {step === 'phone' && 'Every card, bill and\nvehicle. One place.'}
            {step === 'otp' && 'Enter the code'}
            {step === 'name' && 'What should we\ncall you?'}
          </Text>
          <Text style={[type.small, { marginTop: space(3), fontSize: 15, lineHeight: 22 }]}>
            {step === 'phone' && 'Log in with the mobile number linked to your bank accounts.'}
            {step === 'otp' && `Sent to ${maskPhone(phone)}. Demo code: ${DEMO_OTP}`}
            {step === 'name' && 'This appears on your cards and profile.'}
          </Text>
        </View>

        <View style={{ marginTop: space(10) }}>
          {step === 'phone' && (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ height: 52, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' }}>
                  <Text style={type.body}>+91</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label=""
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="number-pad"
                    placeholder="Mobile number"
                    autoFocus
                  />
                </View>
              </View>
              {error ? <Text style={{ color: colors.bad, marginBottom: 12 }}>{error}</Text> : null}
              <Button label="Get OTP" onPress={sendOtp} loading={sending} disabled={phone.length !== 10} />
            </>
          )}

          {step === 'otp' && (
            <>
              <Pressable onPress={() => otpRef.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space(4) }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 48,
                      height: 58,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: i === otp.length ? colors.accent : colors.line,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '700' }}>{otp[i] ?? ''}</Text>
                  </View>
                ))}
              </Pressable>
              <TextInput
                ref={otpRef}
                value={otp}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 6);
                  setOtp(v);
                  if (v.length === 6) verify(v);
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
              />
              {error ? <Text style={{ color: colors.bad, marginBottom: 12 }}>{error}</Text> : null}
              <Button label="Verify" onPress={() => verify()} disabled={otp.length !== 6} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space(5) }}>
                <Pressable onPress={() => { setStep('phone'); setOtp(''); setError(''); }} hitSlop={10}>
                  <Text style={{ color: colors.muted }}>Change number</Text>
                </Pressable>
                <Pressable disabled={timer > 0} onPress={() => setTimer(30)} hitSlop={10}>
                  <Text style={{ color: timer > 0 ? colors.faint : colors.accent }}>
                    {timer > 0 ? `Resend in ${timer}s` : 'Resend code'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'name' && (
            <>
              <Field label="Full name" value={name} onChangeText={setName} placeholder="As on your cards" autoFocus autoCapitalize="words" error={error} />
              <Button label="Continue" onPress={finish} />
            </>
          )}
        </View>

        <View style={{ flex: 1 }} />
        <Text style={[type.tiny, { textAlign: 'center' }]}>Demo app · sample data · no real payments</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
