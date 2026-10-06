import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Txt } from './ui';

// Ô nhập có nhãn phía trên và dòng lỗi phía dưới; ô mật khẩu có nút hiện / ẩn. Màu, cỡ chữ, bo góc, vùng bấm theo bộ giao diện của cấp học.

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  /** Ô mật khẩu: che chữ và có nút hiện / ẩn. */
  password?: boolean;
  showLabel?: string;
  hideLabel?: string;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, error, password = false, showLabel = 'Hiện', hideLabel = 'Ẩn', ...rest }, ref) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <View
        style={[
          styles.box,
          {
            minHeight: theme.touchTarget + 4,
            borderRadius: theme.radius.control,
            borderColor: error ? theme.color.incorrect : theme.color.border,
            backgroundColor: theme.color.surface,
          },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.color.onSurfaceVariant}
          secureTextEntry={password && !revealed}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
          style={[styles.input, { color: theme.color.onBackground, fontSize: theme.text.controlSize + 1 }]}
        />
        {password ? (
          <Pressable accessibilityRole="button" accessibilityLabel={revealed ? hideLabel : showLabel} onPress={() => setRevealed((value) => !value)} style={styles.toggle}>
            <Text style={{ color: theme.color.primary, fontWeight: '700', fontSize: theme.text.controlSize }}>{revealed ? hideLabel : showLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt variant="caption" color={theme.color.incorrect} accessibilityRole="alert">
          {error}
        </Txt>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10 },
  toggle: { paddingHorizontal: 8, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
});
