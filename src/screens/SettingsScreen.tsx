import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { smsAvailable } from '../../modules/kova-sms';
import { canUseLock, confirmIdentity } from '../components/LockGate';
import { Button, Field, ListRow, Screen, SectionHeader, Surface, ToggleRow } from '../components/ui';
import { useStore } from '../data/store';
import type { RootStackParamList } from '../navigation';
import { exportBackup, pickBackup } from '../services/backup';
import { ensureReminderPermission, rescheduleReminders } from '../services/reminders';
import { colors, fonts, radius, space, type } from '../theme';
import { shortDate } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const DAY_OPTIONS = [7, 3, 1, 0];
const HOURS = [8, 9, 12, 18, 21];
const dayLabel = (d: number) => (d === 0 ? 'On the day' : d === 1 ? '1 day before' : `${d} days before`);
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

export default function SettingsScreen({ navigation }: Props) {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const [name, setName] = useState(state.user?.name ?? '');
  const [lockAvailable, setLockAvailable] = useState(false);
  const [scheduled, setScheduled] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState<'' | 'sample' | 'erase' | 'restore'>('');
  const [pendingRestore, setPendingRestore] = useState<Awaited<ReturnType<typeof pickBackup>>>(null);

  useEffect(() => {
    canUseLock().then(setLockAvailable).catch(() => {});
  }, []);

  useEffect(() => {
    Notifications.getAllScheduledNotificationsAsync()
      .then((n) => setScheduled(n.length))
      .catch(() => {});
  }, [state]);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(''), 4000);
  };

  const toggleLock = async (on: boolean) => {
    // Require the user to prove it's them both to turn on (so it works) and to turn off.
    if (await confirmIdentity(on ? 'Confirm to turn on app lock' : 'Confirm to turn off app lock')) dispatch({ type: 'settings', patch: { lockEnabled: on } });
  };

  const toggleReminders = async (on: boolean) => {
    if (on && !(await ensureReminderPermission())) return flash('Notifications are blocked. Allow them in Android settings for Kova.');
    dispatch({ type: 'settings', patch: { remindersEnabled: on } });
  };

  const toggleDay = (d: number) => {
    const set = new Set(s.reminderDaysBefore);
    set.has(d) ? set.delete(d) : set.add(d);
    if (set.size === 0) return;
    dispatch({ type: 'settings', patch: { reminderDaysBefore: [...set].sort((a, b) => b - a) } });
  };

  const sendTest = async () => {
    if (!(await ensureReminderPermission())) return flash('Notifications are blocked for Kova.');
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Kova reminders are on', body: "This is how you'll be reminded before a due date." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: 'due-reminders' },
    });
    flash('A test notification will arrive in a few seconds.');
  };

  const doExport = async () => {
    try {
      await exportBackup(state);
    } catch (e: any) {
      flash(String(e?.message ?? e));
    }
  };

  const doPickRestore = async () => {
    try {
      const restored = await pickBackup();
      if (restored) {
        setPendingRestore(restored);
        setConfirm('restore');
      }
    } catch (e: any) {
      flash(String(e?.message ?? e));
    }
  };

  const confirmBox = (text: string, action: string, onYes: () => void) => (
    <View style={{ backgroundColor: colors.bad + '18', borderRadius: radius.md, padding: space(4), marginTop: space(3) }}>
      <Text style={type.body}>{text}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: space(3) }}>
        <Button label="Cancel" variant="ghost" onPress={() => setConfirm('')} style={{ flex: 1, height: 46 }} />
        <Button label={action} variant="danger" onPress={onYes} style={{ flex: 1, height: 46 }} />
      </View>
    </View>
  );

  return (
    <Screen padTop={false}>
      {message ? <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.accent, marginBottom: space(3) }}>{message}</Text> : null}

      <Field
        label="Your name"
        value={name}
        onChangeText={setName}
        onEndEditing={() => name.trim().length >= 2 && dispatch({ type: 'rename', name: name.trim() })}
        autoCapitalize="words"
      />

      <SectionHeader title="Security" />
      <Surface style={{ paddingVertical: space(1) }}>
        <ToggleRow
          title="App lock"
          subtitle={lockAvailable ? 'Fingerprint, face or phone PIN. Locks after 30 seconds away.' : 'Set a screen lock on your phone first'}
          value={s.lockEnabled}
          onChange={toggleLock}
          disabled={!lockAvailable && !s.lockEnabled}
          last
        />
      </Surface>
      <Text style={[type.tiny, { marginTop: space(2) }]}>Your data is encrypted on this phone with a key kept in Android's secure keystore.</Text>

      <SectionHeader title="Reminders" />
      <Surface style={{ paddingVertical: space(1) }}>
        <ToggleRow
          title="Due-date reminders"
          subtitle={s.remindersEnabled && scheduled !== null ? `${scheduled} upcoming reminder${scheduled === 1 ? '' : 's'} scheduled` : 'Card bills, bills, insurance, PUC, service'}
          value={s.remindersEnabled}
          onChange={toggleReminders}
          last
        />
      </Surface>
      {s.remindersEnabled && (
        <>
          <Text style={[type.small, { marginTop: space(4), marginBottom: 8 }]}>When</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DAY_OPTIONS.map((d) => (
              <Pill key={d} on={s.reminderDaysBefore.includes(d)} label={dayLabel(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
          <Text style={[type.small, { marginTop: space(4), marginBottom: 8 }]}>At</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HOURS.map((h) => (
              <Pill key={h} on={s.reminderHour === h} label={hourLabel(h)} onPress={() => dispatch({ type: 'settings', patch: { reminderHour: h } })} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: space(4) }}>
            <Button label="Send a test" variant="ghost" onPress={sendTest} style={{ flex: 1, height: 46 }} />
            <Button label="Refresh" variant="ghost" onPress={async () => setScheduled(await rescheduleReminders(state))} style={{ flex: 1, height: 46 }} />
          </View>
        </>
      )}

      <SectionHeader title="Your data" />
      <Surface style={{ paddingVertical: space(1) }}>
        {Platform.OS === 'android' && (
          <ListRow
            icon="mail-unread-outline"
            title="Read bank SMS"
            subtitle={!smsAvailable ? 'Available in the Android app' : s.smsLastScan ? `Last scan up to ${shortDate(new Date(s.smsLastScan).toISOString())}` : 'Log spends, statements and balances'}
            onPress={() => navigation.navigate('SmsImport')}
          />
        )}
        <ListRow icon="time-outline" title="Payment history" right={String(state.payments.length)} onPress={() => navigation.navigate('Activity')} />
        <ListRow icon="download-outline" title="Export backup" subtitle="Save a file to Drive, Files or email" onPress={doExport} />
        <ListRow icon="cloud-upload-outline" title="Restore from backup" subtitle="Replaces what's in Kova now" onPress={doPickRestore} last />
      </Surface>
      <Text style={[type.tiny, { marginTop: space(2) }]}>Backups are plain JSON files, not encrypted. Keep them somewhere private.</Text>
      {confirm === 'restore' && pendingRestore &&
        confirmBox(
          `Restore ${pendingRestore.cards.length} cards, ${pendingRestore.bills.length} bills and ${pendingRestore.vehicles.length} vehicles? This replaces your current data.`,
          'Restore',
          () => {
            dispatch({ type: 'restore', state: pendingRestore });
            setConfirm('');
            setPendingRestore(null);
            flash('Backup restored.');
          },
        )}

      <SectionHeader title="Start over" />
      <Surface style={{ paddingVertical: space(1) }}>
        <ListRow icon="flask-outline" title="Load sample data" subtitle="Replaces your data with demo cards and bills" onPress={() => setConfirm('sample')} />
        <ListRow icon="trash-outline" iconColor={colors.bad} title="Erase all data" subtitle="Deletes everything and the encryption key" onPress={() => setConfirm('erase')} last />
      </Surface>
      {confirm === 'sample' && confirmBox('Replace all your data with sample data?', 'Replace', () => { dispatch({ type: 'loadSample' }); setConfirm(''); })}
      {confirm === 'erase' &&
        confirmBox('Erase everything in Kova? Export a backup first if you want to keep it.', 'Erase', async () => {
          if (s.lockEnabled && !(await confirmIdentity('Confirm to erase all data'))) return;
          await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
          dispatch({ type: 'erase' });
        })}

      <Text style={[type.tiny, { textAlign: 'center', marginTop: space(8) }]}>Everything in Kova stays on this phone.</Text>
    </Screen>
  );
}

function Pill({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accent : colors.surface }}>
      <Text style={{ color: on ? colors.accentInk : colors.ink, fontSize: 13, fontFamily: fonts.semibold }}>{label}</Text>
    </Pressable>
  );
}
