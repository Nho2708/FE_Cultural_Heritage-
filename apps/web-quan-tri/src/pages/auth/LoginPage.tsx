import { MESSAGES, collectErrors, focusFirstInvalid, splitApiError, validateRequired } from '@dsvhvn/dung-chung';
import { Button, InlineMessage, PasswordField, TextField, TextLink, useToast } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { pathOf } from '../../access/screens';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { AUTH_PHOTOS } from '../../components/layout/authPhotos';
import { LearningWebLink } from '../../components/layout/Layouts';
import { useAuth } from '../../lib/auth/context';

// Màn hình Đăng nhập web quản trị. Một ô "Email hoặc tên đăng nhập" + mật khẩu; không có "Đăng ký" vì tài khoản do cấp
// trên tạo. Ô mật khẩu chỉ kiểm bắt buộc nhập — quy tắc mật khẩu áp cho mật khẩu mới, không áp khi đăng nhập.
// Sai thông tin (không nói sai ô nào, tài khoản học sinh cũng nhận câu này) và tài khoản không đăng nhập được (tạm khóa,
// bị khóa, ngừng sử dụng, trường đã ngừng) hiện In line. Dưới biểu mẫu luôn có dòng cố định chỉ học sinh sang web học
// tập, không phụ thuộc thứ đã nhập, và dòng dẫn trường chưa dùng sang trang Dành cho nhà trường của web học tập.
// Thành công: trang mặc định theo vai trò hoặc trang bị chặn trước đó.

type Field = 'emailOrUsername' | 'password';

interface LoginLocationState {
  /** Trang bị route guard chặn, quay lại sau khi đăng nhập. */
  from?: string;
  /** Điền sẵn sau khi đặt mật khẩu xong. */
  login?: string;
}

export function LoginPage() {
  const { login, notice, clearNotice } = useAuth();
  const toast = useToast();
  const state = (useLocation().state ?? {}) as LoginLocationState;
  const formRef = useRef<HTMLFormElement>(null);
  const [account, setAccount] = useState(state.login ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearNotice();
    setFormError(null);
    const found = collectErrors<Field>({
      emailOrUsername: validateRequired(account, 'email hoặc tên đăng nhập'),
      password: validateRequired(password, 'mật khẩu'),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      await login(account, password, state.from);
      toast.success(MESSAGES.success('Đăng nhập'));
    } catch (error) {
      const failure = splitApiError<Field>(error, ['emailOrUsername', 'password']);
      setErrors(failure.fields);
      setFormError(failure.form);
      setPassword('');
      setSubmitting(false);
      focusFirstInvalid(formRef.current);
    }
  };

  const message = formError ?? notice;

  return (
    <AuthLayout photo={AUTH_PHOTOS.signIn} title="Đăng nhập" subtitle="Dành cho giáo viên, quản trị trường và quản trị hệ thống.">
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {message && <InlineMessage tone="danger">{message}</InlineMessage>}
        <TextField
          label="Email hoặc tên đăng nhập"
          name="emailOrUsername"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          error={errors.emailOrUsername}
        />
        <div className="flex flex-col gap-3">
          <PasswordField
            label="Mật khẩu"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <TextLink to={pathOf('password')} className="self-end">
            Quên mật khẩu?
          </TextLink>
        </div>
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Đăng nhập
        </Button>
        <p className="text-center type-body-s text-on-surface-variant">
          Chưa có tài khoản? Quản trị trường của bạn sẽ tạo tài khoản và gửi email đặt mật khẩu.
        </p>
        <p className="text-center type-body-s text-on-surface-variant">
          Trường bạn chưa dùng Vietnam Heritage?{' '}
          <LearningWebLink path="/nha-truong" className="text-link underline underline-offset-4">
            Xem giới thiệu cho nhà trường
          </LearningWebLink>
        </p>
        <p className="rounded-sm bg-surface-container-low px-4 py-3 text-center type-body-s text-on-surface-variant">
          Học sinh đăng nhập ở trang Vietnam Heritage hoặc ứng dụng trên điện thoại.{' '}
          <LearningWebLink className="text-link underline underline-offset-4">Mở trang Vietnam Heritage</LearningWebLink>
        </p>
      </form>
    </AuthLayout>
  );
}
