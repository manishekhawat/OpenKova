import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chips, Empty, IconName, ListRow, Screen, SectionHeader, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { BillCategory } from '../data/types';
import { colors, space, type } from '../theme';
import { daysFromToday, dueLabel, inr, shortDate, urgencyColor } from '../utils/format';

export const BILL_ICON: Record<BillCategory, IconName> = {
  Electricity: 'flash-outline',
  Broadband: 'wifi-outline',
  'Mobile postpaid': 'phone-portrait-outline',
  Rent: 'home-outline',
  Gas: 'flame-outline',
  Water: 'water-outline',
  Insurance: 'umbrella-outline',
  DTH: 'tv-outline',
};

const TABS = ['Upcoming', 'Paid'] as const;

export default function BillsScreen() {
  const nav = useNavigation();
  const { state } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Upcoming');

  const unpaid = state.bills.filter((b) => !b.paidOn).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  const paid = state.bills.filter((b) => b.paidOn).sort((a, b) => +new Date(b.paidOn!) - +new Date(a.paidOn!));
  const overdue = unpaid.filter((b) => daysFromToday(b.dueDate) < 0);
  const week = unpaid.filter((b) => { const d = daysFromToday(b.dueDate); return d >= 0 && d <= 7; });
  const later = unpaid.filter((b) => daysFromToday(b.dueDate) > 7);
  const totalWeek = [...overdue, ...week].reduce((n, b) => n + b.amount, 0);

  const group = (title: string, list: typeof unpaid) =>
    list.length ? (
      <View key={title}>
        <SectionHeader title={title} />
        <Surface style={{ paddingVertical: space(1) }}>
          {list.map((b, i) => {
            const d = daysFromToday(b.dueDate);
            return (
              <ListRow
                key={b.id}
                icon={BILL_ICON[b.category]}
                iconColor={urgencyColor(d, colors)}
                title={b.biller}
                subtitle={b.consumerId && b.consumerId !== '—' ? `${b.category}, ${b.consumerId}` : b.category}
                right={inr(b.amount)}
                rightSub={dueLabel(b.dueDate)}
                rightSubColor={urgencyColor(d, colors)}
                onPress={() => nav.navigate('Pay', { kind: 'bill', refId: b.id })}
                last={i === list.length - 1}
              />
            );
          })}
        </Surface>
      </View>
    ) : null;

  return (
    <Screen>
      <Text style={type.title}>Bills</Text>
      <Text style={[type.small, { marginTop: 4, marginBottom: space(5) }]}>
        {totalWeek > 0 ? `${inr(totalWeek)} due this week` : 'Nothing due this week'}
      </Text>
      <Chips options={TABS} value={tab} onChange={setTab} />

      {tab === 'Upcoming' ? (
        unpaid.length === 0 ? (
          <Empty icon="checkmark-done-outline" text="No unpaid bills." />
        ) : (
          <>
            {group('Overdue', overdue)}
            {group('This week', week)}
            {group('Later', later)}
          </>
        )
      ) : paid.length === 0 ? (
        <Empty icon="time-outline" text="Bills you pay here will show up in this list." />
      ) : (
        <Surface style={{ paddingVertical: space(1) }}>
          {paid.map((b, i) => (
            <ListRow key={b.id} icon={BILL_ICON[b.category]} iconColor={colors.good} title={b.biller} subtitle={`Paid ${shortDate(b.paidOn!)}`} right={inr(b.amount)} last={i === paid.length - 1} />
          ))}
        </Surface>
      )}

      <Button label="Add a biller" icon="add" variant="ghost" onPress={() => nav.navigate('AddBill')} style={{ marginTop: space(6) }} />
    </Screen>
  );
}
