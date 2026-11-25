import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, Chips, Field, Screen } from '../components/ui';
import { useStore } from '../data/store';
import type { Vehicle } from '../data/types';
import type { RootStackParamList } from '../navigation';
import { space, type } from '../theme';
import { addDays, uid } from '../utils/format';
import { NumberPlate } from './GarageScreen';

const KINDS = ['Car', 'Bike'] as const;
const FUELS = ['Petrol', 'Diesel', 'CNG', 'Electric'] as const;

// Indian registration format, e.g. KA 03 MN 4521 / DL 3C AB 1234 / 22 BH 1234 AA
function formatReg(raw: string) {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bh = s.match(/^(\d{2})(BH)(\d{0,4})([A-Z]{0,2})$/);
  if (bh) return [bh[1], bh[2], bh[3], bh[4]].filter(Boolean).join(' ');
  const m =s.match(/^([A-Z]{2})(\d{1,2}[A-Z]?)([A-Z]{0,3})(\d{0,4})$/);
  if (!m) return s;
  return [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ');
}
const REG_OK = /^[A-Z]{2} \d{1,2}[A-Z]? [A-Z]{1,3} \d{4}$|^\d{2} BH \d{4} [A-Z]{1,2}$/;

type Props = NativeStackScreenProps<RootStackParamList, 'AddVehicle'>;

export default function AddVehicleScreen({ navigation }: Props) {
  const { dispatch } = useStore();
  const [reg, setReg] = useState('');
  const [kind, setKind] = useState<Vehicle['kind']>('Car');
  const [fuel, setFuel] = useState<Vehicle['fuel']>('Petrol');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [tried, setTried] = useState(false);

  const errors = {
    reg: !REG_OK.test(reg) ? 'Enter a valid number, e.g. MH 12 AB 1234' : '',
    make: make.trim().length < 2 ? 'Enter the make' : '',
    model: model.trim().length < 1 ? 'Enter the model' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const save = () => {
    setTried(true);
    if (!valid) return;
    // A live version would look these up from VAHAN / insurer / FASTag issuer APIs using the reg number.
    dispatch({
      type: 'addVehicle',
      vehicle: {
        id: uid('v'),
        regNo: reg,
        kind,
        fuel,
        make: make.trim(),
        model: model.trim(),
        year: new Date().getFullYear(),
        insurer: 'Not added',
        insuranceExpiry: addDays(300),
        pucExpiry: addDays(150),
        serviceDue: addDays(90),
        fastagBalance: 0,
        challans: [],
      },
    });
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
        <Field label="Model" value={model} onChangeText={setModel} placeholder="e.g. Swift" error={tried ? errors.model : ''} />
        <Button label="Add to garage" onPress={save} style={{ marginTop: space(2) }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
