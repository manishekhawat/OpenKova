import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, Chips, DateField, Field, Screen, SectionHeader } from '../components/ui';
import { useStore } from '../data/store';
import type { Challan, Vehicle } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { findVehicleInSms } from '../sms/vehicleLookup';
import { colors, space, type } from '../theme';
import { describeReg } from '../utils/rto';
import { inr, uid } from '../utils/format';
import { NumberPlate } from './GarageScreen';

const KINDS = ['Car', 'Bike'] as const;
const FUELS = ['Petrol', 'Diesel', 'CNG', 'Electric'] as const;

// Indian registration format, e.g. KA 03 MN 4521 / DL 3C AB 1234 / 22 BH 1234 AA
export function formatReg(raw: string) {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bh = s.match(/^(\d{2})(BH)(\d{0,4})([A-Z]{0,2})$/);
  if (bh) return [bh[1], bh[2], bh[3], bh[4]].filter(Boolean).join(' ');
  const m = s.match(/^([A-Z]{2})(\d{1,2}[A-Z]?)([A-Z]{0,3})(\d{0,4})$/);
  if (!m) return s;
  return [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ');
}
const REG_OK = /^[A-Z]{2} \d{1,2}[A-Z]? [A-Z]{1,3} \d{4}$|^\d{2} BH \d{4} [A-Z]{1,2}$/;

type Props = NativeStackScreenProps<RootStackParamList, 'AddVehicle'>;

export default function AddVehicleScreen({ navigation, route }: Props) {
  const { state, dispatch } = useStore();
  const existing = state.vehicles.find((v) => v.id === route.params?.id);
  const editing = !!existing;

  useLayoutEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit vehicle' : 'Add a vehicle' });
  }, [navigation, editing]);

  const [reg, setReg] = useState(existing?.regNo ?? '');
  const [kind, setKind] = useState<Vehicle['kind']>(existing?.kind ?? 'Car');
  const [fuel, setFuel] = useState<Vehicle['fuel']>(existing?.fuel ?? 'Petrol');
  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [year, setYear] = useState(String(existing?.year ?? new Date().getFullYear()));
  const [insurer, setInsurer] = useState(existing?.insurer ?? '');
  const [insuranceExpiry, setInsuranceExpiry] = useState<string | undefined>(existing?.insuranceExpiry);
  const [pucExpiry, setPucExpiry] = useState<string | undefined>(existing?.pucExpiry);
  const [serviceDue, setServiceDue] = useState<string | undefined>(existing?.serviceDue);
  const [fastag, setFastag] = useState(existing ? String(existing.fastagBalance) : '');
  const [challans, setChallans] = useState<Challan[]>(existing?.challans ?? []);
  const [tried, setTried] = useState(false);
  const [lookup, setLookup] = useState<{ busy: boolean; note?: string; ok?: boolean }>({ busy: false });

  const regValid = REG_OK.test(reg);
  const regInfo = regValid ? describeReg(reg) : undefined;

  const fillFromSms = async () => {
    setLookup({ busy: true });
    try {
      const r = await findVehicleInSms(reg);
      if (r === 'unavailable') return setLookup({ busy: false, note: 'SMS search works in the Android app.' });
      if (r === 'no-permission') return setLookup({ busy: false, note: 'Allow SMS access to search your messages.' });
      if (!r) return setLookup({ busy: false, note: `No messages mention ${reg} in the last 6 months.` });
      const found: string[] = [];
      if (r.fastagBalance) { setFastag(String(r.fastagBalance)); found.push(`FASTag ${inr(r.fastagBalance)}`); }
      if (r.insuranceExpiry) { setInsuranceExpiry(r.insuranceExpiry); found.push('insurance date'); }
      if (r.insurer && r.insurer !== 'Not added') setInsurer(r.insurer);
      if (r.pucExpiry) { setPucExpiry(r.pucExpiry); found.push('PUC date'); }
      if (r.challans.length) {
        setChallans((prev) => [...r.challans.filter((c) => !prev.some((p) => p.challanNo && p.challanNo === c.challanNo)), ...prev]);
        found.push(`${r.challans.length} challan${r.challans.length === 1 ? '' : 's'}`);
      }
      setLookup({ busy: false, ok: found.length > 0, note: found.length ? `Found in ${r.messages} message${r.messages === 1 ? '' : 's'}: ${found.join(', ')}.` : 'Messages mention this vehicle but no details could be read.' });
    } catch (e: any) {
      setLookup({ busy: false, note: `Couldn't search SMS: ${e?.message ?? e}` });
    }
  };

  const y = Number(year);
  const errors = {
    reg: !REG_OK.test(reg) ? 'Enter a valid number, e.g. MH 12 AB 1234' : '',
    year: !(y >= 1980 && y <= new Date().getFullYear() + 1) ? 'Enter a valid year' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = () => {
    setTried(true);
    if (!valid) return;
    const vehicle: Vehicle = {
      id: existing?.id ?? uid('v'),
      regNo: reg,
      kind,
      fuel,
      make: make.trim(),
      model: model.trim(),
      year: y,
      insurer: insurer.trim() || 'Not added',
      insuranceExpiry,
      pucExpiry,
      serviceDue,
      fastagBalance: Number(fastag) || 0,
      challans,
    };
    dispatch(editing ? { type: 'updateVehicle', vehicle } : { type: 'addVehicle', vehicle });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padTop={false}>
        <View style={{ alignItems: 'center', marginBottom: space(6), marginTop: space(2) }}>
          <NumberPlate regNo={reg || 'XX 00 XX 0000'} big />
        </View>
        <Field label="Registration number" value={reg} onChangeText={(t) => setReg(formatReg(t))} autoCapitalize="characters" placeholder="KA 01 AB 1234" error={tried ? errors.reg : ''} />
        {regInfo && <Text style={[type.small, { marginTop: -8, marginBottom: space(3), color: colors.good }]}>{regInfo}</Text>}
        {Platform.OS === 'android' && (
          <View style={{ marginBottom: space(5) }}>
            <Button label={lookup.busy ? 'Searching your SMS…' : 'Find details in my SMS'} icon="search" variant="ghost" onPress={fillFromSms} disabled={!regValid || lookup.busy} />
            {lookup.busy && <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />}
            {lookup.note ? <Text style={[type.small, { marginTop: 8, color: lookup.ok ? colors.good : colors.warn }]}>{lookup.note}</Text> : null}
            <Text style={[type.tiny, { marginTop: 6 }]}>Looks for FASTag, challan and insurance messages about this number. Make and model aren't in SMS, so add those below.</Text>
          </View>
        )}
        <Text style={[type.small, { marginBottom: 8 }]}>Type</Text>
        <Chips options={KINDS} value={kind} onChange={setKind} />
        <Text style={[type.small, { marginBottom: 8 }]}>Fuel</Text>
        <Chips options={FUELS} value={fuel} onChange={setFuel} />
        <Field label="Make (optional)" value={make} onChangeText={setMake} placeholder="e.g. Maruti Suzuki" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 2 }}>
            <Field label="Model (optional)" value={model} onChangeText={setModel} placeholder="e.g. Swift" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Year" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" error={tried ? errors.year : ''} />
          </View>
        </View>

        <SectionHeader title="Reminders" />
        <Field label="Insurer" value={insurer} onChangeText={setInsurer} placeholder="e.g. ICICI Lombard" />
        <DateField label="Insurance expires (optional)" value={insuranceExpiry} onChange={setInsuranceExpiry} />
        <DateField label="PUC (pollution) expires (optional)" value={pucExpiry} onChange={setPucExpiry} />
        <DateField label="Next service (optional)" value={serviceDue} onChange={setServiceDue} />
        {challans.filter((c) => !c.paidOn).length > 0 && (
          <Text style={[type.small, { marginBottom: space(4), color: colors.warn }]}>
            {challans.filter((c) => !c.paidOn).length} unpaid challan(s) will be added: {inr(challans.filter((c) => !c.paidOn).reduce((n, c) => n + c.amount, 0))}
          </Text>
        )}
        <Field label="FASTag balance (₹)" value={fastag} onChangeText={(t) => setFastag(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
        <Button label={editing ? 'Save changes' : 'Add to garage'} onPress={save} style={{ marginTop: space(2) }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
