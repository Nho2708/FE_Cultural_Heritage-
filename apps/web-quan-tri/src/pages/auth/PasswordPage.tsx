import {
  MESSAGES,
  PASSWORD_HINT,
  collectErrors,
  focusFirstInvalid,
  formatDateTime,
  splitApiError,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
} from '@dsvhvn/dung-chung';
import { ApiError, ERROR_CODES, errorMessage } from '@dsvhvn/dung-chung/api';
import { Button, ButtonLink, InlineMessage, LoadingState, PasswordField, TextField, TextLink, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { AUTH_PHOTOS } from '../../components/layout/authPhotos';
import { authApi } from '../../lib/api/endpoints';

// Màn hình Quên và đặt mật khẩu — một màn hình hai trạng thái, chỉ cho tài khoản có email (người lớn; học sinh quên mật
// khẩu thì giáo viên đặt lại):
//   /quen-mat-khau              trạng thái 1: nhập email, luôn nhận cùng một câu dù email có thuộc tài khoản nào hay không.
//   /dat-mat-khau?token=…       trạng thái 2: mở từ liên kết trong thư, dùng chung cho tài khoản mới (48 giờ) và quên
//                               mật khẩu (30 phút), tiêu đề chung "Đặt mật khẩu".
// Liên kết hết hạn, đã dùng hoặc đã bị thay: báo lỗi kèm nút "Gửi lại liên kết" về trạng thái 1. Đặt xong không tự đăng
// nhập: về màn hình Đăng nhập với tên đăng nhập điền sẵn.

const isLinkInvalid = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === ERROR_CODES.passwordLinkInvalid;

function RequestLinkForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateEmail(email);
    setError(found);
    if (found) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      const { message } = await authApi.forgotPassword(email.trim());
      setSentMessage(message ?? MESSAGES.forgotPasswordAccepted);
    } catch (err) {
      const failure = splitApiError<'email'>(err, ['email']);
      setError(failure.fields.email ?? null);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      photo={AUTH_PHOTOS.recovery}
      title="Quên mật khẩu"
      subtitle="Nhập email của tài khoản để nhận liên kết đặt lại mật khẩu."
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {sentMessage && <InlineMessage tone="success">{sentMessage}</InlineMessage>}
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {sentMessage ? 'Gửi lại liên kết' : 'Gửi liên kết'}
        </Button>
        <p className="text-center type-body-s text-on-surface-variant">
          Đã nhớ mật khẩu? <TextLink to={pathOf('login')}>Đăng nhập</TextLink>
        </p>
      </form>
    </AuthLayout>
  );
}

/** Liên kết không dùng được và lối ra duy nhất: yêu cầu liên kết mới ở trạng thái 1 (người tạo tài khoản không gửi lại được). */
function InvalidLink({ message }: { message: string }) {
  return (
    <AuthLayout photo={AUTH_PHOTOS.setPassword} title="Đặt mật khẩu">
      <InlineMessage
        tone="danger"
        action={
          <ButtonLink to={pathOf('password')} replace variant="secondary">
            Gửi lại liên kết
          </ButtonLink>
        }
      >
        {message}
      </InlineMessage>
    </AuthLayout>
  );
}

type SetField = 'newPassword' | 'confirmPassword';

function SetPasswordForm({ token, username, expiresAt }: { token: string; username: string; expiresAt: string | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Record<SetField, string>>({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<SetField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = collectErrors<SetField>({
      newPassword: validateNewPassword(values.newPassword, 'mật khẩu mới'),
      confirmPassword: validatePasswordConfirmation(values.newPassword, values.confirmPassword),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      const { message } = await authApi.setPassword({ token, newPassword: values.newPassword });
      toast.success(message ?? MESSAGES.success('Đặt mật khẩu'));
      navigate(pathOf('login'), { replace: true, state: { login: username } });
    } catch (err) {
      setSubmitting(false);
      if (isLinkInvalid(err)) {
        setLinkInvalid(err.message);
        return;
      }
      const failure = splitApiError<SetField>(err, ['newPassword']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    }
  };

  if (linkInvalid) return <InvalidLink message={linkInvalid} />;

  const set = (field: SetField) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  return (
    <AuthLayout
      photo={AUTH_PHOTOS.setPassword}
      title="Đặt mật khẩu"
      subtitle={
        expiresAt
          ? `Đặt mật khẩu cho tài khoản ${username}. Liên kết dùng được một lần, đến ${formatDateTime(expiresAt)}.`
          : `Đặt mật khẩu cho tài khoản ${username}. Liên kết dùng được một lần.`
      }
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        {/* Trình quản lý mật khẩu cần biết tên đăng nhập đi kèm mật khẩu mới. */}
        <TextField label="Tên đăng nhập" name="username" autoComplete="username" value={username} readOnly />
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
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Đặt mật khẩu
        </Button>
        <p className="text-center type-body-s text-on-surface-variant">
          <TextLink to={pathOf('login')}>Quay lại đăng nhập</TextLink>
        </p>
      </form>
    </AuthLayout>
  );
}

/** Trạng thái 2: kiểm liên kết trước khi hiện ô nhập mật khẩu. */
function SetPasswordState({ token }: { token: string }) {
  const check = useQuery({
    queryKey: ['password-token', token],
    queryFn: () => authApi.checkPasswordToken(token).then((r) => r.data),
    staleTime: Infinity,
    gcTime: 0,
  });

  if (check.isPending) {
    return (
      <AuthLayout photo={AUTH_PHOTOS.setPassword} title="Đặt mật khẩu">
        <LoadingState rows={2} label="Đang kiểm tra liên kết…" />
      </AuthLayout>
    );
  }
  if (check.isError) {
    const error = check.error;
    // Liên kết không dùng được là kết quả nghiệp vụ; lỗi khác (mạng, máy chủ) cũng không đặt được mật khẩu nên báo câu
    // tương ứng.
    return <InvalidLink message={isLinkInvalid(error) ? error.message : errorMessage(error)} />;
  }
  return <SetPasswordForm token={token} username={check.data.username ?? ''} expiresAt={check.data.expiresAt} />;
}

export function PasswordPage() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim();

  if (pathname === PATHS.setPassword) {
    // Mở /dat-mat-khau mà không có mã thì về trạng thái 1.
    return token ? <SetPasswordState key={token} token={token} /> : <Navigate to={pathOf('password')} replace />;
  }
  return <RequestLinkForm />;
}
