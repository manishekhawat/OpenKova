// Local due-date reminders. Everything is scheduled on the phone; no server or push service.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { vehicleName } from '../data/store';
import type { AppState } from '../data/types';
import { inr } from '../utils/format';

const CHANNEL = 'due-reminders';
const MAX_SCHEDULED = 60; // stay well under OS limits on scheduled alarms

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Due-date reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

type Due = { id: string; title: string; body: string; due: Date };

function collectDues(state: AppState): Due[] {
  const out: Due[] = [];
  for (const c of state.cards)
    if (c.outstanding > 0)
      out.push({ id: `card-${c.id}`, title: `${c.bank} card bill`, body: `${inr(c.outstanding)} due (min ${inr(c.minDue)})`, due: new Date(c.dueDate) });
  for (const b of state.bills)
    if (!b.paidOn) out.push({ id: `bill-${b.id}`, title: `${b.biller} bill`, body: `${inr(b.amount)} · ${b.category}`, due: new Date(b.dueDate) });
  for (const v of state.vehicles) {
    const name = vehicleName(v);
    if (v.insuranceExpiry) out.push({ id: `ins-${v.id}`, title: `${name} insurance`, body: `${v.regNo} · policy expires`, due: new Date(v.insuranceExpiry) });
    if (v.pucExpiry) out.push({ id: `puc-${v.id}`, title: `${name} PUC`, body: `${v.regNo} · pollution certificate expires`, due: new Date(v.pucExpiry) });
    if (v.serviceDue) out.push({ id: `svc-${v.id}`, title: `${name} service`, body: `${v.regNo} · service due`, due: new Date(v.serviceDue) });
  }
  return out;
}

function whenLabel(daysBefore: number) {
  return daysBefore === 0 ? 'Today' : daysBefore === 1 ? 'Tomorrow' : `In ${daysBefore} days`;
}

/** Cancels everything and schedules fresh reminders from current state. Returns how many were scheduled. */
export async function rescheduleReminders(state: AppState): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!state.user || !state.settings.remindersEnabled) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;

  const now = Date.now();
  const jobs: { at: Date; title: string; body: string; id: string }[] = [];
  for (const d of collectDues(state)) {
    for (const before of state.settings.reminderDaysBefore) {
      const at = new Date(d.due);
      at.setDate(at.getDate() - before);
      at.setHours(state.settings.reminderHour, 0, 0, 0);
      if (at.getTime() > now + 60_000) jobs.push({ at, id: `${d.id}-${before}`, title: `${whenLabel(before)}: ${d.title}`, body: d.body });
    }
  }
  jobs.sort((a, b) => +a.at - +b.at);
  const batch = jobs.slice(0, MAX_SCHEDULED);
  for (const j of batch) {
    await Notifications.scheduleNotificationAsync({
      identifier: j.id,
      content: { title: j.title, body: j.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.at, channelId: CHANNEL },
    });
  }
  return batch.length;
}
