import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ListRow, Screen, SectionHeader, Surface } from '../components/ui';
import { totalBalance, useStore } from '../data/store';
import { colors, space, type } from '../theme';
import { inr, shortDate } from '../utils/format';
import { monthlyTotals } from './InsightsScreen';

export default function AccountsScreen() {
  const nav = useNavigation();
  const { state } = useStore();
  const months = useMemo(() => monthlyTotals(state.transactions, 6), [state.transactions]);
  const max = Math.max(1, ...months.map((m) => m.total));
  const recent = state.payments.slice(0, 4);

  return (
    <Screen>
      <Text style={type.title}>Money</Text>
      <Text style={[type.small, { marginTop: 4 }]}>Balance across {state.accounts.length} linked accounts</Text>
      <Text style={[type.hero, { marginTop: space(2), fontVariant: ['tabular-nums'] }]}>{inr(totalBalance(state), { decimals: true })}</Text>

      <SectionHeader title="Bank accounts" action="Link" onAction={() => nav.navigate('AddAccount')} />
      <Surface style={{ paddingVertical: space(1) }}>
        {state.accounts.map((a, i) => (
          <ListRow key={a.id} icon="business-outline" title={a.bank} subtitle={`${a.type} •• ${a.last4} · ${a.ifsc}${a.primary ? ' · primary' : ''}`} right={inr(a.balance, { decimals: true })} last={i === state.accounts.length - 1} />
        ))}
      </Surface>

      <SectionHeader title="Card spends" action="Insights" onAction={() => nav.navigate('Insights')} />
      <Pressable onPress={() => nav.navigate('Insights')}>
        <Surface>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 10 }}>
            {months.map((m, i) => (
              <View key={m.key} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: '100%', height: Math.max(4, (m.total / max) * 96), borderRadius: 6, backgroundColor: i === months.length - 1 ? colors.accent : colors.surfaceHi }} />
                <Text style={[type.tiny, { marginTop: 6 }]}>{m.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[type.small, { marginTop: space(3) }]}>
            {inr(months[months.length - 1]?.total ?? 0)} this month · {inr(Math.round(months.slice(0, -1).reduce((n, m) => n + m.total, 0) / Math.max(1, months.length - 1)))} average before
          </Text>
        </Surface>
      </Pressable>

      <SectionHeader title="Recent payments" action={state.payments.length ? 'All' : undefined} onAction={() => nav.navigate('Activity')} />
      <Surface style={{ paddingVertical: space(1) }}>
        {recent.length === 0 ? (
          <Text style={[type.small, { paddingVertical: space(4) }]}>Payments you make in Kova will appear here.</Text>
        ) : (
          recent.map((p, i) => (
            <ListRow key={p.id} icon={p.kind === 'card' ? 'card-outline' : p.kind === 'fastag' ? 'pricetag-outline' : p.kind === 'challan' ? 'alert-circle-outline' : 'receipt-outline'} iconColor={colors.good} title={p.title} subtitle={shortDate(p.date)} right={`-${inr(p.amount)}`} last={i === recent.length - 1} />
          ))
        )}
      </Surface>
      <Button label="Link a bank account" icon="add" variant="ghost" onPress={() => nav.navigate('AddAccount')} style={{ marginTop: space(4) }} />
    </Screen>
  );
}
