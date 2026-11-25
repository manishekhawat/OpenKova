import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  padTop = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padTop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const style = { paddingTop: padTop ? insets.top + space(3) : space(3), paddingHorizontal: space(5), paddingBottom: space(10) };
  if (!scroll) return <View style={[styles.screen, style]}>{children}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={style} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const primary = variant === 'primary';
  const fg = primary ? colors.accentInk : variant === 'danger' ? colors.bad : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        primary ? { backgroundColor: colors.accent } : { backgroundColor: colors.surfaceHi, borderColor: colors.line, borderWidth: 1 },
        (disabled || loading) && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', marginTop: space(7), marginBottom: space(3) }]}>
      <Text style={type.h3}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={12}>
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function IconBadge({ name, color = colors.ink, bg = colors.surfaceHi, size = 40 }: { name: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.48} color={color} />
    </View>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  rightSub,
  rightSubColor,
  onPress,
  last,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: string;
  rightSub?: string;
  rightSubColor?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, !last && styles.divider, pressed && { opacity: 0.6 }]}
    >
      <IconBadge name={icon} color={iconColor} />
      <View style={{ flex: 1, marginLeft: space(3) }}>
        <Text style={type.body} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.small, { marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: space(2) }}>
        {right ? <Text style={[type.body, { fontWeight: '600', fontVariant: ['tabular-nums'] }]}>{right}</Text> : null}
        {rightSub ? <Text style={[type.small, { marginTop: 2, color: rightSubColor ?? colors.muted }]}>{rightSub}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: space(4) }}>
      {label ? <Text style={[type.small, { marginBottom: 6 }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        selectionColor={colors.accent}
        {...props}
        style={[styles.input, error ? { borderColor: colors.bad } : null, props.style]}
      />
      {error ? <Text style={{ color: colors.bad, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap', gap: 8, marginBottom: space(4) }]}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[styles.chip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}
          >
            <Text style={{ color: on ? colors.accentInk : colors.ink, fontSize: 13, fontWeight: '600' }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: color + '22', alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space(8) }}>
      <Ionicons name={icon} size={28} color={colors.faint} />
      <Text style={[type.small, { marginTop: 8, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  surface: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(5) },
  btnText: { fontSize: 16, fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3) },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: space(4),
  },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
});
