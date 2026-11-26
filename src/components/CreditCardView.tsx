import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CreditCard } from '../data/types';
import { colors, fonts, radius } from '../theme';
import { dueLabel, inr } from '../utils/format';

export function CreditCardView({ card, onPress, compact }: { card: CreditCard; onPress?: () => void; compact?: boolean }) {
  const paid = card.outstanding === 0;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [pressed && { transform: [{ scale: 0.985 }] }]}>
      <LinearGradient colors={card.palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, compact && { aspectRatio: 1.9 }]}>
        <View style={s.top}>
          <View>
            <Text style={s.bank}>{card.bank}</Text>
            <Text style={s.product}>{card.name}</Text>
          </View>
          <View style={s.chip} />
        </View>

        <View style={{ flex: 1 }} />

        <View style={s.bottom}>
          <View>
            <Text style={s.label}>{paid ? 'Nothing due' : 'Due'}</Text>
            <Text style={s.amount}>{paid ? inr(0) : inr(card.outstanding)}</Text>
            {!paid && <Text style={s.due}>{dueLabel(card.dueDate)}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.number}>•••• {card.last4}</Text>
            {card.network !== 'Other' && <Text style={s.network}>{card.network}</Text>}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    aspectRatio: 1.586,
    borderRadius: radius.xl,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bank: { color: colors.ink, fontSize: 16, fontFamily: fonts.semibold },
  product: { color: 'rgba(238,232,220,0.6)', fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },
  chip: { width: 36, height: 27, borderRadius: 6, backgroundColor: '#C9B37E', opacity: 0.85 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { color: 'rgba(238,232,220,0.6)', fontSize: 13, fontFamily: fonts.regular },
  amount: { color: colors.ink, fontSize: 24, fontFamily: fonts.wide, marginTop: 2, fontVariant: ['tabular-nums'] },
  due: { color: colors.warn, fontSize: 13, fontFamily: fonts.regular, marginTop: 2 },
  number: { color: colors.ink, fontSize: 15, fontFamily: fonts.medium, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  network: { color: 'rgba(238,232,220,0.75)', fontSize: 13, fontFamily: fonts.semibold, marginTop: 4 },
});
