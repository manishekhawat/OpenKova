import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CreditCardView } from '../components/CreditCardView';
import { Button, IconName, ListRow, ProgressBar, Screen, SectionHeader, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { SpendCategory } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { colors, space, type } from '../theme';
import { dueLabel, inr, shortDate } from '../utils/format';

export const CATEGORY_ICON: Record<SpendCategory, IconName> = {
  Food: 'fast-food-outline',
  Shopping: 'bag-handle-outline',
  Travel: 'airplane-outline',
  Fuel: 'speedometer-outline',
  Groceries: 'basket-outline',
  Entertainment: 'film-outline',
  Utilities: 'flash-outline',
  Health: 'medkit-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

export default function CardDetailScreen({ route, navigation }: Props) {
  const { state, dispatch } = useStore();
  const card = state.cards.find((c) => c.id === route.params.id);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const txns = useMemo(() => state.transactions.filter((t) => t.cardId === route.params.id).slice(0, 15), [state.transactions, route.params.id]);

  if (!card) return <Screen padTop={false}><Text style={type.body}>This card was removed.</Text></Screen>;

  const util = card.limit ? card.outstanding / card.limit : 0;
  const stat = (label: string, value: string, color: string = colors.ink) => (
    <View style={{ flex: 1 }}>
      <Text style={type.tiny}>{label}</Text>
      <Text style={[type.h3, { marginTop: 4, color }]}>{value}</Text>
    </View>
  );

  return (
    <Screen padTop={false}>
      <CreditCardView card={card} onPress={() => navigation.navigate('AddCard', { id: card.id })} />

      <Surface style={{ marginTop: space(5) }}>
        <View style={{ flexDirection: 'row' }}>
          {stat('TOTAL DUE', inr(card.outstanding))}
          {stat('MINIMUM DUE', inr(card.minDue))}
          {stat('DUE DATE', card.outstanding ? shortDate(card.dueDate) : '—', card.outstanding ? colors.warn : colors.ink)}
        </View>
        <View style={{ marginTop: space(5) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={type.small}>{card.limit ? `${inr(card.limit - card.outstanding)} available of ${inr(card.limit)}` : 'Credit limit not set · tap Edit'}</Text>
            <Text style={type.small}>{Math.round(util * 100)}%</Text>
          </View>
          <ProgressBar value={util} color={util > 0.3 ? colors.warn : colors.accent} />
        </View>
      </Surface>

      {card.outstanding > 0 ? (
        <Button label={`Pay ${inr(card.outstanding)}`} onPress={() => navigation.navigate('Pay', { kind: 'card', refId: card.id })} style={{ marginTop: space(4) }} />
      ) : (
        <Text style={[type.small, { textAlign: 'center', marginTop: space(4), color: colors.good }]}>Nothing to pay. Next statement {shortDate(card.statementDate)}.</Text>
      )}
      {card.outstanding > 0 && <Text style={[type.tiny, { textAlign: 'center', marginTop: 8 }]}>{dueLabel(card.dueDate)} · statement {shortDate(card.statementDate)}</Text>}
      <Button label="Update statement or edit card" variant="ghost" icon="create-outline" onPress={() => navigation.navigate('AddCard', { id: card.id })} style={{ marginTop: space(3) }} />

      <SectionHeader title="Recent transactions" action="Insights" onAction={() => navigation.navigate('Insights', { cardId: card.id })} />
      <Surface style={{ paddingVertical: space(1) }}>
        {txns.length === 0 ? (
          <Text style={[type.small, { paddingVertical: space(4) }]}>No transactions yet.</Text>
        ) : (
          txns.map((t, i) => (
            <ListRow key={t.id} icon={CATEGORY_ICON[t.category]} title={t.merchant} subtitle={`${t.category} · ${shortDate(t.date)}`} right={inr(t.amount)} last={i === txns.length - 1} />
          ))
        )}
      </Surface>

      <Pressable
        onPress={() => {
          if (!confirmRemove) return setConfirmRemove(true);
          dispatch({ type: 'removeCard', id: card.id });
          navigation.goBack();
        }}
        style={{ alignSelf: 'center', marginTop: space(8), padding: space(3) }}
      >
        <Text style={{ color: colors.bad, fontWeight: '600' }}>{confirmRemove ? 'Tap again to remove this card' : 'Remove card'}</Text>
      </Pressable>
    </Screen>
  );
}
