// Kova's palette comes from Indian currency notes: the aubergine ink of the print, the note
// paper, the ₹100's lavender, the ₹200's turmeric and the ₹2000's magenta. Colour carries
// meaning (lavender = act, turmeric = due soon, magenta = overdue), never decoration.
export const colors = {
  bg: '#1B1830', // note ink
  surface: '#231F3B',
  surfaceHi: '#2C2748',
  line: '#38325A',
  ink: '#EEE8DC', // note paper
  muted: '#A39DB8',
  faint: '#6F6990',
  accent: '#B8A8F2', // ₹100 lavender
  accentInk: '#1B1830',
  good: '#86CFA9',
  warn: '#F0BE4A', // ₹200 turmeric
  bad: '#E25C9C', // ₹2000 magenta
};

// Anek Latin by Ek Type (Mumbai), cut from the variable font. The expanded cut is only for money.
export const fonts = {
  regular: 'Anek-Regular',
  medium: 'Anek-Medium',
  semibold: 'Anek-SemiBold',
  wide: 'Anek-ExpandedSemiBold',
};

export const fontFiles = {
  [fonts.regular]: require('../assets/fonts/AnekLatin-Regular.ttf'),
  [fonts.medium]: require('../assets/fonts/AnekLatin-Medium.ttf'),
  [fonts.semibold]: require('../assets/fonts/AnekLatin-SemiBold.ttf'),
  [fonts.wide]: require('../assets/fonts/AnekLatin-ExpandedSemiBold.ttf'),
};

// Radius follows hierarchy: physical cards are round, sheets less so, inputs least.
export const radius = { sm: 8, md: 12, lg: 16, xl: 22 };
export const space = (n: number) => n * 4;

// Scale: 13 / 15 / 17 / 22 / 28 / 40
export const type = {
  hero: { fontFamily: fonts.wide, fontSize: 40, lineHeight: 44, color: colors.ink },
  money: { fontFamily: fonts.wide, fontSize: 28, lineHeight: 32, color: colors.ink, fontVariant: ['tabular-nums' as const] },
  title: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 32, color: colors.ink },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20, color: colors.muted },
  tiny: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.faint },
};
