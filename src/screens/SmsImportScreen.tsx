import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { readInbox, requestSmsPermission, smsAvailable } from '../../modules/kova-sms';
import { Button, Chips, ListRow, Screen, SectionHeader, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { RootStackParamList } from '../navigation';
import { buildImport, type ImportPreview } from '../sms/importer';
import { colors, space, type } from '../theme';
import { inr, shortDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'SmsImport'>;

const RANGES = ['New since last scan', 'Last 30 days', 'Last 90 days', 'Last 6 months'] as const;
type Range = (typeof RANGES)[number];

export default function SmsImportScreen({ navigation }: Props) {
  const { state, dispatch } = useStore();
  const hasScanned = !!state.settings.smsLastScan;
  const [range, setRange] = useState<Range>(hasScanned ? 'New since last scan' : 'Last 90 days');
  const [phase, setPhase] = useState<'idle' | 'reading' | 'preview' | 'denied' | 'error' | 'done'>('idle');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState('');

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

  const scan = async () => {
    setError('');
    const ok = await requestSmsPermission();
    if (!ok) return setPhase('denied');
    setPhase('reading');
    try {
      const days = range === 'Last 30 days' ? 30 : range === 'Last 90 days' ? 90 : 182;
      const since = range === 'New since last scan' ? state.settings.smsLastScan ?? Date.now() - 90 * 864e5 : Date.now() - days * 864e5;
      const msgs = await readInbox(since, 5000);
      setPreview(buildImport(state, msgs));
      setPhase('preview');
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setPhase('error');
    }
  };

  const apply = () => {
    if (!preview) return;
    dispatch({ type: 'importSms', data: preview.data });
    setPhase('done');
  };

  const nothing = preview && preview.spends === 0 && preview.statements.length === 0 && preview.balances.length === 0;

  return (
    <Screen padTop={false}>
      <Text style={type.title}>Read bank SMS</Text>
      <Text style={[type.small, { marginTop: space(2), fontSize: 15, lineHeight: 22 }]}>
        Kova looks for card spends, card statements and account balances in your SMS and matches them to your cards and
        accounts by their last 4 digits. Messages are read on this phone only and never leave it.
      </Text>

      {(phase === 'idle' || phase === 'denied' || phase === 'error') && (
        <>
          <SectionHeader title="Scan" />
          <Chips options={hasScanned ? RANGES : RANGES.slice(1)} value={range} onChange={setRange} />
          {phase === 'denied' && (
            <View style={{ marginBottom: space(4) }}>
              <Text style={{ color: colors.warn }}>SMS permission was not given. If Android stopped asking, allow it in Kova's app settings.</Text>
              <Button label="Open app settings" variant="ghost" onPress={() => Linking.openSettings()} style={{ marginTop: space(3) }} />
            </View>
          )}
          {phase === 'error' && <Text style={{ color: colors.bad, marginBottom: space(4) }}>Couldn't read SMS: {error}</Text>}
          <Button label="Scan messages" icon="mail-unread-outline" onPress={scan} />
          {(state.cards.length === 0 || state.accounts.length === 0) && (
            <Text style={[type.tiny, { marginTop: space(3) }]}>Tip: add your cards and bank accounts first so messages can be matched to them.</Text>
          )}
        </>
      )}

      {phase === 'reading' && (
        <View style={{ alignItems: 'center', paddingVertical: space(12) }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[type.small, { marginTop: space(3) }]}>Reading messages…</Text>
        </View>
      )}

      {phase === 'preview' && preview && (
        <>
          <Text style={[type.small, { marginTop: space(5) }]}>Checked {preview.scanned} messages.</Text>
          {nothing && <Text style={[type.body, { marginTop: space(3) }]}>Nothing new found for your cards or accounts.</Text>}

          {preview.spends > 0 && (
            <>
              <SectionHeader title={`${preview.spends} card spend${preview.spends === 1 ? '' : 's'}`} />
              <Surface style={{ paddingVertical: space(1) }}>
                {preview.data.transactions.slice(0, 6).map((t, i, arr) => (
                  <ListRow key={t.id} icon="card-outline" title={t.merchant} subtitle={`${t.category} · ${shortDate(t.date)}`} right={inr(t.amount)} last={i === arr.length - 1 && preview.spends <= 6} />
                ))}
                {preview.spends > 6 && <Text style={[type.small, { paddingVertical: space(3) }]}>and {preview.spends - 6} more</Text>}
              </Surface>
            </>
          )}

          {preview.statements.length > 0 && (
            <>
              <SectionHeader title="Statements" />
              <Surface style={{ paddingVertical: space(1) }}>
                {preview.statements.map((s, i) => (
                  <ListRow key={s.cardLabel} icon="document-text-outline" title={s.cardLabel} subtitle={s.dueDate ? `Due ${shortDate(s.dueDate)}` : 'Due date not found'} right={inr(s.total)} last={i === preview.statements.length - 1} />
                ))}
              </Surface>
            </>
          )}

          {preview.balances.length > 0 && (
            <>
              <SectionHeader title="Account balances" />
              <Surface style={{ paddingVertical: space(1) }}>
                {preview.balances.map((b, i) => (
                  <ListRow key={b.accountLabel} icon="business-outline" title={b.accountLabel} right={inr(b.balance)} last={i === preview.balances.length - 1} />
                ))}
              </Surface>
            </>
          )}

          {(preview.unknownCards.length > 0 || preview.unknownAccounts.length > 0) && (
            <Text style={[type.small, { marginTop: space(5), color: colors.warn }]}>
              Also saw {[...preview.unknownCards.map((l) => `card ••${l}`), ...preview.unknownAccounts.map((l) => `account ••${l}`)].join(', ')} that
              {preview.unknownCards.length + preview.unknownAccounts.length === 1 ? " isn't" : " aren't"} in Kova. Add {preview.unknownCards.length + preview.unknownAccounts.length === 1 ? 'it' : 'them'} to track those too.
            </Text>
          )}

          <Button label={nothing ? 'Done' : 'Add to Kova'} onPress={nothing ? () => { dispatch({ type: 'importSms', data: preview.data }); navigation.goBack(); } : apply} style={{ marginTop: space(8) }} />
          <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: space(3) }} />
        </>
      )}

      {phase === 'done' && (
        <>
          <Text style={[type.body, { marginTop: space(6), color: colors.good }]}>Done. Your cards, spends and balances are updated.</Text>
          <Button label="Close" onPress={() => navigation.goBack()} style={{ marginTop: space(6) }} />
        </>
      )}
    </Screen>
  );
}
