import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Text, View } from 'react-native';
import { CreditCardView } from '../components/CreditCardView';
import { Button, Empty, ProgressBar, Screen } from '../components/ui';
import { totalCardDue, useStore } from '../data/store';
import { colors, fonts, space, type } from '../theme';
import { inr } from '../utils/format';

export default function CardsScreen() {
  const nav = useNavigation();
  const { state } = useStore();
  const limit = state.cards.reduce((n, c) => n + c.limit, 0);
  const due = totalCardDue(state);
  const util = limit ? due / limit : 0;

  return (
    <Screen>
      <Text style={type.title}>Cards</Text>
      <Text style={[type.small, { marginTop: 4 }]}>
        {state.cards.length} card{state.cards.length === 1 ? '' : 's'} with {inr(limit)} of credit
      </Text>

      <View style={{ marginTop: space(5), marginBottom: space(6) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={type.small}>Overall utilisation</Text>
          <Text style={[type.small, { color: util > 0.3 ? colors.warn : colors.good, fontFamily: fonts.semibold }]}>{Math.round(util * 100)}%</Text>
        </View>
        <ProgressBar value={util} color={util > 0.3 ? colors.warn : colors.good} />
        <Text style={[type.tiny, { marginTop: 8 }]}>Keeping utilisation under 30% helps your credit score.</Text>
      </View>

      {state.cards.length === 0 && <Empty icon="card-outline" text="No cards yet. Add one to track dues and pay bills." />}
      <View style={{ gap: space(4) }}>
        {state.cards.map((c) => (
          <CreditCardView key={c.id} card={c} onPress={() => nav.navigate('CardDetail', { id: c.id })} />
        ))}
      </View>

      <Button label="Add a credit card" icon="add" variant="ghost" onPress={() => nav.navigate('AddCard')} style={{ marginTop: space(5) }} />
    </Screen>
  );
}
