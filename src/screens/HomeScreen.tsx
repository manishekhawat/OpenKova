import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { CreditCardView } from '../components/CreditCardView';
import { Logo } from '../components/Logo';
import { Button, IconName, Screen, SectionHeader } from '../components/ui';
import { selectUpcoming, totalBalance, totalCardDue, UpcomingItem, useStore } from '../data/store';
import { colors, fonts, radius, space, type } from '../theme';
import { daysFromToday, inr } from '../utils/format';

export const UPCOMING_ICON: Record<UpcomingItem['kind'], IconName> = {
  card: 'card-outline',
  bill: 'receipt-outline',
  insurance: 'shield-checkmark-outline',
  puc: 'leaf-outline',
  service: 'construct-outline',
  challan: 'alert-circle-outline',
};

export function useOpenUpcoming() {
  const nav = useNavigation();
  return (it: UpcomingItem) => {
    if (it.kind === 'card') nav.navigate('CardDetail', { id: it.refId });
    else if (it.kind === 'bill') nav.navigate('Pay', { kind: 'bill', refId: it.refId });
    else nav.navigate('VehicleDetail', { id: it.refId });
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "today", "tomorrow", "on Friday" (within a week) or "on 4 Dec". */
function when(iso: string) {
  const n = daysFromToday(iso);
  const d = new Date(iso);
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} ago`;
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 7) return `on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]}`;
  return `on ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function dateColor(days: number) {
  if (days < 0) return colors.bad;
  if (days <= 3) return colors.warn;
  return colors.ink;
}

