import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Button, IconBadge, Screen, SectionHeader, Surface } from '../components/ui';
import { bankLinks } from '../data/banks';
import { useStore } from '../data/store';
import type { RootStackParamList } from '../navigation';
import { openPaymentTarget } from '../services/openPay';
import { colors, radius, space, type } from '../theme';
import { dueLabel, inr } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Pay'>;
type Preset = { label: string; amount: number };
type PayOption = { key: string; label: string; sub: string; app?: string; url?: string };

// Kova doesn't move money. You pay in your bank's app or website, then record it here
// so dues, balances and history stay correct.
export default function PayScreen({ route, navigation }: Props) {
  const { kind, refId, subId } = route.params;
  const { state, dispatch } = useStore();

  const target = useMemo(() => {
    if (kind === 'card') {
      const c = state.cards.find((x) => x.id === refId);
      if (!c) return null;
      const presets: Preset[] = [{ label: 'Total due', amount: c.outstanding }];
      if (c.minDue > 0 && c.minDue < c.outstanding) presets.push({ label: 'Minimum due', amount: c.minDue });
      const preset = bankLinks(c.bank);
      return {
        title: `${c.bank} ${c.name}`,
        subtitle: `Card •• ${c.last4}${c.outstanding ? ` · ${dueLabel(c.dueDate)}` : ''}`,
        presets,
        custom: true,
        bank: c.bank,
        own: { app: c.payApp ?? preset?.app, url: c.payUrl ?? preset?.url, label: preset?.label ?? c.bank },
      };
    }
    if (kind === 'bill') {
      const b = state.bills.find((x) => x.id === refId);
      if (!b) return null;
      return {
        title: b.biller,
        subtitle: `${b.category} · ${b.consumerId} · ${dueLabel(b.dueDate)}`,
        presets: [{ label: 'Bill amount', amount: b.amount }],
        custom: true,
        bank: '',
        own: b.payUrl ? { url: b.payUrl, label: `${b.biller} website` } : undefined,
      };
    }
    const v = state.vehicles.find((x) => x.id === refId);
    if (!v) return null;
    if (kind === 'challan') {
      const ch = v.challans.find((x) => x.id === subId);
      if (!ch) return null;
      return {
        title: `Challan · ${ch.offence}`,
        subtitle: `${v.regNo} · ${ch.location}`,
        presets: [{ label: 'Fine', amount: ch.amount }],
        custom: false,
        bank: '',
        own: { url: 'https://echallan.parivahan.gov.in', label: 'Parivahan e-Challan' },
      };
    }
    return {
      title: 'FASTag recharge',
      subtitle: `${v.regNo} · balance ${inr(v.fastagBalance)}`,
      presets: [500, 1000, 2000].map((a) => ({ label: inr(a), amount: a })),
      custom: true,
      bank: '',
      own: undefined,
    };
  }, [kind, refId, subId, state]);

  // Places to pay: the item's own link first, then the apps of the user's linked banks.
  const options = useMemo<PayOption[]>(() => {
    const out: PayOption[] = [];
    const seen = new Set<string>();
    if (target?.own && (target.own.app || target.own.url)) {
      out.push({ key: 'own', label: target.own.label, sub: target.own.app ? 'Open app' : 'Open website', app: target.own.app, url: target.own.url });
      seen.add(target.own.label);
    }
    for (const a of state.accounts) {
      const links = bankLinks(a.bank);
      if (!links || seen.has(links.label)) continue;
      seen.add(links.label);
      out.push({ key: a.id, label: links.label, sub: links.app ? 'Open bank app' : 'Open net banking', app: links.app, url: links.url });
    }
    return out;
  }, [target, state.accounts]);

  const primary = state.accounts.find((a) => a.primary) ?? state.accounts[0];
  const [presetIdx, setPresetIdx] = useState(0);
  const [customText, setCustomText] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>(primary?.id);
  const [opened, setOpened] = useState('');
  const [done, setDone] = useState<number | null>(null);

  if (!target && done === null) {
    return <Screen padTop={false}><Text style={type.body}>This item is no longer available.</Text></Screen>;
  }

  const usingCustom = presetIdx === -1;
  const amount = usingCustom ? Number(customText || 0) : target?.presets[presetIdx]?.amount ?? 0;
  const account = state.accounts.find((a) => a.id === accountId);

  const open = async (o: PayOption) => {
    const how = await openPaymentTarget(o);
    setOpened(how === 'failed' ? `Couldn't open ${o.label}. Add a link for it from the card or bill.` : '');
  };

  const record = () => {
    if (!target || amount <= 0) return;
    dispatch({ type: 'pay', kind, refId, subId, amount, fromAccountId: account?.id, title: target.title });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(amount);
  };

  if (done !== null) {
    return (
      <Screen padTop={false} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.good + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={44} color={colors.good} />
          </View>
          <Text style={[type.hero, { marginTop: space(6) }]}>{inr(done)}</Text>
          <Text style={[type.body, { marginTop: 6, color: colors.muted, textAlign: 'center' }]}>
            recorded as paid{account ? ` from ${account.bank} •• ${account.last4}` : ''}
          </Text>
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

        <SectionHeader title="1. Pay in your bank" />
        {options.length === 0 ? (
          <Text style={type.small}>Link a bank account in Money, or add a payment link to this card or bill, to get a shortcut here.</Text>
        ) : (
          <Surface style={{ paddingVertical: space(1) }}>
            {options.map((o, i) => (
              <Pressable key={o.key} onPress={() => open(o)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingVertical: space(3) }, i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }, pressed && { opacity: 0.6 }]}>
                <IconBadge name={o.app ? 'phone-portrait-outline' : 'globe-outline'} />
                <View style={{ flex: 1, marginLeft: space(3) }}>
                  <Text style={type.body}>{o.label}</Text>
                  <Text style={[type.small, { marginTop: 2 }]}>{o.sub}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </Surface>
        )}
        {opened ? <Text style={{ color: colors.warn, marginTop: 8 }}>{opened}</Text> : null}

        <SectionHeader title="2. Record it in Kova" />
        <Text style={[type.small, { marginBottom: space(3) }]}>Paid from (updates that account's balance)</Text>
        <View style={{ gap: 10 }}>
          {state.accounts.map((a) => (
            <Option key={a.id} selected={a.id === accountId} onPress={() => setAccountId(a.id)} title={`${a.bank} •• ${a.last4}`} right={inr(a.balance)} />
          ))}
          <Option selected={!accountId} onPress={() => setAccountId(undefined)} title="Don't track the account" />
        </View>

        <Button label={amount > 0 ? `Mark ${inr(amount)} as paid` : 'Mark as paid'} onPress={record} disabled={amount <= 0} style={{ marginTop: space(8) }} />
        {kind === 'bill' && (
          <Button label="Edit this bill" variant="ghost" icon="create-outline" onPress={() => navigation.navigate('AddBill', { id: refId })} style={{ marginTop: space(3) }} />
        )}
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

function Option({ selected, onPress, title, right }: { selected: boolean; onPress: () => void; title: string; right?: string }) {
  return (
    <Pressable onPress={onPress} style={optStyle(selected)}>
      <Radio on={selected} />
      <Text style={[type.body, { flex: 1, marginLeft: 12 }]}>{title}</Text>
      {right ? <Text style={[type.body, { fontWeight: '600', color: colors.muted }]}>{right}</Text> : null}
    </Pressable>
  );
}
