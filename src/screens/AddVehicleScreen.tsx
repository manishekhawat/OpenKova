import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, Chips, DateField, Field, Screen, SectionHeader } from '../components/ui';
import { useStore } from '../data/store';
import type { Vehicle } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { space, type } from '../theme';
import { addDays, uid } from '../utils/format';
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
  const [insuranceExpiry, setInsuranceExpiry] = useState<string | undefined>(existing?.insuranceExpiry ?? addDays(365));
  const [pucExpiry, setPucExpiry] = useState<string | undefined>(existing?.pucExpiry ?? addDays(180));
  const [serviceDue, setServiceDue] = useState<string | undefined>(existing?.serviceDue ?? addDays(90));
  const [fastag, setFastag] = useState(existing ? String(existing.fastagBalance) : '');
  const [tried, setTried] = useState(false);

  const y = Number(year);
  const errors = {
    reg: !REG_OK.test(reg) ? 'Enter a valid number, e.g. MH 12 AB 1234' : '',
    make: make.trim().length < 2 ? 'Enter the make' : '',
    model: model.trim().length < 1 ? 'Enter the model' : '',
    year: !(y >= 1980 && y <= new Date().getFullYear() + 1) ? 'Enter a valid year' : '',
    dates: !insuranceExpiry || !pucExpiry || !serviceDue ? 'Check the dates' : '',
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
      insuranceExpiry: insuranceExpiry!,
      pucExpiry: pucExpiry!,
      serviceDue: serviceDue!,
      fastagBalance: Number(fastag) || 0,
      challans: existing?.challans ?? [],
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
        <Text style={[type.small, { marginBottom: 8 }]}>Type</Text>
        <Chips options={KINDS} value={kind} onChange={setKind} />
        <Text style={[type.small, { marginBottom: 8 }]}>Fuel</Text>
        <Chips options={FUELS} value={fuel} onChange={setFuel} />
        <Field label="Make" value={make} onChangeText={setMake} placeholder="e.g. Maruti Suzuki" error={tried ? errors.make : ''} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 2 }}>
            <Field label="Model" value={model} onChangeText={setModel} placeholder="e.g. Swift" error={tried ? errors.model : ''} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Year" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" error={tried ? errors.year : ''} />
          </View>
        </View>

        <SectionHeader title="Reminders" />
        <Field label="Insurer" value={insurer} onChangeText={setInsurer} placeholder="e.g. ICICI Lombard" />
        <DateField label="Insurance expires" value={insuranceExpiry} onChange={setInsuranceExpiry} />
        <DateField label="PUC (pollution) expires" value={pucExpiry} onChange={setPucExpiry} />
        <DateField label="Next service" value={serviceDue} onChange={setServiceDue} />
        <Field label="FASTag balance (₹)" value={fastag} onChangeText={(t) => setFastag(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
        {tried && errors.dates ? <Text style={{ color: '#FF7A7A', marginBottom: 10 }}>{errors.dates}</Text> : null}
        <Button label={editing ? 'Save changes' : 'Add to garage'} onPress={save} style={{ marginTop: space(2) }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
