import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, Text, View } from 'react-native';
import { cancelNfc, cardScanAvailable, nfcState, readCardNfc, recognizeCard } from '../../modules/kova-card';
import { guessFromOcr, networkFromAid, networkFromIin, type CardGuess } from '../cards/cardDetails';
import { detectBank } from '../sms/parse';
import { colors, radius, space, type } from '../theme';
import { Button } from './ui';

/** Two buttons: read a card from a photo, or by tapping it on the phone (NFC). */
export function CardScanner({ onResult }: { onResult: (g: CardGuess, source: 'photo' | 'nfc') => void }) {
  const [busy, setBusy] = useState<'' | 'photo' | 'nfc'>('');
  const [error, setError] = useState('');
  const [nfc, setNfc] = useState<'unsupported' | 'disabled' | 'ready'>('unsupported');

  useEffect(() => {
    try {
      setNfc(nfcState());
    } catch {
      setNfc('unsupported');
    }
  }, []);

  if (!cardScanAvailable) return null;

  const fromPhoto = async (useCamera: boolean) => {
    setError('');
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return setError('Allow camera access to scan a card.');
      }
      const res = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy('photo');
      const ocr = await recognizeCard(res.assets[0].uri);
      const g = guessFromOcr(ocr.lines, ocr.last4, ocr.iin);
      if (!g.last4 && !g.bank && !g.network) setError("Couldn't read that card. Try a sharper photo of the side with the number, in good light.");
      else onResult(g, 'photo');
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy('');
    }
  };

  const fromNfc = async () => {
    setError('');
    const state = nfcState();
    setNfc(state);
    if (state === 'disabled') return setError('NFC is off. Turn it on in Settings → Connections → NFC.');
    setBusy('nfc');
    try {
      const r = await readCardNfc(30000);
      onResult(
        {
          last4: r.last4,
          network: networkFromAid(r.aid) ?? networkFromIin(r.iin),
          bank: r.label ? detectBank(undefined, r.label) : undefined,
          expiry: r.expiryYear && r.expiryMonth ? { year: r.expiryYear, month: r.expiryMonth } : undefined,
        },
        'nfc',
      );
    } catch (e: any) {
      if (!/cancel/i.test(String(e?.message))) setError(String(e?.message ?? e));
    } finally {
      setBusy('');
    }
  };

  return (
    <View style={{ marginBottom: space(5) }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Tile icon="camera-outline" label="Scan photo" onPress={() => fromPhoto(true)} disabled={!!busy} />
        <Tile icon="images-outline" label="From gallery" onPress={() => fromPhoto(false)} disabled={!!busy} />
        {nfc !== 'unsupported' && <Tile icon="radio-outline" label="Tap card" onPress={fromNfc} disabled={!!busy} />}
      </View>
      {busy === 'photo' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space(3) }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[type.small, { marginLeft: 8 }]}>Reading the card…</Text>
        </View>
      )}
      {error ? <Text style={{ color: colors.warn, marginTop: space(3), lineHeight: 20 }}>{error}</Text> : null}
      {error.startsWith('NFC is off') && <Button label="Open NFC settings" variant="ghost" onPress={() => Linking.sendIntent('android.settings.NFC_SETTINGS').catch(() => Linking.openSettings())} style={{ marginTop: space(3) }} />}
      <Text style={[type.tiny, { marginTop: space(3) }]}>
        Read on this phone only. Kova keeps the last 4 digits, bank and network; the full number, CVV and expiry are never saved.
      </Text>

      <Modal visible={busy === 'nfc'} transparent animationType="fade" onRequestClose={() => cancelNfc()}>
        <View style={{ flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space(8), alignItems: 'center' }}>
            <Ionicons name="radio-outline" size={44} color={colors.accent} />
            <Text style={[type.title, { marginTop: space(4) }]}>Hold your card to the phone</Text>
            <Text style={[type.small, { marginTop: space(2), textAlign: 'center', lineHeight: 20 }]}>
              Place it flat against the back, near the camera, and keep it still for a second.
            </Text>
            <ActivityIndicator color={colors.accent} style={{ marginTop: space(6) }} />
            <Button label="Cancel" variant="ghost" onPress={() => cancelNfc()} style={{ marginTop: space(6), alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Tile({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { flex: 1, alignItems: 'center', paddingVertical: space(4), borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.accent} />
      <Text style={[type.small, { marginTop: 6, color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}
