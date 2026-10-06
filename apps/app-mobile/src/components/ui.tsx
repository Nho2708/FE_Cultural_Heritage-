import type { LearningTheme } from '@dsvhvn/dung-chung/theme';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

// Bộ thành phần giao diện của app: mọi màu, cỡ chữ, bo góc, vùng bấm đọc từ bộ token theo cấp học (useTheme), nên cùng một thành phần hiện khác nhau ở
// khách, cấp 1, cấp 2, cấp 3.

export type TextVariant = 'body' | 'heading' | 'title' | 'caption' | 'label' | 'question';

export function textStyle(theme: LearningTheme, variant: TextVariant): TextStyle {
  const { text, color } = theme;
  switch (variant) {
    case 'heading':
      return { fontSize: text.headingSize, lineHeight: text.headingLineHeight, fontWeight: '700', color: color.onBackground };
    case 'title':
      return { fontSize: text.bodySize + 2, lineHeight: text.bodyLineHeight + 2, fontWeight: '700', color: color.onBackground };
    case 'question':
      return { fontSize: text.questionSize, lineHeight: text.questionLineHeight, fontWeight: '600', color: color.onBackground };
    case 'caption':
      return { fontSize: Math.max(12, text.bodySize - 3), lineHeight: Math.max(16, text.bodyLineHeight - 6), color: color.onSurfaceVariant };
    case 'label':
      return { fontSize: text.controlSize, lineHeight: text.controlLineHeight, fontWeight: '600', color: color.onBackground };
    default:
      return { fontSize: text.bodySize, lineHeight: text.bodyLineHeight, color: color.onBackground };
  }
}

interface TxtProps extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
}

export function Txt({ variant = 'body', muted = false, color, style, ...rest }: TxtProps) {
  const theme = useTheme();
  const base = textStyle(theme, variant);
  return <Text {...rest} style={[base, muted ? { color: theme.color.onSurfaceVariant } : null, color ? { color } : null, style]} />;
}

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Bỏ phần đệm ngang (màn hình có nội dung tràn mép như bản đồ). */
  flush?: boolean;
  /** Không đệm phía trên (màn hình đã có thanh tiêu đề của điều hướng). */
  noTopInset?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = true, flush = false, noTopInset = true, style }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = flush ? 0 : theme.spacing.inline;
  const container: ViewStyle = { flex: 1, backgroundColor: theme.color.background, paddingTop: noTopInset ? 0 : insets.top };
  if (!scroll) {
    return <View style={[container, { paddingHorizontal: padding }, style]}>{children}</View>;
  }
  return (
    // Bàn phím iOS không đẩy nội dung lên như Android nên cần đệm khi gõ ở ô nhập (đăng nhập, nhập mã).
    <KeyboardAvoidingView style={container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[{ padding, paddingBottom: padding + Math.max(insets.bottom, 12), gap: theme.spacing.block }, style]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Section({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.inline / 1.5 }}>
      {title || right ? (
        <View style={styles.row}>
          {title ? (
            <Txt variant="title" accessibilityRole="header" style={styles.grow}>
              {title}
            </Txt>
          ) : null}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}

export function Button({ label, variant = 'primary', loading = false, disabled, icon, style, full = false, ...rest }: ButtonProps) {
  const theme = useTheme();
  const { color, radius, touchTarget, text } = theme;
  const inactive = disabled || loading;
  const palette = {
    primary: { bg: color.primary, fg: color.onPrimary, border: color.primary },
    secondary: { bg: color.surface, fg: color.primary, border: color.primary },
    ghost: { bg: 'transparent', fg: color.primary, border: 'transparent' },
    danger: { bg: color.incorrect, fg: '#FFFFFF', border: color.incorrect },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: touchTarget,
          borderRadius: radius.control,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : null}
      <Text style={{ color: palette.fg, fontSize: text.controlSize, lineHeight: text.controlLineHeight, fontWeight: '700', textAlign: 'center' }}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  const box: ViewStyle = {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  };
  if (!onPress) return <View style={[box, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [box, pressed ? { opacity: 0.85 } : null, style]}>
      {children}
    </Pressable>
  );
}

export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  const { color, radius, text } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        {
          minHeight: Math.max(36, theme.touchTarget - 8),
          borderRadius: Math.max(radius.control, 16),
          backgroundColor: selected ? color.primary : color.surface,
          borderColor: selected ? color.primary : color.border,
        },
      ]}
    >
      <Text style={{ color: selected ? color.onPrimary : color.onBackground, fontSize: Math.max(13, text.controlSize - 1), fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** Nhãn nhỏ (bản dịch máy, loại di sản…). */
export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'warning' | 'success' }) {
  const theme = useTheme();
  const { color } = theme;
  const palette =
    tone === 'warning'
      ? { bg: color.incorrectContainer, fg: color.onIncorrectContainer }
      : tone === 'success'
        ? { bg: color.correctContainer, fg: color.onCorrectContainer }
        : { bg: color.accent, fg: color.onAccent };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderRadius: theme.radius.control }]}>
      <Text style={{ color: palette.fg, fontSize: 12, lineHeight: 16, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'info' }: { text: string; tone?: 'info' | 'error' }) {
  const theme = useTheme();
  const { color } = theme;
  const palette = tone === 'error' ? { bg: color.incorrectContainer, fg: color.onIncorrectContainer } : { bg: color.primaryContainer, fg: color.onPrimaryContainer };
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: palette.bg, borderRadius: theme.radius.card, padding: theme.spacing.inline }}>
      <Text style={{ color: palette.fg, fontSize: theme.text.bodySize - 1, lineHeight: theme.text.bodyLineHeight - 2 }}>{text}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={theme.color.primary} />
      {label ? (
        <Txt muted style={styles.centerText}>
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Txt style={styles.centerText}>{message}</Txt>
      {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} style={styles.centerButton} /> : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Txt muted style={styles.centerText}>
        {message}
      </Txt>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: theme.color.border }} />;
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1.5, justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  centerText: { textAlign: 'center' },
  centerButton: { alignSelf: 'center' },
});
