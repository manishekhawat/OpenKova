import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { Button, Chips, DateField, Field, Screen } from '../components/ui';
import { useStore } from '../data/store';
import type { BillCategory } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { normaliseUrl } from '../services/openPay';
import { colors, fonts, space, type } from '../theme';
import { addDays, uid } from '../utils/format';

const CATS: readonly BillCategory[] = ['Electricity', 'Broadband', 'Mobile postpaid', 'Rent', 'Gas', 'Water', 'Insurance', 'DTH'];

const ID_LABEL: Record<BillCategory, string> = {
  Electricity: 'Consumer number',
  Broadband: 'Account ID',
  'Mobile postpaid': 'Mobile number',
  Rent: 'Flat / unit',
  Gas: 'Consumer ID',
  Water: 'RR number',
  Insurance: 'Policy number',
  DTH: 'Subscriber ID',
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddBill'>;

export default function AddBillScreen({ navigation, route }: Props) {
  const { state, dispatch } = useStore();
  const existing = state.bills.find((b) => b.id === route.params?.id);
  const editing = !!existing;

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit bill' : 'Add a biller' });
  }, [navigation, editing]);

  const [category, setCategory] = useState<BillCategory>(existing?.category ?? 'Electricity');
  const [biller, setBiller] = useState(existing?.biller ?? '');
  const [consumerId, setConsumerId] = useState(existing?.consumerId ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [dueDate, setDueDate] = useState<string | undefined>(existing?.dueDate ?? addDays(7));
  const [payUrl, setPayUrl] = useState(existing?.payUrl ?? '');
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const errors = {
    biller: biller.trim().length < 2 ? 'Enter the biller name' : '',
    consumerId: consumerId.trim().length < 3 ? `Enter the ${ID_LABEL[category].toLowerCase()}` : '',
    amount: !(Number(amount) > 0) ? 'Enter the bill amount' : '',
    dueDate: !dueDate ? 'Enter a valid date' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = () => {
    setTried(true);
    if (!valid || !dueDate) return;
    const bill = { id: existing?.id ?? uid('b'), category, biller: biller.trim(), consumerId: consumerId.trim(), amount: Number(amount), dueDate, paidOn: existing?.paidOn, payUrl: normaliseUrl(payUrl) };
    dispatch(editing ? { type: 'updateBill', bill } : { type: 'addBill', bill });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padTop={false}>
        <Text style={[type.small, { marginBottom: 8 }]}>Category</Text>
        <Chips options={CATS} value={category} onChange={setCategory} />
        <Field label="Biller" value={biller} onChangeText={setBiller} placeholder="e.g. Tata Power" error={tried ? errors.biller : ''} />
        <Field label={ID_LABEL[category]} value={consumerId} onChangeText={setConsumerId} error={tried ? errors.consumerId : ''} />
        <Field label="Amount (₹)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" error={tried ? errors.amount : ''} />
        <DateField label="Due date" value={dueDate} onChange={setDueDate} error={tried ? errors.dueDate : ''} />
        <Field label="Where you pay it (website, optional)" value={payUrl} onChangeText={setPayUrl} autoCapitalize="none" keyboardType="url" placeholder="e.g. bescom.co.in" />
        <Text style={[type.tiny, { marginTop: -8, marginBottom: space(5) }]}>
          After you pay, Kova schedules the next bill a month later with the same amount. Edit it when the new bill arrives.
        </Text>
        <Button label={editing ? 'Save changes' : 'Save biller'} onPress={save} />
        {editing && (
          <Pressable
            onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              dispatch({ type: 'removeBill', id: existing!.id });
              navigation.goBack();
            }}
            style={{ alignSelf: 'center', padding: space(4), marginTop: space(3) }}
          >
            <Text style={{ color: colors.bad, fontFamily: fonts.semibold }}>{confirmDelete ? 'Tap again to delete this bill' : 'Delete bill'}</Text>
          </Pressable>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
