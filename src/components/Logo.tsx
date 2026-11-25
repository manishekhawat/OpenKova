import React from 'react';
import { Image, Text, View } from 'react-native';
import { colors } from '../theme';

const mark = require('../../assets/logo-mark.png');

/** The Kova mark with the wordmark beside it. */
export function Logo({ size = 36, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Image source={mark} style={{ height: size, width: (size * 438) / 520 }} resizeMode="contain" />
      {wordmark && (
        <Text style={{ color: colors.ink, fontSize: size * 0.78, fontWeight: '800', letterSpacing: -0.5, marginLeft: size * 0.28, lineHeight: size }}>kova</Text>
      )}
    </View>
  );
}
