import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, space, type } from '../theme';

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

/**
 * A group of rows. Flush on the page by default (rows carry their own dividers);
 * `boxed` is for things that are a distinct object, like a confirmation or a form inside a page.
 */
export function Surface({ children, style, boxed }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; boxed?: boolean }) {
  return <View style={[boxed ? styles.sheet : styles.flush, style]}>{children}</View>;
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
        primary ? { backgroundColor: colors.accent } : { borderColor: variant === 'danger' ? colors.bad + '66' : colors.line, borderWidth: 1 },
        (disabled || loading) && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
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
          <Text style={{ color: colors.accent, fontSize: 14, fontFamily: fonts.semibold }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function IconBadge({ name, color = colors.ink, bg = 'transparent', size = 40 }: { name: IconName; color?: string; bg?: string; size?: number }) {
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
      <Ionicons name={icon} size={22} color={iconColor ?? colors.muted} style={{ width: 26 }} />
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
        {right ? <Text style={[type.body, { fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] }]}>{right}</Text> : null}
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
      {error ? <Text style={[type.tiny, { color: colors.bad, marginTop: 4 }]}>{error}</Text> : null}
    </View>
  );
}

/** DD-MM-YYYY text input; calls onChange with an ISO date, or undefined when empty or not a valid date yet. */
export function DateField({ label, value, onChange, error }: { label: string; value?: string; onChange: (iso: string | undefined) => void; error?: string }) {
  const [text, setText] = React.useState(value ? toDMY(value) : '');
  // Follow changes made from outside (e.g. details filled in from SMS).
  React.useEffect(() => {
    if (value && toDMY(value) !== text) setText(toDMY(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const complete = /^\d{2}-\d{2}-\d{4}$/.test(text);
  const invalid = text.length > 0 && complete && !value;
  return (
    <Field
      label={label}
      value={text}
      placeholder="DD-MM-YYYY"
      keyboardType="number-pad"
      maxLength={10}
      error={error || (invalid ? "That date doesn't exist" : undefined)}
      onChangeText={(t) => {
        const digits = t.replace(/\D/g, '').slice(0, 8);
        const formatted = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('-');
        setText(formatted);
        const m = formatted.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!m) return onChange(undefined);
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12);
        onChange(d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d.toISOString() : undefined);
      }}
    />
  );
}

export function toDMY(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

export function ToggleRow({ title, subtitle, value, onChange, disabled, last }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; last?: boolean }) {
  return (
    <View style={[styles.listRow, !last && styles.divider, disabled && { opacity: 0.5 }]}>
      <View style={{ flex: 1, marginRight: space(3) }}>
        <Text style={type.body}>{title}</Text>
        {subtitle ? <Text style={[type.small, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.accent }}
        thumbColor={colors.ink}
      />
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
            <Text style={{ color: on ? colors.accentInk : colors.ink, fontSize: 13, fontFamily: fonts.semibold }}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: color + '22', alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 12, fontFamily: fonts.semibold }}>{label}</Text>
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
  flush: {},
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(4) },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(5) },
  btnText: { fontSize: 16, fontFamily: fonts.semibold },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(3.5), minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  input: {
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 17,
    paddingHorizontal: space(4),
  },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
});
