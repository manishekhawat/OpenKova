import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Button, Screen, SectionHeader, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { RootStackParamList } from '../navigation';
import { colors, radius, space, type } from '../theme';
import { dueLabel, inr } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Pay'>;
type Preset = { label: string; amount: number };

export default function PayScreen({ route, navigation }: Props) {
  const { kind, refId, subId } = route.params;
  const { state, dispatch } = useStore();

  // Work out what is being paid and the amount choices for it.
  const target = useMemo(() => {
    if (kind === 'card') {
      const c = state.cards.find((x) => x.id === refId);
      if (!c) return null;
      const presets: Preset[] = [{ label: 'Total due', amount: c.outstanding }];
      if (c.minDue > 0 && c.minDue < c.outstanding) presets.push({ label: 'Minimum due', amount: c.minDue });
      return { title: `${c.bank} ${c.name}`, subtitle: `Card •• ${c.last4} · ${dueLabel(c.dueDate)}`, presets, custom: true, max: c.outstanding };
    }
    if (kind === 'bill') {
      const b = state.bills.find((x) => x.id === refId);
      if (!b) return null;
      return { title: b.biller, subtitle: `${b.category} · ${b.consumerId} · ${dueLabel(b.dueDate)}`, presets: [{ label: 'Bill amount', amount: b.amount }], custom: false, max: b.amount };
    }
    const v = state.vehicles.find((x) => x.id === refId);
    if (!v) return null;
    if (kind === 'challan') {
      const ch = v.challans.find((x) => x.id === subId);
      if (!ch) return null;
      return { title: `Challan · ${ch.offence}`, subtitle: `${v.regNo} · ${ch.location}`, presets: [{ label: 'Fine', amount: ch.amount }], custom: false, max: ch.amount };
    }
    return {
      title: 'FASTag recharge',
      subtitle: `${v.regNo} · balance ${inr(v.fastagBalance)}`,
      presets: [500, 1000, 2000].map((a) => ({ label: inr(a), amount: a })),
      custom: true,
      max: 100000,
    };
  }, [kind, refId, subId, state]);

  const primary = state.accounts.find((a) => a.primary) ?? state.accounts[0];
  const [presetIdx, setPresetIdx] = useState(0);
  const [customText, setCustomText] = useState('');
  const [accountId, setAccountId] = useState(primary?.id);
  const [phase, setPhase] = useState<'form' | 'processing' | 'done'>('form');
  const [reference] = useState(() => 'KV' + Math.floor(1e9 + Math.random() * 9e9));
  const [paidAmount, setPaidAmount] = useState(0);

  if (!target && phase !== 'done') {
    return <Screen padTop={false}><Text style={type.body}>This item is no longer available.</Text></Screen>;
  }

  const usingCustom = presetIdx === -1;
  const amount = usingCustom ? Number(customText || 0) : target?.presets[presetIdx]?.amount ?? 0;
  const account = state.accounts.find((a) => a.id === accountId);
  let error = '';
  if (amount <= 0) error = 'Enter an amount';
  else if (target && amount > target.max) error = `Amount can't exceed ${inr(target.max)}`;
  else if (account && amount > account.balance) error = 'Not enough balance in this account';
  else if (!account) error = 'Link a bank account to pay';

  const pay = () => {
    if (error || !account || !target) return;
    setPhase('processing');
    setPaidAmount(amount);
    // Simulated bank debit. Replace with your payment gateway / BBPS partner call.
    setTimeout(() => {
      dispatch({ type: 'pay', kind, refId, subId, amount, fromAccountId: account.id, title: target.title });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('done');
    }, 1400);
  };

  if (phase === 'done') {
    return (
      <Screen padTop={false} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.good + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={44} color={colors.good} />
          </View>
          <Text style={[type.hero, { marginTop: space(6) }]}>{inr(paidAmount)}</Text>
          <Text style={[type.body, { marginTop: 6, color: colors.muted }]}>paid successfully</Text>
          <Surface style={{ marginTop: space(8), alignSelf: 'stretch' }}>
            {[
              ['To', target?.title ?? '—'],
              ['From', account ? `${account.bank} •• ${account.last4}` : '—'],
              ['Reference', reference],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={type.small}>{k}</Text>
                <Text style={[type.body, { flexShrink: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={1}>{v}</Text>
              </View>
            ))}
          </Surface>
        </View>
        <Button label="Done" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padTop={false}>
        <Text style={type.title}>{target!.title}</Text>
        <Text style={[type.small, { marginTop: 4 }]}>{target!.subtitle}</Text>

        <SectionHeader title="Amount" />
        <View style={{ gap: 10 }}>
          {target!.presets.map((p, i) => (
            <Option key={p.label} selected={presetIdx === i} onPress={() => setPresetIdx(i)} title={p.label} right={inr(p.amount)} />
          ))}
          {target!.custom && (
            <Pressable onPress={() => setPresetIdx(-1)} style={[optStyle(usingCustom), { paddingVertical: 6 }]}>
              <Radio on={usingCustom} />
              <Text style={[type.body, { marginLeft: 12 }]}>Other amount</Text>
              <View style={{ flex: 1 }} />
              <Text style={[type.body, { color: colors.muted }]}>₹</Text>
              <TextInput
                value={customText}
                onFocus={() => setPresetIdx(-1)}
                onChangeText={(t) => setCustomText(t.replace(/[^\d.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.faint}
                style={{ color: colors.ink, fontSize: 17, fontWeight: '600', minWidth: 90, textAlign: 'right', paddingVertical: 10 }}
              />
            </Pressable>
          )}
        </View>

        <SectionHeader title="Pay from" action="Link account" onAction={() => navigation.navigate('AddAccount')} />
        <View style={{ gap: 10 }}>
          {state.accounts.map((a) => (
            <Option
              key={a.id}
              selected={a.id === accountId}
              onPress={() => setAccountId(a.id)}
              title={`${a.bank} •• ${a.last4}`}
              subtitle={`${a.type} account`}
              right={inr(a.balance)}
              rightColor={amount > a.balance ? colors.bad : colors.muted}
            />
          ))}
        </View>
        <Text style={[type.tiny, { marginTop: space(3) }]}>Paid via net banking / account debit. UPI is not used in this app.</Text>

        <View style={{ marginTop: space(8) }}>
          {error && amount > 0 ? <Text style={{ color: colors.bad, textAlign: 'center', marginBottom: 10 }}>{error}</Text> : null}
          <Button label={amount > 0 ? `Pay ${inr(amount)}` : 'Pay'} onPress={pay} disabled={!!error} loading={phase === 'processing'} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const optStyle = (on: boolean) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  padding: space(4),
  borderRadius: radius.md,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: on ? colors.accent : colors.line,
});

function Radio({ on }: { on: boolean }) {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.accent : colors.faint, alignItems: 'center', justifyContent: 'center' }}>
      {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
    </View>
  );
}

function Option({ selected, onPress, title, subtitle, right, rightColor }: { selected: boolean; onPress: () => void; title: string; subtitle?: string; right?: string; rightColor?: string }) {
  return (
    <Pressable onPress={onPress} style={optStyle(selected)}>
      <Radio on={selected} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={type.body}>{title}</Text>
        {subtitle ? <Text style={[type.small, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={[type.body, { fontWeight: '600', color: rightColor ?? colors.ink }]}>{right}</Text> : null}
    </Pressable>
  );
}
