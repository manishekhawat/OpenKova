import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { readInbox, requestSmsPermission, smsAvailable } from '../../modules/kova-sms';
import { Button, Chips, IconName, ListRow, Screen, SectionHeader, Surface, ToggleRow } from '../components/ui';
import { useStore, vehicleName } from '../data/store';
import type { RootStackParamList } from '../navigation';
import { buildImport, isEmpty, type ImportPreview } from '../sms/importer';
import { colors, fonts, space, type } from '../theme';
import { dueLabel, inr, shortDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'SmsImport'>;

const RANGES = ['Last 30 days', 'Last 90 days', 'Last 6 months', 'New since last scan'] as const;
type Range = (typeof RANGES)[number];
const DAYS: Record<Range, number> = { 'Last 30 days': 30, 'Last 90 days': 90, 'Last 6 months': 182, 'New since last scan': 0 };

export default function SmsImportScreen({ navigation, route }: Props) {
  const { state, dispatch } = useStore();
  const hasScanned = !!state.settings.smsLastScan;
  const [range, setRange] = useState<Range>('Last 30 days');
  const [discover, setDiscover] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'reading' | 'preview' | 'denied' | 'error' | 'done'>('idle');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState('');
  const started = useRef(false);

  const scan = async (r: Range = range) => {
    setError('');
    const ok = await requestSmsPermission();
    if (!ok) return setPhase('denied');
    setPhase('reading');
    try {
      const since = r === 'New since last scan' ? state.settings.smsLastScan ?? Date.now() - 30 * 864e5 : Date.now() - DAYS[r] * 864e5;
      const msgs = await readInbox(since, 8000);
      setPreview(buildImport(state, msgs, { discover }));
      setPhase('preview');
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setPhase('error');
    }
  };

  useEffect(() => {
    if (route.params?.autoStart && smsAvailable && !started.current) {
      started.current = true;
      scan('Last 30 days');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!smsAvailable) {
    return (
      <Screen padTop={false}>
        <Text style={type.title}>Not available here</Text>
        <Text style={[type.small, { marginTop: space(3), fontSize: 15, lineHeight: 22 }]}>
          Reading SMS needs the Kova Android app (the APK). It doesn't work on iPhone or inside Expo Go.
        </Text>
      </Screen>
    );
  }

  const apply = () => {
    if (!preview) return;
    dispatch({ type: 'importSms', changes: preview.changes });
    setPhase('done');
  };

  const c = preview?.changes;
  const nothing = c ? isEmpty(c) : false;

  const group = (title: string, rows: { key: string; icon: IconName; title: string; sub?: string; right?: string }[]) =>
    rows.length ? (
      <View key={title}>
        <SectionHeader title={title} />
        <Surface style={{ paddingVertical: space(1) }}>
          {rows.slice(0, 8).map((r, i) => (
            <ListRow key={r.key} icon={r.icon} title={r.title} subtitle={r.sub} right={r.right} last={i === Math.min(rows.length, 8) - 1 && rows.length <= 8} />
          ))}
          {rows.length > 8 && <Text style={[type.small, { paddingVertical: space(3) }]}>and {rows.length - 8} more</Text>}
        </Surface>
      </View>
    ) : null;

  return (
    <Screen padTop={false}>
      <Text style={type.title}>Fill Kova from your SMS</Text>
      <Text style={[type.small, { marginTop: space(2), fontSize: 15, lineHeight: 22 }]}>
        Finds your cards, card spends, statements and payments, bank balances, bills, FASTag balances, challans and vehicle insurance in
        your messages. Everything is read on this phone and never leaves it.
      </Text>

      {(phase === 'idle' || phase === 'denied' || phase === 'error') && (
        <>
          <SectionHeader title="Scan" />
          <Chips options={hasScanned ? RANGES : RANGES.slice(0, 3)} value={range} onChange={setRange} />
          <Surface style={{ paddingVertical: space(1), marginBottom: space(5) }}>
            <ToggleRow title="Add new things it finds" subtitle="Create cards, accounts, bills and vehicles that aren't in Kova yet" value={discover} onChange={setDiscover} last />
          </Surface>
          {phase === 'denied' && (
            <View style={{ marginBottom: space(4) }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.warn }}>
                SMS permission wasn't given. If Android says it's a restricted setting, open App info → ⋮ → Allow restricted settings, then try again.
              </Text>
              <Button label="Open app settings" variant="ghost" onPress={() => Linking.openSettings()} style={{ marginTop: space(3) }} />
            </View>
          )}
          {phase === 'error' && <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.bad, marginBottom: space(4) }}>Couldn't read SMS: {error}</Text>}
          <Button label="Scan messages" icon="mail-unread-outline" onPress={() => scan()} />
        </>
      )}

      {phase === 'reading' && (
        <View style={{ alignItems: 'center', paddingVertical: space(12) }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[type.small, { marginTop: space(3) }]}>Reading messages…</Text>
        </View>
      )}

      {phase === 'preview' && preview && c && (
        <>
          <Text style={[type.small, { marginTop: space(5) }]}>
            Checked {preview.scanned} messages. {preview.recognised} were from banks, billers or about your vehicles.
          </Text>
          {nothing && <Text style={[type.body, { marginTop: space(3) }]}>Nothing new found.</Text>}

          {group(
            'New cards',
            c.newCards.map((x) => ({ key: x.id, icon: 'card-outline', title: `${x.bank} •• ${x.last4}`, sub: x.outstanding ? `${inr(x.outstanding)} ${dueLabel(x.dueDate)}` : 'No statement found yet', right: x.limit ? `limit ${inr(x.limit)}` : undefined })),
          )}
          {group(
            'New bank accounts',
            c.newAccounts.map((x) => ({ key: x.id, icon: 'business-outline', title: `${x.bank} •• ${x.last4}`, right: inr(x.balance) })),
          )}
          {group(
            'New bills',
            c.newBills.map((x) => ({ key: x.id, icon: 'receipt-outline', title: x.biller, sub: `${x.category}, ${dueLabel(x.dueDate)}`, right: inr(x.amount) })),
          )}
          {group(
            'New vehicles',
            c.newVehicles.map((x) => ({
              key: x.id,
              icon: 'car-sport-outline',
              title: x.regNo,
              sub: [x.fastagBalance ? `FASTag ${inr(x.fastagBalance)}` : '', x.challans.length ? `${x.challans.length} challan` : '', x.insuranceExpiry ? `insurance till ${shortDate(x.insuranceExpiry)}` : ''].filter(Boolean).join(', '),
            })),
          )}
          {group('Updates', [
            ...c.cards.map((x) => ({ key: x.id, icon: 'card-outline' as IconName, title: `${x.bank} •• ${x.last4}`, sub: 'Statement / payments', right: inr(x.outstanding) })),
            ...c.accounts.map((x) => ({ key: x.id, icon: 'business-outline' as IconName, title: `${x.bank} •• ${x.last4}`, sub: 'Balance', right: inr(x.balance) })),
            ...c.vehicles.map((x) => ({ key: x.id, icon: 'car-sport-outline' as IconName, title: vehicleName(x), sub: x.regNo })),
          ])}
          {(c.transactions.length > 0 || c.payments.length > 0) && (
            <Text style={[type.body, { marginTop: space(5) }]}>
              Plus {c.transactions.length} card spend{c.transactions.length === 1 ? '' : 's'} and {c.payments.length} card payment{c.payments.length === 1 ? '' : 's'}.
            </Text>
          )}
          {c.newCards.length + c.newVehicles.length > 0 && (
            <Text style={[type.tiny, { marginTop: space(3) }]}>SMS doesn't include card limits, vehicle models or every date. Open new cards and vehicles afterwards to add them.</Text>
          )}

          <Button
            label={nothing ? 'Done' : 'Add to Kova'}
            onPress={nothing ? () => { dispatch({ type: 'importSms', changes: c }); navigation.goBack(); } : apply}
            style={{ marginTop: space(8) }}
          />
          <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: space(3) }} />
        </>
      )}

      {phase === 'done' && (
        <>
          <Text style={[type.body, { marginTop: space(6), color: colors.good }]}>Added to Kova.</Text>
          <Button label="Close" onPress={() => navigation.goBack()} style={{ marginTop: space(6) }} />
        </>
      )}
    </Screen>
  );
}
