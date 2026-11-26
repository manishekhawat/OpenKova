import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { IconBadge, ListRow, ProgressBar, Screen, SectionHeader, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { SpendCategory, Transaction } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { colors, fonts, radius, space, type } from '../theme';
import { inr, monthKey, monthLabel } from '../utils/format';
import { CATEGORY_ICON } from './CardDetailScreen';

export function monthlyTotals(txns: Transaction[], count: number) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const t of txns) {
    const k = monthKey(t.date);
    if (totals.has(k)) totals.set(k, totals.get(k)! + t.amount);
  }
  return keys.map((k) => ({ key: k, label: monthLabel(k), total: totals.get(k)! }));
}

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

export default function InsightsScreen({ route }: Props) {
  const { state } = useStore();
  const [cardId, setCardId] = useState<string | undefined>(route.params?.cardId);
  const txns = useMemo(() => (cardId ? state.transactions.filter((t) => t.cardId === cardId) : state.transactions), [state.transactions, cardId]);
  const months = useMemo(() => monthlyTotals(txns, 6), [txns]);
  const [selected, setSelected] = useState(months.length - 1);
  const month = months[selected];

  const byCategory = useMemo(() => {
    const m = new Map<SpendCategory, { total: number; count: number }>();
    for (const t of txns) {
      if (monthKey(t.date) !== month?.key) continue;
      const cur = m.get(t.category) ?? { total: 0, count: 0 };
      m.set(t.category, { total: cur.total + t.amount, count: cur.count + 1 });
    }
    return [...m.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total);
  }, [txns, month]);

  const topMerchants = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) if (monthKey(t.date) === month?.key) m.set(t.merchant, (m.get(t.merchant) ?? 0) + t.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [txns, month]);

  const max = Math.max(1, ...months.map((m) => m.total));
  const prev = months[selected - 1]?.total;
  const change = prev ? (month.total - prev) / prev : null;
  const catMax = byCategory[0]?.total ?? 1;

  const filters = [{ id: undefined as string | undefined, label: 'All cards' }, ...state.cards.map((c) => ({ id: c.id as string | undefined, label: `${c.bank.split(' ')[0]} •• ${c.last4}` }))];

  return (
    <Screen padTop={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(5) }} contentContainerStyle={{ paddingHorizontal: space(5), gap: 8 }}>
        {filters.map((f) => {
          const on = f.id === cardId;
          return (
            <Pressable key={f.label} onPress={() => setCardId(f.id)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accent : colors.surface }}>
              <Text style={{ color: on ? colors.accentInk : colors.ink, fontFamily: fonts.semibold, fontSize: 13 }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[type.small, { marginTop: space(6) }]}>Spent in {month?.label}</Text>
      <Text style={[type.hero, { marginTop: 2 }]}>{inr(month?.total ?? 0)}</Text>
      {change !== null && (
        <Text style={{ color: change > 0 ? colors.warn : colors.good, marginTop: 4, fontFamily: fonts.semibold }}>
          {change > 0 ? '▲' : '▼'} {Math.abs(Math.round(change * 100))}% vs {months[selected - 1].label}
        </Text>
      )}

      <Surface style={{ marginTop: space(5) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 10 }}>
          {months.map((m, i) => (
            <Pressable key={m.key} onPress={() => setSelected(i)} style={{ flex: 1, alignItems: 'center' }} hitSlop={6}>
              <Text style={[type.tiny, { marginBottom: 4, color: i === selected ? colors.ink : colors.faint }]}>{Math.round(m.total / 1000)}k</Text>
              <View style={{ width: '100%', height: Math.max(4, (m.total / max) * 110), borderRadius: 6, backgroundColor: i === selected ? colors.accent : colors.surfaceHi }} />
              <Text style={[type.tiny, { marginTop: 6, color: i === selected ? colors.ink : colors.faint }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[type.tiny, { marginTop: space(3) }]}>Tap a month to see its breakdown</Text>
      </Surface>

      <SectionHeader title="By category" />
      <Surface>
        {byCategory.length === 0 ? (
          <Text style={type.small}>No spends this month.</Text>
        ) : (
          byCategory.map((c) => (
            <View key={c.category} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
              <IconBadge name={CATEGORY_ICON[c.category]} size={36} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={type.body}>{c.category}</Text>
                  <Text style={[type.body, { fontFamily: fonts.semibold }]}>{inr(c.total)}</Text>
                </View>
                <ProgressBar value={c.total / catMax} />
                <Text style={[type.tiny, { marginTop: 4 }]}>
                  {Math.round((c.total / Math.max(1, month.total)) * 100)}% of the month, {c.count} payment{c.count === 1 ? '' : 's'}
                </Text>
              </View>
            </View>
          ))
        )}
      </Surface>

      <SectionHeader title="Top merchants" />
      <Surface>
        {topMerchants.map(([name, total], i) => (
          <ListRow key={name} icon="storefront-outline" title={name} right={inr(total)} last={i === topMerchants.length - 1} />
        ))}
      </Surface>
    </Screen>
  );
}
