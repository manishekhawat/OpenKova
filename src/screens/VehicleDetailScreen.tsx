import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ListRow, Screen, SectionHeader, Surface } from '../components/ui';
import { useStore } from '../data/store';
import type { RootStackParamList } from '../navigation';
import { colors, space, type } from '../theme';
import { expiryLabel, inr, shortDate } from '../utils/format';
import { NumberPlate, statusColor } from './GarageScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { state, dispatch } = useStore();
  const v = state.vehicles.find((x) => x.id === route.params.id);
  const [confirmRemove, setConfirmRemove] = useState(false);
  if (!v) return <Screen padTop={false}><Text style={type.body}>This vehicle was removed.</Text></Screen>;

  const open = v.challans.filter((c) => !c.paidOn);
  const paid = v.challans.filter((c) => c.paidOn);

  return (
    <Screen padTop={false}>
      <Text style={type.title}>{v.make} {v.model}</Text>
      <Text style={[type.small, { marginTop: 2, marginBottom: space(4) }]}>{v.kind} · {v.year} · {v.fuel}</Text>
      <NumberPlate regNo={v.regNo} big />

      <Surface style={{ marginTop: space(6) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={type.tiny}>FASTAG BALANCE</Text>
            <Text style={[type.title, { marginTop: 4, color: v.fastagBalance < 300 ? colors.warn : colors.ink }]}>{inr(v.fastagBalance)}</Text>
          </View>
          <Button label="Recharge" onPress={() => navigation.navigate('Pay', { kind: 'fastag', refId: v.id })} style={{ height: 44 }} />
        </View>
        {v.fastagBalance < 300 && <Text style={[type.small, { marginTop: space(3), color: colors.warn }]}>Low balance. Toll plazas may charge double without enough FASTag balance.</Text>}
      </Surface>

      <SectionHeader title="Documents & reminders" />
      <Surface style={{ paddingVertical: space(1) }}>
        <ListRow icon="shield-checkmark-outline" iconColor={statusColor(v.insuranceExpiry)} title="Insurance" subtitle={`${v.insurer} · till ${shortDate(v.insuranceExpiry)}`} rightSub={expiryLabel(v.insuranceExpiry)} rightSubColor={statusColor(v.insuranceExpiry)} />
        <ListRow icon="leaf-outline" iconColor={statusColor(v.pucExpiry)} title="Pollution (PUC)" subtitle={`Valid till ${shortDate(v.pucExpiry)}`} rightSub={expiryLabel(v.pucExpiry)} rightSubColor={statusColor(v.pucExpiry)} />
        <ListRow icon="construct-outline" iconColor={statusColor(v.serviceDue)} title="Next service" subtitle={shortDate(v.serviceDue)} rightSub={expiryLabel(v.serviceDue).replace('expires', 'due').replace('expired', 'overdue')} rightSubColor={statusColor(v.serviceDue)} last />
      </Surface>

      <SectionHeader title={`Challans${open.length ? ` · ${open.length} unpaid` : ''}`} />
      <Surface style={{ paddingVertical: space(1) }}>
        {v.challans.length === 0 ? (
          <Text style={[type.small, { paddingVertical: space(4) }]}>No challans found for {v.regNo}.</Text>
        ) : (
          [...open, ...paid].map((c, i, arr) => (
            <ListRow
              key={c.id}
              icon={c.paidOn ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              iconColor={c.paidOn ? colors.good : colors.bad}
              title={c.offence}
              subtitle={`${c.location} · ${shortDate(c.date)}`}
              right={inr(c.amount)}
              rightSub={c.paidOn ? 'Paid' : 'Tap to pay'}
              rightSubColor={c.paidOn ? colors.good : colors.accent}
              onPress={c.paidOn ? undefined : () => navigation.navigate('Pay', { kind: 'challan', refId: v.id, subId: c.id })}
              last={i === arr.length - 1}
            />
          ))
        )}
      </Surface>

      <Pressable
        onPress={() => {
          if (!confirmRemove) return setConfirmRemove(true);
          dispatch({ type: 'removeVehicle', id: v.id });
          navigation.goBack();
        }}
        style={{ alignSelf: 'center', marginTop: space(8), padding: space(3) }}
      >
        <Text style={{ color: colors.bad, fontWeight: '600' }}>{confirmRemove ? 'Tap again to remove' : 'Remove vehicle'}</Text>
      </Pressable>
    </Screen>
  );
}