export default function HomeScreen() {
  const nav = useNavigation();
  const { state } = useStore();
  const open = useOpenUpcoming();
  const upcoming = useMemo(() => selectUpcoming(state).filter((i) => daysFromToday(i.dueDate) <= 30), [state]);
  const due = totalCardDue(state);
  const balance = totalBalance(state);
  const nextCard = upcoming.find((u) => u.kind === 'card');
  const empty = state.cards.length + state.accounts.length + state.bills.length + state.vehicles.length === 0;

  const thisMonth = useMemo(() => {
    const now = new Date();
    return state.transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((n, t) => n + t.amount, 0);
  }, [state.transactions]);

  // Group the next 30 days by date: the rail shows each date once.
  const groups = useMemo(() => {
    const out: { key: string; date: string; items: UpcomingItem[] }[] = [];
    for (const it of upcoming) {
      const k = new Date(it.dueDate).toDateString();
      const g = out.find((x) => x.key === k);
      if (g) g.items.push(it);
      else out.push({ key: k, date: it.dueDate, items: [it] });
    }
    return out.slice(0, 8);
  }, [upcoming]);

  const billsDue = state.bills.filter((b) => !b.paidOn && daysFromToday(b.dueDate) <= 30).reduce((n, b) => n + b.amount, 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo size={24} />
        <Pressable
          onPress={() => nav.navigate('Settings')}
          hitSlop={10}
          accessibilityLabel="Settings"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }}>{state.user?.name[0]?.toUpperCase()}</Text>
        </Pressable>
      </View>

      {/* The sentence: what matters most, said plainly. */}
      <View style={{ marginTop: space(10) }}>
        {due > 0 ? (
          <>
            <Text style={[type.hero, { fontVariant: ['tabular-nums'] }]} adjustsFontSizeToFit numberOfLines={1}>
              {inr(Math.round(due))}
            </Text>
            <Text style={[type.title, { fontFamily: fonts.medium, marginTop: space(1) }]}>
              due on your cards.
              {nextCard
                ? daysFromToday(nextCard.dueDate) < 0
                  ? ` ${shortBank(nextCard.title)} was due ${when(nextCard.dueDate)}.`
                  : ` ${shortBank(nextCard.title)} is next, ${when(nextCard.dueDate)}.`
                : ''}
            </Text>
          </>
        ) : empty ? (
          <Text style={[type.title, { fontFamily: fonts.medium }]}>Nothing to track yet.</Text>
        ) : (
          <Text style={[type.title, { fontFamily: fonts.medium }]}>
            No card dues.{billsDue ? ` ${inr(billsDue)} in bills over the next 30 days.` : ' Nothing else due this month either.'}
          </Text>
        )}
        {!empty && (
          <Text style={[type.small, { marginTop: space(4) }]}>
            {state.accounts.length ? `${inr(Math.round(balance))} in your bank accounts. ` : ''}
            {thisMonth ? (
              <Text onPress={() => nav.navigate('Insights')} style={{ color: colors.accent }}>
                {inr(thisMonth)} spent this month
              </Text>
            ) : null}
            {thisMonth ? '.' : ''}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(6) }}>
        {nextCard && <Button label={`Pay ${shortBank(nextCard.title)}`} onPress={() => open(nextCard)} style={{ flex: 1 }} />}
        {Platform.OS === 'android' && (
          <Button
            label={empty ? 'Fill from my SMS' : 'Scan SMS'}
            icon="mail-unread-outline"
            variant={nextCard ? 'ghost' : 'primary'}
            onPress={() => nav.navigate('SmsImport', { autoStart: true })}
            style={{ flex: 1 }}
          />
        )}
      </View>
      {empty && (
        <Text style={[type.tiny, { marginTop: space(3) }]}>
          Kova reads last month's bank and biller messages to add your cards, accounts, bills and vehicles. Or add them yourself from each tab.
        </Text>
      )}

      {groups.length > 0 && (
        <>
          <SectionHeader title="Next 30 days" />
          {groups.map((g, gi) => {
            const d = new Date(g.date);
            const days = daysFromToday(g.date);
            const c = dateColor(days);
            return (
              <View key={g.key} style={{ flexDirection: 'row' }}>
                {/* date column + rail */}
                <View style={{ width: 56, alignItems: 'flex-start' }}>
                  <Text style={{ fontFamily: fonts.wide, fontSize: 28, lineHeight: 30, color: c, fontVariant: ['tabular-nums'] }}>{d.getDate()}</Text>
                  <Text style={[type.tiny, { color: days < 0 ? colors.bad : colors.muted }]}>{days < 0 ? 'Overdue' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days < 7 ? DAYS[d.getDay()] : MONTHS[d.getMonth()]}</Text>
                  {gi < groups.length - 1 && <View style={{ flex: 1, width: 1, backgroundColor: colors.line, marginLeft: 10, marginTop: space(2), minHeight: space(3) }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: space(6) }}>
                  {g.items.map((it) => (
                    <Pressable key={it.key} onPress={() => open(it)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: space(1) }, pressed && { opacity: 0.6 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={type.body} numberOfLines={1}>{it.title}</Text>
                        <Text style={type.small} numberOfLines={1}>{label(it)}</Text>
                      </View>
                      {it.amount != null && <Text style={[type.body, { fontFamily: fonts.semibold, fontVariant: ['tabular-nums'], marginLeft: space(3) }]}>{inr(Math.round(it.amount))}</Text>}
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}

      {state.cards.length > 0 && (
        <>
          <SectionHeader title="Cards" action="All cards" onAction={() => nav.navigate('Tabs', { screen: 'Cards' } as never)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(5) }} contentContainerStyle={{ paddingHorizontal: space(5), gap: space(3) }} snapToInterval={280 + space(3)} decelerationRate="fast">
            {state.cards.map((c) => (
              <View key={c.id} style={{ width: 280 }}>
                <CreditCardView card={c} onPress={() => nav.navigate('CardDetail', { id: c.id })} />
              </View>
            ))}
            <Pressable
              onPress={() => nav.navigate('AddCard')}
              style={{ width: 120, height: 280 / 1.586, borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={24} color={colors.muted} />
              <Text style={[type.small, { marginTop: 4 }]}>Add card</Text>
            </Pressable>
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

/** "HDFC Bank Regalia Gold" → "HDFC Bank" (the first two words name the bank). */
function shortBank(title: string) {
  return title.split(' ').slice(0, 2).join(' ');
}

function label(it: UpcomingItem): string {
  switch (it.kind) {
    case 'card':
      return `Card bill, ${it.subtitle.replace('Card •• ', 'ending ')}`;
    case 'bill':
      return `${it.subtitle} bill`;
    case 'insurance':
      return `Insurance renewal for ${it.subtitle}`;
    case 'puc':
      return `Pollution certificate for ${it.subtitle}`;
    case 'service':
      return `Service due for ${it.subtitle}`;
    case 'challan':
      return `Unpaid challans on ${it.subtitle}`;
  }
}
