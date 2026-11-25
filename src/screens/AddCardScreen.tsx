import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { CreditCardView } from '../components/CreditCardView';
import { Button, Chips, Field, Screen } from '../components/ui';
import { useStore } from '../data/store';
import type { CreditCard, Network } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { space, type } from '../theme';
import { addDays, uid } from '../utils/format';

const NETWORKS: readonly Network[] = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Diners'];
const PALETTES: [string, string][] = [
  ['#2B2B33', '#0E0E12'],
  ['#3A1E4A', '#14091C'],
  ['#0F3B3A', '#06171A'],
  ['#4A2A12', '#1A0E06'],
  ['#1B2C55', '#0A1022'],
];

type Props = NativeStackScreenProps<RootStackParamList, 'AddCard'>;

export default function AddCardScreen({ navigation }: Props) {
  const { state, dispatch } = useStore();
  const [bank, setBank] = useState('');
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [network, setNetwork] = useState<Network>('Visa');
  const [limit, setLimit] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [tried, setTried] = useState(false);

  const errors = {
    bank: bank.trim().length < 2 ? 'Enter the bank name' : '',
    last4: !/^\d{4}$/.test(last4) ? 'Enter the last 4 digits' : '',
    limit: !(Number(limit) > 0) ? 'Enter the credit limit' : '',
    outstanding: Number(outstanding || 0) > Number(limit || 0) ? 'Outstanding is above the limit' : '',
    dueDay: dueDay && !(Number(dueDay) >= 0 && Number(dueDay) <= 60) ? 'Use 0–60 days' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const preview: CreditCard = {
    id: 'preview',
    bank: bank || 'Your bank',
    name: name || 'Card name',
    network,
    last4: last4.padEnd(4, '•'),
    holder: state.user?.name.toUpperCase() ?? '',
    limit: Number(limit) || 0,
    outstanding: Number(outstanding) || 0,
    minDue: Math.round((Number(outstanding) || 0) * 0.05),
    dueDate: addDays(Number(dueDay) || 20),
    statementDate: addDays((Number(dueDay) || 20) - 20),
    palette: PALETTES[state.cards.length % PALETTES.length],
  };

  const save = () => {
    setTried(true);
    if (!valid) return;
    dispatch({ type: 'addCard', card: { ...preview, id: uid('c'), last4, bank: bank.trim(), name: name.trim() || 'Credit Card' } });
    navigation.goBack();
  };

  const err = (k: keyof typeof errors) => (tried ? errors[k] : '');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padTop={false}>
        <CreditCardView card={preview} />
        <Text style={[type.tiny, { marginTop: space(3), marginBottom: space(5) }]}>
          We only store the last 4 digits. Never enter your full card number, CVV or PIN.
        </Text>
        <Field label="Bank" value={bank} onChangeText={setBank} placeholder="e.g. ICICI Bank" error={err('bank')} />
        <Field label="Card name (optional)" value={name} onChangeText={setName} placeholder="e.g. Amazon Pay" />
        <Field label="Last 4 digits" value={last4} onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="1234" error={err('last4')} />
        <Text style={[type.small, { marginBottom: 6 }]}>Network</Text>
        <Chips options={NETWORKS} value={network} onChange={setNetwork} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Credit limit (₹)" value={limit} onChangeText={(t) => setLimit(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="200000" error={err('limit')} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Outstanding (₹)" value={outstanding} onChangeText={(t) => setOutstanding(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" error={err('outstanding')} />
          </View>
        </View>
        <Field label="Bill due in (days)" value={dueDay} onChangeText={(t) => setDueDay(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="20" error={err('dueDay')} />
        <Button label="Add card" onPress={save} style={{ marginTop: space(2) }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
