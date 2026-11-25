import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Empty, Pill, Screen } from '../components/ui';
import { useStore, vehicleName } from '../data/store';
import type { Vehicle } from '../data/types';
import { colors, radius, space, type } from '../theme';
import { daysFromToday, expiryLabel, inr } from '../utils/format';

export function statusColor(iso?: string) {
  if (!iso) return colors.faint;
  const d = daysFromToday(iso);
  return d < 0 ? colors.bad : d <= 30 ? colors.warn : colors.good;
}

export function NumberPlate({ regNo, big }: { regNo: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 6, overflow: 'hidden', borderWidth: 1.5, borderColor: '#111' }}>
      <View style={{ backgroundColor: '#1F4BB8', paddingHorizontal: 4, justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: big ? 10 : 8, fontWeight: '800' }}>IND</Text>
      </View>
      <View style={{ backgroundColor: '#F7F7F2', paddingHorizontal: big ? 14 : 10, paddingVertical: big ? 6 : 4 }}>
        <Text style={{ color: '#111', fontSize: big ? 20 : 15, fontWeight: '800', letterSpacing: 1.5 }}>{regNo}</Text>
      </View>
    </View>
  );
}

function VehicleCard({ v, onPress }: { v: Vehicle; onPress: () => void }) {
  const openChallans = v.challans.filter((c) => !c.paidOn);
  const fine = openChallans.reduce((n, c) => n + c.amount, 0);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: space(5) }, pressed && { opacity: 0.85 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{vehicleName(v)}</Text>
          <Text style={[type.small, { marginTop: 2, marginBottom: space(3) }]}>{v.year} · {v.fuel}</Text>
          <NumberPlate regNo={v.regNo} />
        </View>
        <Ionicons name={v.kind === 'Car' ? 'car-sport' : 'bicycle'} size={44} color={colors.faint} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space(5) }}>
        <Pill label={v.insuranceExpiry ? `Insurance ${expiryLabel(v.insuranceExpiry)}` : 'Insurance date not set'} color={statusColor(v.insuranceExpiry)} />
        <Pill label={v.pucExpiry ? `PUC ${expiryLabel(v.pucExpiry)}` : 'PUC date not set'} color={statusColor(v.pucExpiry)} />
        {openChallans.length > 0 && <Pill label={`${openChallans.length} challan · ${inr(fine)}`} color={colors.bad} />}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space(4), paddingTop: space(4), borderTopWidth: 1, borderTopColor: colors.line }}>
        <Text style={type.small}>FASTag balance</Text>
        <Text style={[type.body, { fontWeight: '600', color: v.fastagBalance < 300 ? colors.warn : colors.ink }]}>{inr(v.fastagBalance)}</Text>
      </View>
    </Pressable>
  );
}

export default function GarageScreen() {
  const nav = useNavigation();
  const { state } = useStore();
  const alerts = state.vehicles.reduce(
    (n, v) => n + [v.insuranceExpiry, v.pucExpiry].filter((d) => d && daysFromToday(d) <= 30).length + v.challans.filter((c) => !c.paidOn).length,
    0,
  );

  return (
    <Screen>
      <Text style={type.title}>Garage</Text>
      <Text style={[type.small, { marginTop: 4, marginBottom: space(6) }]}>
        {state.vehicles.length} vehicle{state.vehicles.length === 1 ? '' : 's'}
        {alerts ? ` · ${alerts} thing${alerts === 1 ? '' : 's'} need attention` : ' · all good'}
      </Text>
      {state.vehicles.length === 0 && <Empty icon="car-outline" text="Add your car or bike to track insurance, PUC, challans and FASTag." />}
      <View style={{ gap: space(4) }}>
        {state.vehicles.map((v) => (
          <VehicleCard key={v.id} v={v} onPress={() => nav.navigate('VehicleDetail', { id: v.id })} />
        ))}
      </View>
      <Button label="Add a vehicle" icon="add" variant="ghost" onPress={() => nav.navigate('AddVehicle')} style={{ marginTop: space(5) }} />
    </Screen>
  );
}
