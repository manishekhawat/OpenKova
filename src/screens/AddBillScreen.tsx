import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, Chips, Field, Screen } from '../components/ui';
import { useStore } from '../data/store';
import type { BillCategory } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { space, type } from '../theme';
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

export default function AddBillScreen({ navigation }: Props) {
  const { dispatch } = useStore();
  const [category, setCategory] = useState<BillCategory>('Electricity');
  const [biller, setBiller] = useState('');
  const [consumerId, setConsumerId] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [tried, setTried] = useState(false);

  const errors = {
    biller: biller.trim().length < 2 ? 'Enter the biller name' : '',
    consumerId: consumerId.trim().length < 3 ? `Enter the ${ID_LABEL[category].toLowerCase()}` : '',
    amount: !(Number(amount) > 0) ? 'Enter the bill amount' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = () => {
    setTried(true);
    if (!valid) return;
    dispatch({
      type: 'addBill',
      bill: { id: uid('b'), category, biller: biller.trim(), consumerId: consumerId.trim(), amount: Number(amount), dueDate: addDays(Number(days) || 7) },
    });
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
        <Field label="Due in (days)" value={days} onChangeText={(t) => setDays(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="7" />
        <Text style={[type.tiny, { marginBottom: space(5) }]}>
          In a live version, the amount and due date are fetched automatically from the biller through Bharat BillPay.
        </Text>
        <Button label="Save biller" onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
