import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { CardScanner } from '../components/CardScanner';
import { CreditCardView } from '../components/CreditCardView';
import { Button, Chips, DateField, Field, Screen, SectionHeader } from '../components/ui';
import { bankLinks } from '../data/banks';
import { useStore } from '../data/store';
import type { CreditCard, Network } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { normaliseUrl } from '../services/openPay';
import { colors, space, type } from '../theme';
import { addDays, uid } from '../utils/format';
import { CARD_PALETTES as PALETTES } from '../cards/palettes';

const NETWORKS: readonly Network[] = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Diners', 'Other'];

type Props = NativeStackScreenProps<RootStackParamList, 'AddCard'>;

const money = (n?: number) => (n ? String(n) : '');

export default function AddCardScreen({ navigation, route }: Props) {
  const { state, dispatch } = useStore();
  const existing = state.cards.find((c) => c.id === route.params?.id);
  const editing = !!existing;

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit card' : 'Add a credit card' });
  }, [navigation, editing]);

  const [bank, setBank] = useState(existing?.bank ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [last4, setLast4] = useState(existing?.last4 ?? '');
  const [network, setNetwork] = useState<Network>(existing?.network ?? 'Visa');
  const [limit, setLimit] = useState(money(existing?.limit));
  const [outstanding, setOutstanding] = useState(money(existing?.outstanding));
  const [minDue, setMinDue] = useState(money(existing?.minDue));
  const [dueDate, setDueDate] = useState<string | undefined>(existing?.dueDate ?? addDays(20));
  const [payUrl, setPayUrl] = useState(existing?.payUrl ?? '');
  const [payApp, setPayApp] = useState(existing?.payApp ?? '');
  const [tried, setTried] = useState(false);
  const [holder, setHolder] = useState(existing?.holder ?? state.user?.name.toUpperCase() ?? '');
  const [scanNote, setScanNote] = useState('');

  const out = Number(outstanding || 0);
  const errors = {
    bank: bank.trim().length < 2 ? 'Enter the bank name' : '',
    last4: !/^\d{4}$/.test(last4) ? 'Enter the last 4 digits' : '',
    limit: !(Number(limit) > 0) ? 'Enter the credit limit' : '',
    outstanding: out > Number(limit || 0) * 1.2 ? 'Outstanding looks higher than the limit' : '',
    minDue: Number(minDue || 0) > out ? "Minimum can't be more than the total" : '',
    dueDate: !dueDate ? 'Enter a valid date' : '',
    payApp: payApp && !/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(payApp.trim()) ? 'Looks like com.bank.app' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const preset = bankLinks(bank);

  const card: CreditCard = {
    id: existing?.id ?? 'preview',
    bank: bank.trim() || 'Your bank',
    name: name.trim() || 'Credit Card',
    network,
    last4: last4.padEnd(4, '•'),
    holder,
    limit: Number(limit) || 0,
    outstanding: out,
    minDue: minDue ? Number(minDue) : Math.round(out * 0.05),
    dueDate: dueDate ?? addDays(20),
    statementDate: existing?.statementDate ?? addDays(-1),
    palette: existing?.palette ?? PALETTES[state.cards.length % PALETTES.length],
    payUrl: normaliseUrl(payUrl),
    payApp: payApp.trim() || undefined,
  };

  const save = () => {
    setTried(true);
    if (!valid) return;
    if (editing) dispatch({ type: 'updateCard', card: { ...card, last4 } });
    else dispatch({ type: 'addCard', card: { ...card, id: uid('c'), last4 } });
    navigation.goBack();
  };

  const err = (k: keyof typeof errors) => (tried ? errors[k] : '');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padTop={false}>
        <CreditCardView card={card} />
        <View style={{ height: space(5) }} />
        {!editing && (
          <CardScanner
            onResult={(g, source) => {
              const filled: string[] = [];
              if (g.last4) { setLast4(g.last4); filled.push('last 4 digits'); }
              if (g.bank) { setBank(g.bank); filled.push('bank'); }
              if (g.network) { setNetwork(g.network); filled.push('network'); }
              if (g.product) { setName(g.product); filled.push('card name'); }
              if (g.holder) { setHolder(g.holder); filled.push('name'); }
              setScanNote(
                filled.length
                  ? `Filled ${filled.join(', ')} from the ${source === 'nfc' ? 'tap' : 'photo'}. Check them, then add the limit and current dues.`
                  : '',
              );
            }}
          />
        )}
        {scanNote ? <Text style={[type.small, { color: colors.good, marginBottom: space(4), lineHeight: 20 }]}>{scanNote}</Text> : null}
        <Field label="Bank" value={bank} onChangeText={setBank} placeholder="e.g. ICICI Bank" error={err('bank')} />
        <Field label="Card name (optional)" value={name} onChangeText={setName} placeholder="e.g. Amazon Pay" />
        <Field label="Last 4 digits" value={last4} onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="1234" error={err('last4')} />
        <Text style={[type.small, { marginBottom: 6 }]}>Network</Text>
        <Chips options={NETWORKS} value={network} onChange={setNetwork} />
        <Field label="Credit limit (₹)" value={limit} onChangeText={(t) => setLimit(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="200000" error={err('limit')} />

        <SectionHeader title="Current statement" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Total due (₹)" value={outstanding} onChangeText={(t) => setOutstanding(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" error={err('outstanding')} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Minimum due (₹)" value={minDue} onChangeText={(t) => setMinDue(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="5% of total" error={err('minDue')} />
          </View>
        </View>
        <DateField label="Payment due date" value={dueDate} onChange={setDueDate} error={err('dueDate')} />
        <Text style={[type.tiny, { marginTop: -8, marginBottom: space(2) }]}>On Android, Kova can fill these from your bank's statement SMS (Settings → Read bank SMS).</Text>

        <SectionHeader title="Where you pay this card" />
        <Field
          label="Website (optional)"
          value={payUrl}
          onChangeText={setPayUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder={preset?.url ?? 'netbanking.yourbank.com'}
        />
        <Field
          label="Android app package (optional)"
          value={payApp}
          onChangeText={setPayApp}
          autoCapitalize="none"
          placeholder={preset?.app ?? 'com.yourbank.mobile'}
          error={err('payApp')}
        />
        <Text style={[type.tiny, { marginTop: -8, marginBottom: space(5), color: preset ? colors.good : colors.faint }]}>
          {preset ? `Leave blank to use ${preset.label}${preset.app ? "'s app" : "'s website"}.` : 'The package is in the Play Store link: play.google.com/store/apps/details?id=…'}
        </Text>

        <Button label={editing ? 'Save changes' : 'Add card'} onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
