import {
  MESSAGES,
  collectErrors,
  focusFirstInvalid,
  normalizeCode,
  splitApiError,
  validateRequired,
  validateStudentCodeInput,
} from '@dsvhvn/dung-chung';
import { ApiError, ERROR_CODES } from '@dsvhvn/dung-chung/api';
import { BrandLogo, Button, InlineMessage, PasswordField, TextField, useToast } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { isLessonPath } from '../access/access';
import { ADMIN_WEB_URL } from '../config/env';
import { useAuth } from '../lib/auth/context';
import { Illustration } from '@dsvhvn/dung-chung/lesson';

// Học sinh đăng nhập: ô "Mã học sinh" (tự viết hoa, bỏ khoảng trắng và dấu gạch) + mật khẩu có nút hiện / ẩn. Sai mã
// hoặc mật khẩu luôn cùng một câu, không cho biết sai ô nào (tài khoản người lớn đăng nhập ở đây cũng nhận câu đó);
// tạm khóa, bị vô hiệu, lớp đã xóa báo In line theo câu của máy chủ. Dòng cố định "Quên mật khẩu? Em hãy nhờ thầy cô
// đặt lại." (không có liên kết quên mật khẩu qua email) và dòng "Thầy cô đăng nhập ở trang quản trị" kèm đường dẫn,
// không phụ thuộc thứ đã nhập. Mở từ đường dẫn bài học khi chưa đăng nhập thì báo và mở lại bài sau khi đăng nhập.
// Màn hình dùng bộ giao diện mặc định vì chưa biết cấp học.

type Field = 'studentCode' | 'password';

/**
 * Cửa đăng nhập không cần token nên không bao giờ trả "không có quyền" hay 404 một cách hợp lệ: gặp hai trường hợp này
 * (máy chủ chưa có hoặc đổi đường dẫn đăng nhập học sinh) thì báo lỗi hệ thống thay vì câu gây hiểu nhầm.
 */
function unexpectedLoginError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.code === ERROR_CODES.forbidden);
}

interface LoginLocationState {
  /** Trang bị route guard chặn, quay lại sau khi đăng nhập. */
  from?: string;
}

export function LoginPage() {
  const { login, notice, clearNotice } = useAuth();
  const toast = useToast();
  const state = (useLocation().state ?? {}) as LoginLocationState;
  const formRef = useRef<HTMLFormElement>(null);
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearNotice();
    setFormError(null);
    const found = collectErrors<Field>({
      studentCode: validateStudentCodeInput(studentCode),
      password: validateRequired(password, 'mật khẩu'),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      await login(studentCode, password, state.from);
      toast.success(MESSAGES.success('Đăng nhập'));
    } catch (error) {
      const failure = splitApiError<Field>(error, ['studentCode', 'password']);
      setErrors(failure.fields);
      setFormError(unexpectedLoginError(error) ? MESSAGES.systemError : failure.form);
      setPassword('');
      setSubmitting(false);
      focusFirstInvalid(formRef.current);
    }
  };

  const message = formError ?? notice;

  return (
    <section className="dsv-content dsv-section">
      <title>Học sinh đăng nhập · Học di sản</title>
      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-(--dsv-block-gap)">
        <BrandLogo variant="badge" size={96} className="self-center" />
        <div className="flex items-center gap-(--dsv-inline-gap)">
          <Illustration state="chao" className="size-20" />
          <div>
            <h1 className="type-h1 text-on-surface">Học sinh đăng nhập</h1>
            <p className="mt-1 type-body-m text-on-surface-variant">Em dùng mã học sinh và mật khẩu trên phiếu đăng nhập.</p>
          </div>
        </div>

        {isLessonPath(state.from) && <InlineMessage tone="info">{MESSAGES.studentSignInToOpenLesson}</InlineMessage>}

        <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-(--dsv-inline-gap)">
          {message && <InlineMessage tone="danger">{message}</InlineMessage>}
          <TextField
            label="Mã học sinh"
            name="studentCode"
            autoComplete="username"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ví dụ: HS8K2QX7"
            value={studentCode}
            onChange={(e) => setStudentCode(normalizeCode(e.target.value))}
            error={errors.studentCode}
            className="type-mono-label tracking-wider"
          />
          <PasswordField
            label="Mật khẩu"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <p className="type-body-m text-on-surface-variant">{MESSAGES.studentForgotPassword}</p>
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            Đăng nhập
          </Button>
        </form>

        <p className="rounded-sm bg-surface-container-low px-4 py-3 text-center type-body-s text-on-surface-variant">
          Thầy cô đăng nhập ở trang quản trị.{' '}
          <a href={ADMIN_WEB_URL} className="text-link underline underline-offset-4">
            Mở trang quản trị
          </a>
        </p>
      </div>
    </section>
  );
}
