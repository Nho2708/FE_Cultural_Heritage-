import {
  MESSAGES,
  PASSWORD_HINT,
  collectErrors,
  focusFirstInvalid,
  splitApiError,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRequired,
} from '@dsvhvn/dung-chung';
import { Button, InlineMessage, PasswordField, useToast } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { profileApi } from '../../lib/api/endpoints';
import { useAuth } from '../../lib/auth/context';

// Tab Đổi mật khẩu của Hồ sơ cá nhân: phải nhập đúng mật khẩu hiện tại; mật khẩu mới đạt quy tắc mật khẩu và khác mật
// khẩu hiện tại. Máy chủ làm mọi access token cũ hết dùng được (máy khác phải đăng nhập lại) và cấp access token mới
// cho phiên đang dùng. Lỗi của máy chủ (sai mật khẩu hiện tại, mật khẩu mới trùng mật khẩu cũ) hiện dưới đúng ô.

type Field = 'currentPassword' | 'newPassword' | 'confirmPassword';

const EMPTY: Record<Field, string> = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordTab() {
  const { replaceToken } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = collectErrors<Field>({
      currentPassword: validateRequired(values.currentPassword, 'mật khẩu hiện tại'),
      newPassword: validateNewPassword(values.newPassword, 'mật khẩu mới'),
      confirmPassword: validatePasswordConfirmation(values.newPassword, values.confirmPassword),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await profileApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      replaceToken(data);
      setValues(EMPTY);
      toast.success(message ?? MESSAGES.success('Đổi mật khẩu'));
    } catch (err) {
      const failure = splitApiError<Field>(err, ['currentPassword', 'newPassword']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex max-w-[480px] flex-col gap-6">
      {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
      <PasswordField
        label="Mật khẩu hiện tại"
        name="currentPassword"
        autoComplete="current-password"
        value={values.currentPassword}
        onChange={set('currentPassword')}
        error={errors.currentPassword}
      />
      <PasswordField
        label="Mật khẩu mới"
        name="newPassword"
        autoComplete="new-password"
        value={values.newPassword}
        onChange={set('newPassword')}
        error={errors.newPassword}
        hint={PASSWORD_HINT}
      />
      <PasswordField
        label="Nhập lại mật khẩu mới"
        name="confirmPassword"
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={set('confirmPassword')}
        error={errors.confirmPassword}
      />
      <div>
        <Button type="submit" size="lg" loading={saving}>
          Đổi mật khẩu
        </Button>
      </div>
    </form>
  );
}
