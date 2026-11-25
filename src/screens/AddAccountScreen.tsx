import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { Button, Chips, Field, Screen, ToggleRow } from '../components/ui';
import { useStore } from '../data/store';
import type { BankAccount } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { colors, space, type } from '../theme';
import { uid } from '../utils/format';

const TYPES = ['Savings', 'Current', 'Salary'] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'AddAccount'>;

export default function AddAccountScreen({ navigation, route }: Props) {
  const { state, dispatch } = useStore();
  const existing = state.accounts.find((a) => a.id === route.params?.id);
  const editing = !!existing;

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit account' : 'Add a bank account' });
  }, [navigation, editing]);

  const [bank, setBank] = useState(existing?.bank ?? '');
  const [acType, setAcType] = useState<BankAccount['type']>(existing?.type ?? 'Savings');
  const [last4, setLast4] = useState(existing?.last4 ?? '');
  const [ifsc, setIfsc] = useState(existing?.ifsc ?? '');
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '');
  const [primary, setPrimary] = useState(existing?.primary ?? state.accounts.length === 0);
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const errors = {
    bank: bank.trim().length < 2 ? 'Enter the bank name' : '',
    last4: !/^\d{4}$/.test(last4) ? 'Enter the last 4 digits of the account number' : '',
    ifsc: ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ? 'IFSC looks like HDFC0001234' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = () => {
    setTried(true);
    if (!valid) return;
    const account: BankAccount = { id: existing?.id ?? uid('a'), bank: bank.trim(), type: acType, last4, ifsc, balance: Number(balance) || 0, primary };
    // Only one primary account.
    if (primary) for (const a of state.accounts) if (a.primary && a.id !== account.id) dispatch({ type: 'updateAccount', account: { ...a, primary: false } });
    dispatch(editing ? { type: 'updateAccount', account } : { type: 'addAccount', account });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padTop={false}>
        <Field label="Bank" value={bank} onChangeText={setBank} placeholder="e.g. Axis Bank" error={tried ? errors.bank : ''} />
        <Text style={[type.small, { marginBottom: 8 }]}>Account type</Text>
        <Chips options={TYPES} value={acType} onChange={setAcType} />
        <Field label="Last 4 digits of account number" value={last4} onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="1234" error={tried ? errors.last4 : ''} />
        <Field label="IFSC (optional)" value={ifsc} onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} autoCapitalize="characters" placeholder="HDFC0001234" error={tried ? errors.ifsc : ''} />
        <Field label="Current balance (₹)" value={balance} onChangeText={(t) => setBalance(t.replace(/[^\d.-]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
        <ToggleRow title="Primary account" subtitle="Pre-selected when you record a payment" value={primary} onChange={setPrimary} last />
        <Text style={[type.tiny, { marginTop: space(3), marginBottom: space(5) }]}>
          Kova matches bank SMS by these last 4 digits to keep the balance up to date.
        </Text>
        <Button label={editing ? 'Save changes' : 'Add account'} onPress={save} />
        {editing && (
          <Pressable
            onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              dispatch({ type: 'removeAccount', id: existing!.id });
              navigation.goBack();
            }}
            style={{ alignSelf: 'center', padding: space(4), marginTop: space(3) }}
          >
            <Text style={{ color: colors.bad, fontWeight: '600' }}>{confirmDelete ? 'Tap again to remove' : 'Remove account'}</Text>
          </Pressable>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
