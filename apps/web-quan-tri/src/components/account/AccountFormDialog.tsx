import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Account, ApiResult, NewAccount, Role } from '@dsvhvn/dung-chung/api';
import { EMPTY_ACCOUNT, newAccountBody, validateNewAccount, type AccountField, type AccountValues } from './accountForm';
import { focusFirstInvalid, ROLE_LABEL, splitApiError } from '@dsvhvn/dung-chung';
import { Button, InlineMessage, Modal, TextField } from '@dsvhvn/dung-chung/ui';

// Biểu mẫu tài khoản (hộp thoại): quản trị trường tạo giáo viên từ Giáo viên của trường, quản trị hệ thống tạo quản
// trị trường từ Chi tiết trường. Vai trò cố định theo nơi mở, không có ô chọn vai trò. Lưu thì máy chủ tạo tài khoản
// với mật khẩu ngẫu nhiên không ai biết và gửi email đặt mật khẩu lần đầu hạn 48 giờ — câu "Đã gửi email…" trả về hiện
// ở toast của màn cha. Trùng email / tên đăng nhập (kể cả trùng mã học sinh): báo dưới đúng ô. Chạm hạn mức giáo viên
// hoặc trường không có gói hiệu lực: báo In line trong hộp thoại.

/** Các ô của một tài khoản mới; dùng trong Biểu mẫu tài khoản và trong biểu mẫu tạo trường (quản trị trường đầu tiên). */
export function AccountFields({
  values,
  errors,
  onChange,
}: {
  values: AccountValues;
  errors: Partial<Record<AccountField, string>>;
  onChange: (field: AccountField, value: string) => void;
}) {
  return (
    <>
      <TextField
        label="Họ và tên"
        name="fullName"
        autoComplete="off"
        value={values.fullName}
        onChange={(e) => onChange('fullName', e.target.value)}
        error={errors.fullName}
      />
      <TextField
        label="Tên đăng nhập"
        name="username"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={values.username}
        onChange={(e) => onChange('username', e.target.value)}
        error={errors.username}
        hint="3-50 ký tự: chữ không dấu, chữ số, dấu chấm, dấu gạch dưới."
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={values.email}
        onChange={(e) => onChange('email', e.target.value)}
        error={errors.email}
        hint="Liên kết đặt mật khẩu lần đầu được gửi tới email này."
      />
      <TextField
        label="Số điện thoại"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        value={values.phone}
        onChange={(e) => onChange('phone', e.target.value)}
        error={errors.phone}
        hint="Không bắt buộc."
      />
    </>
  );
}

interface AccountFormDialogProps {
  open: boolean;
  /** TEACHER khi mở từ Giáo viên của trường, ORG_ADMIN khi mở từ Chi tiết trường. */
  accountRole: Extract<Role, 'TEACHER' | 'ORG_ADMIN'>;
  /** Dòng mô tả dưới tiêu đề, ví dụ tên trường. */
  description?: ReactNode;
  onSubmit: (body: NewAccount) => Promise<ApiResult<Account>>;
  /** Tạo xong: `message` là câu "Đã gửi email đặt mật khẩu…" của máy chủ. */
  onCreated: (account: Account, message: string | null) => void;
  onClose: () => void;
}

export function AccountFormDialog({ open, accountRole, description, onSubmit, onCreated, onClose }: AccountFormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<AccountValues>(EMPTY_ACCOUNT);
  const [errors, setErrors] = useState<Partial<Record<AccountField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setValues(EMPTY_ACCOUNT);
    setErrors({});
    setFormError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateNewAccount(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await onSubmit(newAccountBody(values));
      reset();
      onCreated(data, message);
    } catch (err) {
      const failure = splitApiError<AccountField>(err, ['fullName', 'username', 'email', 'phone']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  const title = accountRole === 'TEACHER' ? 'Thêm giáo viên' : 'Thêm quản trị trường';

  return (
    <Modal open={open} title={title} description={description} size="panel" busy={saving} onClose={close}>
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <p className="type-body-s text-on-surface-variant">
          Vai trò: <span className="text-on-surface">{ROLE_LABEL[accountRole]}</span>
        </p>
        <AccountFields
          values={values}
          errors={errors}
          onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
        />
        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={close} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Tạo tài khoản
          </Button>
        </div>
      </form>
    </Modal>
  );
}
