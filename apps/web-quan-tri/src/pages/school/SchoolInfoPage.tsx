import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import {
  Button,
  ErrorState,
  InlineMessage,
  LoadingState,
  TextField,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { orgApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import type { MyOrganization } from '@dsvhvn/dung-chung/api';
import {
  collectErrors,
  focusFirstInvalid,
  LIMITS,
  MESSAGES,
  splitApiError,
  trimToNull,
  validateOptionalEmail,
  validateOptionalPhone,
  validateOptionalText,
} from '@dsvhvn/dung-chung';
import { SubscriptionSummary } from '../../components/account/SubscriptionSummary';

// Thông tin trường — quản trị trường. Tên trường chỉ đọc (chỉ quản trị hệ thống sửa),
// địa chỉ, số điện thoại, email liên hệ sửa được. Gói và hóa đơn quản lý ở trang "Gói đã mua".

type Field = 'address' | 'phone' | 'email';

const valuesOf = (org: MyOrganization): Record<Field, string> => ({
  address: org.address ?? '',
  phone: org.phone ?? '',
  email: org.email ?? '',
});

function ContactForm({ org }: { org: MyOrganization }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(() => valuesOf(org));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = valuesOf(org);
  const dirty = (Object.keys(values) as Field[]).some((k) => values[k].trim() !== saved[k]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = collectErrors<Field>({
      address: validateOptionalText(values.address, 'Địa chỉ', LIMITS.organizationAddress),
      phone: validateOptionalPhone(values.phone),
      email: validateOptionalEmail(values.email),
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await orgApi.updateContact({
        address: trimToNull(values.address),
        phone: trimToNull(values.phone),
        email: trimToNull(values.email),
      });
      queryClient.setQueryData(queryKeys.org, data);
      setValues(valuesOf(data));
      toast.success(message ?? MESSAGES.success('Lưu thông tin trường'));
    } catch (err) {
      const failure = splitApiError<Field>(err, ['address', 'phone', 'email']);
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
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex w-full max-w-[560px] flex-col gap-6">
      {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
      <TextField label="Tên trường" name="name" value={org.name} readOnly hint="Chỉ Quản trị hệ thống sửa được tên trường." />
      <TextField
        label="Địa chỉ"
        name="address"
        autoComplete="street-address"
        value={values.address}
        onChange={set('address')}
        error={errors.address}
      />
      <TextField
        label="Số điện thoại"
        name="phone"
        type="tel"
        inputMode="tel"
        value={values.phone}
        onChange={set('phone')}
        error={errors.phone}
      />
      <TextField
        label="Email liên hệ"
        name="email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        value={values.email}
        onChange={set('email')}
        error={errors.email}
      />
      <div>
        <Button type="submit" size="lg" loading={saving} disabled={!dirty}>
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

function InfoContent() {
  const org = useQuery({ queryKey: queryKeys.org, queryFn: () => orgApi.get().then((r) => r.data) });
  if (org.isPending) return <LoadingState rows={4} />;
  if (org.isError) return <ErrorState error={org.error} onRetry={() => void org.refetch()} />;
  return (
    <div className="flex flex-col gap-10 dsvlg:flex-row dsvlg:items-start">
      <ContactForm key={org.data.id} org={org.data} />
      <SubscriptionSummary subscription={org.data.subscription} quota={org.data.teacherQuota} />
    </div>
  );
}

export default function SchoolInfoPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  // Chuyển hướng nếu mở từ liên kết cũ có tab gói hoặc hóa đơn
  if (tab === 'goi-va-han-muc') return <Navigate to="/truong/goi" replace />;
  if (tab === 'hoa-don') return <Navigate to="/truong/goi?tab=hoa-don" replace />;

  return (
    <AreaPage>
      <PageHeader
        title="Thông tin trường"
        description="Thông tin liên hệ của trường."
      />
      <div>
        <InfoContent />
      </div>
    </AreaPage>
  );
}
