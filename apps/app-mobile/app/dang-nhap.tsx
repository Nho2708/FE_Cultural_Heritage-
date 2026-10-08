import { MESSAGES, collectErrors, normalizeCode, splitApiError, validateRequired, validateStudentCodeInput } from '@dsvhvn/dung-chung';
import { ApiError, ERROR_CODES } from '@dsvhvn/dung-chung/api';
import { sessionFromLogin } from '@dsvhvn/dung-chung/auth';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from '../src/components/Field';
import { Button, Notice, Screen, Txt } from '../src/components/ui';
import { useApp, useAuth } from '../src/state/AppProvider';

// Học sinh đăng nhập bằng mã học sinh + mật khẩu (cùng API với web học tập). Sai mã hoặc mật khẩu luôn cùng một câu, không cho biết sai ô nào; tạm khóa, bị vô hiệu,
// lớp đã xóa báo theo câu của máy chủ. Không có "quên mật khẩu qua email": em nhờ thầy cô đặt lại. Token lưu bằng SecureStore (Keychain / Keystore), không lưu mật khẩu.

type FieldName = 'studentCode' | 'password';

/** Cửa đăng nhập không cần token nên không bao giờ trả "không có quyền" hay 404 một cách hợp lệ: gặp hai trường hợp này thì báo lỗi hệ thống. */
function unexpectedLoginError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.code === ERROR_CODES.forbidden);
}

export default function StudentLogin() {
  const { services, mode, chooseMode } = useApp();
  const { session, notice } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (mode !== 'student') return <Redirect href="/" />;
  if (session) return <Redirect href="/" />;

  const submit = async () => {
    services.sessionStore.clearNotice();
    setFormError(null);
    const found = collectErrors<FieldName>({
      studentCode: validateStudentCodeInput(studentCode),
      password: validateRequired(password, 'mật khẩu'),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const { data } = await services.studentApi.login({ studentCode: normalizeCode(studentCode), password });
      services.sessionStore.setSession(sessionFromLogin(data));
      router.replace('/');
    } catch (error) {
      const failure = splitApiError<FieldName>(error, ['studentCode', 'password']);
      setErrors(failure.fields);
      setFormError(unexpectedLoginError(error) ? MESSAGES.systemError : failure.form);
      setPassword('');
      setSubmitting(false);
    }
  };

  const message = formError ?? notice;

  return (
    <Screen style={{ paddingTop: insets.top + 24 }}>
      <View style={{ gap: 6 }}>
        <Txt variant="heading" accessibilityRole="header">
          {t('hs.login.title')}
        </Txt>
        <Txt muted>{t('hs.login.subtitle')}</Txt>
      </View>
      {message ? <Notice tone="error" text={message} /> : null}
      <Field
        label={t('hs.login.codeLabel')}
        value={studentCode}
        onChangeText={(value) => setStudentCode(normalizeCode(value))}
        placeholder={t('hs.login.codePlaceholder')}
        autoCapitalize="characters"
        textContentType="username"
        autoComplete="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.studentCode}
      />
      <Field
        ref={passwordRef}
        label={t('hs.login.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        password
        showLabel={t('hs.login.show')}
        hideLabel={t('hs.login.hide')}
        textContentType="password"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        error={errors.password}
      />
      <Txt muted>{MESSAGES.studentForgotPassword}</Txt>
      <Button label={t('hs.login.submit')} loading={submitting} onPress={() => void submit()} full />
      <Txt variant="caption" muted>
        {t('hs.login.teacherNote')}
      </Txt>
      <Button
        label={t('hs.login.visitorMode')}
        variant="ghost"
        onPress={() => {
          chooseMode('guest');
          router.replace('/');
        }}
      />
    </Screen>
  );
}
