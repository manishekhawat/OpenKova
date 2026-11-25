export const colors = {
  bg: '#0A0A0C',
  surface: '#141418',
  surfaceHi: '#1C1C22',
  line: '#26262E',
  ink: '#F2F0EA',
  muted: '#8B8B96',
  faint: '#5A5A64',
  accent: '#9FB4FF',
  accentInk: '#0A0A0C',
  good: '#6FD9A8',
  warn: '#F5C26B',
  bad: '#FF7A7A',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28 };
export const space = (n: number) => n * 4;

export const type = {
  hero: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.8, color: colors.ink },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.ink },
  h3: { fontSize: 17, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  small: { fontSize: 13, color: colors.muted },
  tiny: { fontSize: 11, color: colors.faint, letterSpacing: 0.4 },
};
