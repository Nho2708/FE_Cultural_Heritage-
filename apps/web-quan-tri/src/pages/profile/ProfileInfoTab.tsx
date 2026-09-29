import {
  MESSAGES,
  ROLE_LABEL,
  collectErrors,
  focusFirstInvalid,
  formatDate,
  formatDateTime,
  splitApiError,
  trimToNull,
  validateAvatarUrl,
  validateFullName,
  validateOptionalPhone,
} from '@dsvhvn/dung-chung';
import type { StaffProfile } from '@dsvhvn/dung-chung/api';
import { Blank, Button, InlineMessage, TextField, useToast } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { profileApi } from '../../lib/api/endpoints';
import { useAuth } from '../../lib/auth/context';

// Tab Thông tin của Hồ sơ cá nhân: sửa được họ tên, số điện thoại, ảnh đại diện; email, tên đăng nhập, vai trò, trường
// chỉ đọc (không đổi vai trò, không chuyển trường; email và tên đăng nhập do người tạo tài khoản đặt).

type Field = 'fullName' | 'phone' | 'avatarUrl';

const valuesOf = (user: StaffProfile): Record<Field, string> => ({
  fullName: user.fullName ?? '',
  phone: user.phone ?? '',
  avatarUrl: user.avatarUrl ?? '',
});

export function ProfileInfoTab({ user }: { user: StaffProfile }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(() => valuesOf(user));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = valuesOf(user);
  const dirty = (Object.keys(values) as Field[]).some((k) => values[k].trim() !== saved[k]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = collectErrors<Field>({
      fullName: validateFullName(values.fullName),
      phone: validateOptionalPhone(values.phone),
      avatarUrl: validateAvatarUrl(values.avatarUrl),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await profileApi.update({
        fullName: values.fullName.trim(),
        phone: trimToNull(values.phone),
        avatarUrl: trimToNull(values.avatarUrl),
      });
      updateUser(data);
      setValues(valuesOf(data));
      toast.success(message ?? MESSAGES.success('Lưu hồ sơ'));
    } catch (err) {
      const failure = splitApiError<Field>(err, ['fullName', 'phone', 'avatarUrl']);
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
    <div className="flex flex-col gap-10 dsvmd:flex-row dsvmd:items-start">
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex w-full max-w-[480px] flex-col gap-6">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <TextField
          label="Họ và tên"
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={set('fullName')}
          error={errors.fullName}
        />
        <TextField
          label="Số điện thoại"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={set('phone')}
          error={errors.phone}
          hint="Không bắt buộc."
        />
        <TextField
          label="Ảnh đại diện (đường dẫn)"
          name="avatarUrl"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={values.avatarUrl}
          onChange={set('avatarUrl')}
          error={errors.avatarUrl}
          hint="Không bắt buộc. Đường dẫn http hoặc https tới ảnh."
        />
        <div>
          <Button type="submit" size="lg" loading={saving} disabled={!dirty}>
            Lưu thay đổi
          </Button>
        </div>
      </form>

      <dl className="grid w-full max-w-[360px] grid-cols-[max-content_1fr] gap-x-6 gap-y-3 rounded-md bg-surface-container-low p-6 type-body-s">
        <dt className="text-on-surface-variant">Email</dt>
        <dd className="break-all text-on-surface">{user.email ?? <Blank />}</dd>
        <dt className="text-on-surface-variant">Tên đăng nhập</dt>
        <dd className="break-all text-on-surface">{user.username ?? <Blank />}</dd>
        <dt className="text-on-surface-variant">Vai trò</dt>
        <dd className="text-on-surface">{ROLE_LABEL[user.role]}</dd>
        {user.organization && (
          <>
            <dt className="text-on-surface-variant">Trường</dt>
            <dd className="text-on-surface">{user.organization.name}</dd>
          </>
        )}
        {user.lastLoginAt && (
          <>
            <dt className="text-on-surface-variant">Đăng nhập gần nhất</dt>
            <dd className="text-on-surface">{formatDateTime(user.lastLoginAt)}</dd>
          </>
        )}
        {user.createdAt && (
          <>
            <dt className="text-on-surface-variant">Ngày tạo tài khoản</dt>
            <dd className="text-on-surface">{formatDate(user.createdAt)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
