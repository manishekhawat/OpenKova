import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, Chips, Field, Screen } from '../components/ui';
import { useStore } from '../data/store';
import type { BankAccount } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { space, type } from '../theme';
import { uid } from '../utils/format';

const TYPES = ['Savings', 'Current', 'Salary'] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'AddAccount'>;

export default function AddAccountScreen({ navigation }: Props) {
  const { dispatch } = useStore();
  const [bank, setBank] = useState('');
  const [acType, setAcType] = useState<BankAccount['type']>('Savings');
  const [number, setNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [balance, setBalance] = useState('');
  const [tried, setTried] = useState(false);

  const errors = {
    bank: bank.trim().length < 2 ? 'Enter the bank name' : '',
    number: !/^\d{9,18}$/.test(number) ? 'Account numbers are 9–18 digits' : '',
    ifsc: !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ? 'IFSC looks like HDFC0001234' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = () => {
    setTried(true);
    if (!valid) return;
    dispatch({
      type: 'addAccount',
      account: { id: uid('a'), bank: bank.trim(), type: acType, last4: number.slice(-4), ifsc, balance: Number(balance) || 0 },
    });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padTop={false}>
        <Field label="Bank" value={bank} onChangeText={setBank} placeholder="e.g. Axis Bank" error={tried ? errors.bank : ''} />
        <Text style={[type.small, { marginBottom: 8 }]}>Account type</Text>
        <Chips options={TYPES} value={acType} onChange={setAcType} />
        <Field label="Account number" value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 18))} keyboardType="number-pad" secureTextEntry error={tried ? errors.number : ''} />
        <Field label="IFSC" value={ifsc} onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} autoCapitalize="characters" placeholder="HDFC0001234" error={tried ? errors.ifsc : ''} />
        <Field label="Current balance (₹) · demo only" value={balance} onChangeText={(t) => setBalance(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
        <Text style={[type.tiny, { marginBottom: space(5) }]}>
          A live version would fetch balances with consent through the RBI Account Aggregator framework instead of manual entry.
        </Text>
        <Button label="Link account" onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
