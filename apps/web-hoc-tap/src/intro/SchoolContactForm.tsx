import {
  SCHOOL_INQUIRY_LIMITS,
  SCHOOL_INQUIRY_SENT,
  focusFirstInvalid,
  schoolInquiryTooManyMessage,
  splitApiError,
  validateSchoolInquiry,
} from '@dsvhvn/dung-chung';
import { ApiError, type SchoolInquiryField } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, TextAreaField, TextField } from '@dsvhvn/dung-chung/ui';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { schoolInquiryApi } from '../lib/api/schoolInquiry';
import { SectionTitle } from './IntroParts';

// Biểu mẫu "Liên hệ để được tạo tài khoản cho trường" của trang Dành cho nhà trường (chỉ tiếng Việt). Gửi email cho quản trị hệ thống
// qua máy chủ; không có thư xác nhận về địa chỉ đã nhập. Ô "website" là ô bẫy ẩn cho chương trình tự động: người thật không thấy, không tới được
// bằng bàn phím và để trống. Lỗi theo trường hiện dưới ô nhập và đưa focus tới ô lỗi đầu tiên; lỗi chung hiện dạng In line (vùng báo lỗi);
// khi gửi xong, vùng trạng thái thông báo thành công cho trình đọc màn hình và nhận focus.

const EMPTY: Record<SchoolInquiryField, string> = {
  schoolName: '',
  province: '',
  contactName: '',
  position: '',
  email: '',
  phone: '',
  message: '',
};

const FIELDS = Object.keys(EMPTY) as SchoolInquiryField[];

function failureOf(error: unknown): { fields: Partial<Record<SchoolInquiryField, string>>; form: string | null } {
  if (error instanceof ApiError && error.status === 429) return { fields: {}, form: schoolInquiryTooManyMessage(error.retryAfterSeconds) };
  return splitApiError<SchoolInquiryField>(error, FIELDS);
}

export function SchoolContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const sentRef = useRef<HTMLOutputElement>(null);
  const [values, setValues] = useState(EMPTY);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<SchoolInquiryField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  const change = (field: SchoolInquiryField) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    const found = validateSchoolInquiry(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      const message = await schoolInquiryApi.submit({
        schoolName: values.schoolName.trim(),
        province: values.province.trim() || null,
        contactName: values.contactName.trim(),
        position: values.position.trim() || null,
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        message: values.message.trim(),
        website,
      });
      setSent(message ?? SCHOOL_INQUIRY_SENT);
      setValues(EMPTY);
      setErrors({});
    } catch (error) {
      const failure = failureOf(error);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="lien-he-tieu-de" className="bg-surface-container-low py-12 dsvmd:py-16">
      <div className="dsv-content flex flex-col gap-8">
        <SectionTitle
          id="lien-he-tieu-de"
          title="Liên hệ để được tạo tài khoản cho trường"
          text="Gửi thông tin của trường, nhóm Vietnam Heritage sẽ liên hệ lại qua email. Trường mới nhận gói Miễn phí để dùng thử."
        />

        <div className="max-w-[860px]">
          {/* Vùng trạng thái có sẵn trong trang từ đầu để trình đọc màn hình đọc được câu báo gửi xong. */}
          <output ref={sentRef} tabIndex={-1} aria-live="polite" className="block outline-none">
            {sent && (
              <div className="flex flex-col items-start gap-4 rounded-md border border-border bg-surface p-6">
                <p className="flex items-start gap-3 rounded-sm bg-success-container px-4 py-3 type-body-s text-on-success-container">
                  <Icon name="check" size={20} className="mt-px shrink-0" />
                  <span>{sent}</span>
                </p>
                <Button type="button" variant="secondary" onClick={() => setSent(null)}>
                  Gửi thêm một liên hệ khác
                </Button>
              </div>
            )}
          </output>

          {!sent && (
            <form
              ref={formRef}
              noValidate
              onSubmit={onSubmit}
              aria-labelledby="lien-he-tieu-de"
              className="relative flex flex-col gap-(--dsv-inline-gap) rounded-md border border-border bg-surface p-6 dsvmd:p-8"
            >
              {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
              <p className="type-body-s text-on-surface-variant">Ô có dấu * là bắt buộc.</p>

              <div className="grid gap-(--dsv-inline-gap) dsvmd:grid-cols-2">
                <TextField
                  label="Tên trường *"
                  name="schoolName"
                  autoComplete="organization"
                  value={values.schoolName}
                  onChange={change('schoolName')}
                  error={errors.schoolName}
                  required
                />
                <TextField
                  label="Tỉnh/thành"
                  name="province"
                  autoComplete="address-level1"
                  value={values.province}
                  onChange={change('province')}
                  error={errors.province}
                />
                <TextField
                  label="Họ tên người liên hệ *"
                  name="contactName"
                  autoComplete="name"
                  value={values.contactName}
                  onChange={change('contactName')}
                  error={errors.contactName}
                  required
                />
                <TextField
                  label="Chức vụ"
                  name="position"
                  autoComplete="organization-title"
                  value={values.position}
                  onChange={change('position')}
                  error={errors.position}
                />
                <TextField
                  label="Email *"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={values.email}
                  onChange={change('email')}
                  error={errors.email}
                  required
                />
                <TextField
                  label="Số điện thoại"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={values.phone}
                  onChange={change('phone')}
                  error={errors.phone}
                />
              </div>

              <TextAreaField
                label="Nội dung *"
                name="message"
                rows={5}
                hint={`${values.message.trim().length}/${SCHOOL_INQUIRY_LIMITS.message} ký tự`}
                value={values.message}
                onChange={change('message')}
                error={errors.message}
                required
              />

              {/* Ô bẫy: ẩn khỏi mắt, bàn phím và trình đọc màn hình. */}
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <label>
                  Để trống ô này
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg" loading={submitting}>
                  Gửi liên hệ
                </Button>
                <p className="type-body-s text-on-surface-variant">Chúng tôi chỉ dùng thông tin này để liên hệ về tài khoản cho trường.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
