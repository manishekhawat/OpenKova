import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ListRow, Screen, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { RootStackParamList } from '../navigation';
import { colors, space, type } from '../theme';
import { maskPhone } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { state, dispatch } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const u = state.user;

  return (
    <Screen padTop={false}>
      <View style={{ alignItems: 'center', marginVertical: space(4) }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceHi, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.ink, fontSize: 32, fontWeight: '700' }}>{u?.name[0]?.toUpperCase()}</Text>
        </View>
        <Text style={[type.title, { marginTop: space(3) }]}>{u?.name}</Text>
        <Text style={[type.small, { marginTop: 2 }]}>{u ? maskPhone(u.phone) : ''}</Text>
      </View>

      <Surface style={{ paddingVertical: space(1), marginTop: space(4) }}>
        <ListRow icon="card-outline" title="Credit cards" right={String(state.cards.length)} onPress={() => navigation.navigate('Tabs', { screen: 'Cards' } as never)} />
        <ListRow icon="business-outline" title="Bank accounts" right={String(state.accounts.length)} onPress={() => navigation.navigate('Tabs', { screen: 'Money' } as never)} />
        <ListRow icon="car-sport-outline" title="Vehicles" right={String(state.vehicles.length)} onPress={() => navigation.navigate('Tabs', { screen: 'Garage' } as never)} />
        <ListRow icon="time-outline" title="Payment history" right={String(state.payments.length)} onPress={() => navigation.navigate('Activity')} last />
      </Surface>

      <Button
        label={confirmReset ? 'Tap again to reset sample data' : 'Reset sample data'}
        variant="ghost"
        onPress={() => {
          if (!confirmReset) return setConfirmReset(true);
          dispatch({ type: 'reset' });
          setConfirmReset(false);
        }}
        style={{ marginTop: space(8) }}
      />
      <Button label="Log out" variant="danger" onPress={() => dispatch({ type: 'logout' })} style={{ marginTop: space(3) }} />
      <Text style={[type.tiny, { textAlign: 'center', marginTop: space(6) }]}>Kova 1.0 · demo build · data stays on this phone</Text>
    </Screen>
  );
}
