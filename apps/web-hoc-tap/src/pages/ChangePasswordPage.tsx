import {
  MESSAGES,
  PASSWORD_RULES,
  SIMPLE_PASSWORD_HINT,
  SIMPLE_PASSWORD_RULES,
  checkPassword,
  collectErrors,
  focusFirstInvalid,
  isSimplePasswordValid,
  splitApiError,
  validatePasswordConfirmation,
  validateRequired,
  validateStudentNewPassword,
} from '@dsvhvn/dung-chung';
import { Button, ButtonLink, Icon, InlineMessage, PasswordField, useToast } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { RETURN_PARAM, safeReturnPath } from '../access/access';
import { pathOf } from '../access/screens';
import { studentApi } from '../lib/api/client';
import { useAuth } from '../lib/auth/context';
import { Illustration } from '@dsvhvn/dung-chung/lesson';
import { schoolLevelOfGrade } from '@dsvhvn/dung-chung/theme';

// Đổi mật khẩu của học sinh — hai chế độ trên cùng một màn hình:
//   Bắt buộc (lần đầu đăng nhập, hoặc sau khi giáo viên đặt lại): lời chào và thanh báo đặt mật khẩu mới, mật khẩu mới
//   + nhập lại, không hỏi mật khẩu hiện tại (token chỉ có được bằng cách vừa đăng nhập với mật khẩu tạm), không có
//   thanh điều hướng, không có nút bỏ qua.
//   Tự đổi (từ menu tài khoản): thêm ô mật khẩu hiện tại, có nút hủy.
// Quy tắc mật khẩu hiện dạng danh sách đánh dấu khi đạt; mật khẩu mới phải khác mật khẩu cũ (máy chủ kiểm và báo dưới ô).
// Học sinh lớp cấp 1 (khối 1-5) theo quy tắc đơn giản: chỉ cần dài 6-64 ký tự (thầy cô phát mật khẩu 6 chữ số, em dùng luôn).
// Đổi xong máy chủ trả token mới trong cùng phản hồi, cờ buộc đổi tắt, học sinh vào thẳng trang học (hoặc bài đang chờ
// mở), không phải đăng nhập lại.

type Field = 'currentPassword' | 'newPassword' | 'confirmNewPassword';

const EMPTY: Record<Field, string> = { currentPassword: '', newPassword: '', confirmNewPassword: '' };

function RuleChecklist({ password, simple }: { password: string; simple: boolean }) {
  const check = checkPassword(password);
  const rules = simple ? SIMPLE_PASSWORD_RULES : PASSWORD_RULES;
  return (
    <ul aria-label="Quy tắc mật khẩu" className="flex flex-col gap-1 type-body-s">
      {rules.map((rule) => {
        const met = simple ? isSimplePasswordValid(password) : check[rule.key];
        return (
          <li key={rule.key} className={met ? 'flex items-center gap-2 text-success' : 'flex items-center gap-2 text-on-surface-variant'}>
            <Icon name={met ? 'check' : 'info'} size={16} />
            <span>
              {rule.label}
              <span className="sr-only">{met ? ' (đã đạt)' : ' (chưa đạt)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ChangePasswordPage() {
  const { user, passwordChanged } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null; // route guard đã chặn Khách
  const forced = user.mustChangePassword;
  // Cấp của lớp em: máy chủ trả trong hồ sơ; phiên cũ chưa có thì suy từ khối lớp.
  const level = user.schoolLevel ?? schoolLevelOfGrade(user.class?.grade);
  const simple = level === 1;
  const next = safeReturnPath(params.get(RETURN_PARAM)) ?? pathOf('learnHome');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = collectErrors<Field>({
      currentPassword: forced ? null : validateRequired(values.currentPassword, 'mật khẩu hiện tại'),
      newPassword: validateStudentNewPassword(values.newPassword, level),
      confirmNewPassword: validatePasswordConfirmation(values.newPassword, values.confirmNewPassword),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await studentApi.changePassword({
        currentPassword: forced ? null : values.currentPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });
      passwordChanged(data);
      toast.success(message ?? MESSAGES.success('Đổi mật khẩu'));
      navigate(next, { replace: true });
    } catch (err) {
      const failure = splitApiError<Field>(err, ['currentPassword', 'newPassword', 'confirmNewPassword']);
      setErrors(failure.fields);
      setFormError(failure.form);
      setSaving(false);
      focusFirstInvalid(formRef.current);
    }
  };

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  return (
    <section className="dsv-content dsv-section">
      <title>Đổi mật khẩu · DiViet</title>
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-(--dsv-block-gap)">
        <div className="flex items-center gap-(--dsv-inline-gap)">
          <Illustration state="chao" className="size-20" />
          <div>
            <h1 className="type-h1 text-on-surface">{forced ? `Chào ${user.fullName ?? 'em'}` : 'Đổi mật khẩu'}</h1>
            {forced && <p className="mt-1 type-body-m text-on-surface-variant">Em hãy đặt mật khẩu mới của riêng em.</p>}
          </div>
        </div>

        {forced && <InlineMessage tone="info">{MESSAGES.studentMustChangePassword}</InlineMessage>}

        <form ref={formRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-(--dsv-inline-gap)">
          {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
          {!forced && (
            <PasswordField
              label="Mật khẩu hiện tại"
              name="currentPassword"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={set('currentPassword')}
              error={errors.currentPassword}
            />
          )}
          <PasswordField
            label="Mật khẩu mới"
            name="newPassword"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
            hint={simple ? SIMPLE_PASSWORD_HINT : undefined}
          />
          <RuleChecklist password={values.newPassword} simple={simple} />
          <PasswordField
            label="Nhập lại mật khẩu mới"
            name="confirmNewPassword"
            autoComplete="new-password"
            value={values.confirmNewPassword}
            onChange={set('confirmNewPassword')}
            error={errors.confirmNewPassword}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" loading={saving} fullWidth={forced}>
              {forced ? 'Đặt mật khẩu và bắt đầu học' : 'Đổi mật khẩu'}
            </Button>
            {!forced && (
              <ButtonLink to={pathOf('learnHome')} variant="secondary" size="lg">
                Hủy
              </ButtonLink>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
