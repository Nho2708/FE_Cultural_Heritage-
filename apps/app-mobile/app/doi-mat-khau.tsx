import {
  MESSAGES,
  PASSWORD_HINT,
  PASSWORD_RULES,
  SIMPLE_PASSWORD_HINT,
  SIMPLE_PASSWORD_RULES,
  checkPassword,
  collectErrors,
  isSimplePasswordValid,
  splitApiError,
  validatePasswordConfirmation,
  validateRequired,
  validateStudentNewPassword,
} from '@dsvhvn/dung-chung';
import { sessionFromLogin } from '@dsvhvn/dung-chung/auth';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '../src/components/Field';
import { Button, Notice, Screen, Txt } from '../src/components/ui';
import { useApp, useAuth } from '../src/state/AppProvider';
import { useTheme } from '../src/theme/ThemeProvider';

// Đổi mật khẩu của học sinh. Lần đầu đăng nhập và sau khi thầy cô đặt lại là chế độ bắt buộc: token chỉ cho đổi mật khẩu, không hỏi mật khẩu hiện tại, em không đi sang
// màn hình khác được. Đổi xong máy chủ trả token mới. Quy tắc theo cấp lớp của em: cấp 1 (khối 1-5) chỉ cần dài 6-64 ký tự (thầy cô phát mật khẩu 6 chữ số dễ nhớ);
// cấp 2, 3 dài 8-64 ký tự, có chữ hoa, chữ thường và chữ số.

type FieldName = 'currentPassword' | 'newPassword' | 'confirmNewPassword';

export default function ChangePassword() {
  const { services, mode } = useApp();
  const { session } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<FieldName, string>>({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (mode !== 'student' || !session) return <Redirect href="/" />;
  const user = session.user;
  const forced = user.mustChangePassword;
  const simple = user.schoolLevel === 1;
  const check = checkPassword(values.newPassword);
  // Danh sách điều kiện hiện dưới ô mật khẩu mới, tích dần khi em gõ đúng.
  const rules: Array<{ key: string; label: string; met: boolean }> = simple
    ? SIMPLE_PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, met: isSimplePasswordValid(values.newPassword) }))
    : PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, met: check[rule.key] }));
  const set = (field: FieldName) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    setFormError(null);
    const found = collectErrors<FieldName>({
      currentPassword: forced ? null : validateRequired(values.currentPassword, 'mật khẩu hiện tại'),
      newPassword: validateStudentNewPassword(values.newPassword, user.schoolLevel, 'mật khẩu mới'),
      confirmNewPassword: validatePasswordConfirmation(values.newPassword, values.confirmNewPassword),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const { data } = await services.studentApi.changePassword({
        currentPassword: forced ? null : values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });
      // Máy chủ trả access token mới (token cũ hết dùng) kèm hồ sơ; tắt cờ buộc đổi mật khẩu.
      services.sessionStore.setSession({ ...sessionFromLogin(data), user: { ...data.user, mustChangePassword: false } });
      router.replace('/');
    } catch (error) {
      const failure = splitApiError<FieldName>(error, ['currentPassword', 'newPassword', 'confirmNewPassword']);
      setErrors(failure.fields);
      setFormError(failure.form);
      setSaving(false);
    }
  };

  return (
    <Screen style={{ paddingTop: insets.top + 24 }}>
      <View style={{ gap: 6 }}>
        <Txt variant="heading" accessibilityRole="header">
          {forced ? t('hs.changePassword.titleForced', { name: user.fullName ?? 'em' }) : t('hs.changePassword.titleVoluntary')}
        </Txt>
        {forced ? <Txt muted>{t('hs.changePassword.hintForced')}</Txt> : null}
      </View>
      {forced ? <Notice text={MESSAGES.studentMustChangePassword} /> : null}
      {formError ? <Notice tone="error" text={formError} /> : null}
      {!forced ? (
        <Field
          label={t('hs.changePassword.current')}
          value={values.currentPassword}
          onChangeText={set('currentPassword')}
          password
          showLabel={t('hs.login.show')}
          hideLabel={t('hs.login.hide')}
          autoComplete="current-password"
          error={errors.currentPassword}
        />
      ) : null}
      <Field
        label={t('hs.changePassword.next')}
        value={values.newPassword}
        onChangeText={set('newPassword')}
        password
        showLabel={t('hs.login.show')}
        hideLabel={t('hs.login.hide')}
        autoComplete="new-password"
        error={errors.newPassword}
      />
      <View style={{ gap: 2 }}>
        <Txt variant="caption" muted>
          {simple ? SIMPLE_PASSWORD_HINT : PASSWORD_HINT}
        </Txt>
        {rules.map((rule) => (
          <Txt key={rule.key} variant="caption" color={rule.met ? theme.color.correct : theme.color.onSurfaceVariant}>
            {rule.met ? '✓ ' : '○ '}
            {rule.label}
          </Txt>
        ))}
      </View>
      <Field
        label={t('hs.changePassword.confirm')}
        value={values.confirmNewPassword}
        onChangeText={set('confirmNewPassword')}
        password
        showLabel={t('hs.login.show')}
        hideLabel={t('hs.login.hide')}
        autoComplete="new-password"
        error={errors.confirmNewPassword}
      />
      <Button label={forced ? t('hs.changePassword.submitForced') : t('hs.changePassword.submitVoluntary')} loading={saving} onPress={() => void submit()} full />
      {!forced ? <Button label={t('hs.changePassword.cancel')} variant="ghost" onPress={() => router.back()} /> : null}
    </Screen>
  );
}
