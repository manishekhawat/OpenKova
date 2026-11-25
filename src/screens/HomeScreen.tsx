import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { CreditCardView } from '../components/CreditCardView';
import { Logo } from '../components/Logo';
import { IconName, ListRow, Screen, SectionHeader, Surface } from '../components/ui';
import { selectUpcoming, totalBalance, totalCardDue, UpcomingItem, useStore } from '../data/store';
import { colors, radius, space, type } from '../theme';
import { daysFromToday, dueLabel, expiryLabel, greeting, inr, urgencyColor } from '../utils/format';

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

export default function HomeScreen() {
  const nav = useNavigation();
  const { state } = useStore();
  const open = useOpenUpcoming();
  const upcoming = useMemo(() => selectUpcoming(state).filter((i) => daysFromToday(i.dueDate) <= 30), [state]);
  const due = totalCardDue(state);
  const billsDue = state.bills.filter((b) => !b.paidOn && daysFromToday(b.dueDate) <= 30).reduce((n, b) => n + b.amount, 0);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return state.transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((n, t) => n + t.amount, 0);
  }, [state.transactions]);

  const quick: { label: string; icon: IconName; go: () => void }[] = [
    ...(Platform.OS === 'android' ? [{ label: 'Scan SMS', icon: 'mail-unread-outline' as IconName, go: () => nav.navigate('SmsImport', { autoStart: true }) }] : []),
    { label: 'Add card', icon: 'add-circle-outline', go: () => nav.navigate('AddCard') },
    { label: 'Pay bill', icon: 'flash-outline', go: () => nav.navigate('Tabs', { screen: 'Bills' } as never) },
    { label: 'Insights', icon: 'pie-chart-outline', go: () => nav.navigate('Insights') },
  ];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <View style={{ marginBottom: space(4) }}>
            <Logo size={22} />
          </View>
          <Text style={type.small}>{greeting()},</Text>
          <Text style={type.title}>{state.user?.name.split(' ')[0]}</Text>
        </View>
        <Pressable onPress={() => nav.navigate('Settings')} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{state.user?.name[0]?.toUpperCase()}</Text>
        </Pressable>
      </View>

      {/* Summary */}
      <LinearGradient colors={['#1D2140', '#111117']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: space(5), marginTop: space(6), borderWidth: 1, borderColor: colors.line }}>
        <Text style={type.small}>Total card dues</Text>
        <Text style={[type.hero, { fontSize: 38, marginTop: 4, fontVariant: ['tabular-nums'] }]}>{inr(due)}</Text>
        <View style={{ flexDirection: 'row', marginTop: space(5), gap: space(6) }}>
          <View>
            <Text style={type.tiny}>BILLS · 30 DAYS</Text>
            <Text style={[type.h3, { marginTop: 4 }]}>{inr(billsDue)}</Text>
          </View>
          <View>
            <Text style={type.tiny}>SPENT THIS MONTH</Text>
            <Text style={[type.h3, { marginTop: 4 }]}>{inr(thisMonth)}</Text>
          </View>
          <View>
            <Text style={type.tiny}>IN BANK</Text>
            <Text style={[type.h3, { marginTop: 4 }]}>{inr(Math.round(totalBalance(state)))}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space(5) }}>
        {quick.map((q) => (
          <Pressable key={q.label} onPress={q.go} style={({ pressed }) => [{ alignItems: 'center', width: '23%' }, pressed && { opacity: 0.6 }]}>
            <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={q.icon} size={22} color={colors.ink} />
            </View>
            <Text style={[type.small, { marginTop: 6, color: colors.ink, fontSize: 12 }]}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {Platform.OS === 'android' && state.cards.length + state.accounts.length + state.bills.length + state.vehicles.length === 0 && (
        <Pressable onPress={() => nav.navigate('SmsImport', { autoStart: true })} style={({ pressed }) => [{ marginTop: space(5), padding: space(4), borderRadius: radius.lg, backgroundColor: colors.accent + '1A', borderWidth: 1, borderColor: colors.accent + '55', flexDirection: 'row', alignItems: 'center' }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="sparkles" size={22} color={colors.accent} />
          <View style={{ flex: 1, marginLeft: space(3) }}>
            <Text style={[type.body, { fontWeight: '600' }]}>Set up in one tap</Text>
            <Text style={[type.small, { marginTop: 2 }]}>Scan last month's SMS to add your cards, accounts, bills and vehicles.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      )}

      <SectionHeader title="Your cards" action="See all" onAction={() => nav.navigate('Tabs', { screen: 'Cards' } as never)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(5) }} contentContainerStyle={{ paddingHorizontal: space(5), gap: space(3) }} snapToInterval={300 + space(3)} decelerationRate="fast">
        {state.cards.map((c) => (
          <View key={c.id} style={{ width: 300 }}>
            <CreditCardView card={c} onPress={() => nav.navigate('CardDetail', { id: c.id })} />
          </View>
        ))}
        <Pressable
          onPress={() => nav.navigate('AddCard')}
          style={{ width: state.cards.length ? 160 : 300, aspectRatio: state.cards.length ? undefined : 1.586, height: state.cards.length ? 300 / 1.586 : undefined, borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={28} color={colors.muted} />
          <Text style={[type.small, { marginTop: 6 }]}>{state.cards.length ? 'Add card' : 'Add your first credit card'}</Text>
        </Pressable>
      </ScrollView>

      <SectionHeader title="Coming up" />
      <Surface style={{ paddingVertical: space(1) }}>
        {upcoming.length === 0 ? (
          <Text style={[type.small, { paddingVertical: space(4) }]}>
            {state.cards.length + state.bills.length + state.vehicles.length === 0
              ? 'Add cards, bills and vehicles and their due dates will show up here, with reminders.'
              : 'Nothing due in the next 30 days.'}
          </Text>
        ) : (
          upcoming.slice(0, 7).map((it, i, arr) => {
            const d = daysFromToday(it.dueDate);
            const isExpiry = it.kind === 'insurance' || it.kind === 'puc' || it.kind === 'service';
            return (
              <ListRow
                key={it.key}
                icon={UPCOMING_ICON[it.kind]}
                iconColor={urgencyColor(d, colors)}
                title={it.title}
                subtitle={it.subtitle}
                right={it.amount != null ? inr(it.amount) : undefined}
                rightSub={it.kind === 'challan' ? 'unpaid' : isExpiry ? expiryLabel(it.dueDate).replace('expires', it.kind === 'service' ? 'due' : 'expires') : dueLabel(it.dueDate)}
                rightSubColor={urgencyColor(d, colors)}
                onPress={() => open(it)}
                last={i === arr.length - 1}
              />
            );
          })
        )}
      </Surface>
    </Screen>
  );
}
