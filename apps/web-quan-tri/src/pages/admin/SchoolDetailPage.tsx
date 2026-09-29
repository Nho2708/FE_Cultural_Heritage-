import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { AccountActionDialog, type AccountAction } from '../../components/account/AccountActionDialog';
import { AccountFields, AccountFormDialog } from '../../components/account/AccountFormDialog';
import {
  EMPTY_ACCOUNT,
  newAccountBody,
  validateNewAccount,
  type AccountField,
  type AccountValues,
} from '../../components/account/accountForm';
import { AccountStatusBadge } from '../../components/account/AccountStatusBadge';
import { DeactivateOrganizationDialog } from '../../components/account/DeactivateOrganizationDialog';
import { OrganizationStateBadge } from '../../components/account/OrganizationStateBadge';
import { SubscriptionSummary } from '../../components/account/SubscriptionSummary';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import {
  Blank,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Table,
  Td,
  TextField,
  TextLink,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { type Account, ApiError, type OrganizationDetail, type OrganizationInfo } from '@dsvhvn/dung-chung/api';
import { adminOrganizationsApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import {
  collectErrors,
  focusFirstInvalid,
  formatDate,
  formatDateTime,
  LIMITS,
  MESSAGES,
  splitApiError,
  trimToNull,
  validateOptionalEmail,
  validateOptionalPhone,
  validateOptionalText,
  validateRequiredText,
} from '@dsvhvn/dung-chung';

// Chi tiết trường — quản trị hệ thống. Hai trạng thái:
//   /quan-tri/truong/moi        tạo mới: thông tin trường + tài khoản quản trị trường đầu tiên trong một lần lưu.
//                               Máy chủ gán gói Miễn phí đang hiệu lực từ hôm nay và gửi email đặt mật khẩu hạn 48 giờ.
//                               Trùng email / tên đăng nhập: không tạo gì, lỗi dưới đúng ô.
//   /quan-tri/truong/:truong    xem / sửa thông tin trường; gói hiện tại (chỉ đọc); quản trị trường (khóa / mở,
//                               "Thêm quản trị trường" mở Biểu mẫu tài khoản); số giáo viên; ngừng trường.

type InfoField = keyof OrganizationInfo;
type InfoValues = Record<InfoField, string>;

const EMPTY_INFO: InfoValues = { name: '', address: '', phone: '', email: '' };

const infoValuesOf = (org: OrganizationDetail): InfoValues => ({
  name: org.name,
  address: org.address ?? '',
  phone: org.phone ?? '',
  email: org.email ?? '',
});

function validateInfo(values: InfoValues): Partial<Record<InfoField, string>> {
  return collectErrors<InfoField>({
    name: validateRequiredText(values.name, 'tên trường', 'Tên trường', LIMITS.organizationName),
    address: validateOptionalText(values.address, 'Địa chỉ', LIMITS.organizationAddress),
    phone: validateOptionalPhone(values.phone),
    email: validateOptionalEmail(values.email),
  });
}

const infoBody = (values: InfoValues): OrganizationInfo => ({
  name: values.name.trim(),
  address: trimToNull(values.address),
  phone: trimToNull(values.phone),
  email: trimToNull(values.email),
});

function InfoFields({
  values,
  errors,
  disabled,
  onChange,
}: {
  values: InfoValues;
  errors: Partial<Record<InfoField, string>>;
  disabled?: boolean;
  onChange: (field: InfoField, value: string) => void;
}) {
  return (
    <>
      <TextField
        label="Tên trường"
        name="name"
        autoComplete="organization"
        value={values.name}
        disabled={disabled}
        onChange={(e) => onChange('name', e.target.value)}
        error={errors.name}
      />
      <TextField
        label="Địa chỉ"
        name="address"
        autoComplete="street-address"
        value={values.address}
        disabled={disabled}
        onChange={(e) => onChange('address', e.target.value)}
        error={errors.address}
        hint="Không bắt buộc."
      />
      <TextField
        label="Số điện thoại"
        name="phone"
        type="tel"
        inputMode="tel"
        value={values.phone}
        disabled={disabled}
        onChange={(e) => onChange('phone', e.target.value)}
        error={errors.phone}
        hint="Không bắt buộc."
      />
      <TextField
        label="Email liên hệ của trường"
        name="email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        value={values.email}
        disabled={disabled}
        onChange={(e) => onChange('email', e.target.value)}
        error={errors.email}
        hint="Không bắt buộc."
      />
    </>
  );
}

const backLink = <TextLink to={pathOf('schools')}>← Quản lý trường</TextLink>;

// ---------------------------------------------------------------------------------------------------------------
// Tạo mới

const ORG_ADMIN_KEYS = ['fullName', 'username', 'email', 'phone'] as const satisfies readonly AccountField[];
type CreateErrorKey = InfoField | `orgAdmin.${AccountField}`;

function CreateSchool() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [info, setInfo] = useState<InfoValues>(EMPTY_INFO);
  const [admin, setAdmin] = useState<AccountValues>(EMPTY_ACCOUNT);
  const [infoErrors, setInfoErrors] = useState<Partial<Record<InfoField, string>>>({});
  const [adminErrors, setAdminErrors] = useState<Partial<Record<AccountField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const foundInfo = validateInfo(info);
    const foundAdmin = validateNewAccount(admin);
    setInfoErrors(foundInfo);
    setAdminErrors(foundAdmin);
    if (Object.keys(foundInfo).length + Object.keys(foundAdmin).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await adminOrganizationsApi.create({ ...infoBody(info), orgAdmin: newAccountBody(admin) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations });
      queryClient.setQueryData(queryKeys.organization(data.id), data);
      toast.success(message ?? MESSAGES.passwordLinkSent(admin.email.trim()));
      navigate(PATHS.school(data.id), { replace: true });
    } catch (err) {
      const keys: CreateErrorKey[] = [
        'name',
        'address',
        'phone',
        'email',
        ...ORG_ADMIN_KEYS.map((k) => `orgAdmin.${k}` as const),
      ];
      const failure = splitApiError<CreateErrorKey>(err, keys);
      const nextInfo: Partial<Record<InfoField, string>> = {};
      const nextAdmin: Partial<Record<AccountField, string>> = {};
      for (const [key, message] of Object.entries(failure.fields) as [CreateErrorKey, string][]) {
        if (key.startsWith('orgAdmin.')) nextAdmin[key.slice('orgAdmin.'.length) as AccountField] = message;
        else nextInfo[key as InfoField] = message;
      }
      setInfoErrors(nextInfo);
      setAdminErrors(nextAdmin);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AreaPage>
      <PageHeader
        title="Tạo trường"
        before={backLink}
        description="Trường mới được gán gói Miễn phí đang hiệu lực từ hôm nay. Quản trị trường đầu tiên nhận email để tự đặt mật khẩu, liên kết có hiệu lực 48 giờ."
      />
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex max-w-[1040px] flex-col gap-8">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <div className="grid gap-8 dsvlg:grid-cols-2">
          <fieldset className="flex flex-col gap-5 rounded-md border border-border p-6">
            <legend className="px-2 type-h4 text-on-surface">Thông tin trường</legend>
            <InfoFields values={info} errors={infoErrors} onChange={(f, v) => setInfo((s) => ({ ...s, [f]: v }))} />
          </fieldset>
          <fieldset className="flex flex-col gap-5 rounded-md border border-border p-6">
            <legend className="px-2 type-h4 text-on-surface">Quản trị trường đầu tiên</legend>
            <AccountFields values={admin} errors={adminErrors} onChange={(f, v) => setAdmin((s) => ({ ...s, [f]: v }))} />
          </fieldset>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={saving}>
            Tạo trường
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate(pathOf('schools'))} disabled={saving}>
            Hủy
          </Button>
        </div>
      </form>
    </AreaPage>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Xem / sửa

function EditInfoForm({ org }: { org: OrganizationDetail }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(() => infoValuesOf(org));
  const [errors, setErrors] = useState<Partial<Record<InfoField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const deactivated = org.status === 'DEACTIVATED';

  const saved = infoValuesOf(org);
  const dirty = (Object.keys(values) as InfoField[]).some((k) => values[k].trim() !== saved[k]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateInfo(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await adminOrganizationsApi.update(org.id, infoBody(values));
      queryClient.setQueryData(queryKeys.organization(org.id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations });
      setValues(infoValuesOf(data));
      toast.success(message ?? MESSAGES.success('Lưu thông tin trường'));
    } catch (err) {
      const failure = splitApiError<InfoField>(err, ['name', 'address', 'phone', 'email']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex w-full max-w-[560px] flex-col gap-5">
      <h2 className="type-h3 text-on-surface">Thông tin trường</h2>
      {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
      {deactivated && <InlineMessage tone="info">Trường đã ngừng nên không sửa được thông tin.</InlineMessage>}
      <InfoFields
        values={values}
        errors={errors}
        disabled={deactivated}
        onChange={(f, v) => setValues((s) => ({ ...s, [f]: v }))}
      />
      {!deactivated && (
        <div>
          <Button type="submit" loading={saving} disabled={!dirty}>
            Lưu thay đổi
          </Button>
        </div>
      )}
    </form>
  );
}

function OrgAdmins({ org }: { org: OrganizationDetail }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState<{ kind: AccountAction; account: Account } | null>(null);
  const deactivated = org.status === 'DEACTIVATED';
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations });

  const run = (kind: AccountAction, account: Account) =>
    kind === 'unlock'
      ? adminOrganizationsApi.unlockOrgAdmin(org.id, account.id)
      : adminOrganizationsApi.lockOrgAdmin(org.id, account.id);

  return (
    <section aria-labelledby="quan-tri-truong" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="quan-tri-truong" className="type-h3 text-on-surface">
          Quản trị trường
        </h2>
        {!deactivated && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} />
            Thêm quản trị trường
          </Button>
        )}
      </div>
      {org.orgAdmins.length === 0 ? (
        <EmptyState icon="users" title="Trường chưa có quản trị trường nào." />
      ) : (
        <Table caption={`Quản trị trường của ${org.name}`}>
          <thead>
            <tr>
              <Th>Họ và tên</Th>
              <Th>Tên đăng nhập</Th>
              <Th>Email</Th>
              <Th>Trạng thái</Th>
              <Th>Đăng nhập gần nhất</Th>
              {!deactivated && <Th className="text-right">Thao tác</Th>}
            </tr>
          </thead>
          <tbody>
            {org.orgAdmins.map((account) => (
              <Tr key={account.id}>
                <Td className="font-medium">{account.fullName}</Td>
                <Td className="type-mono-label">{account.username}</Td>
                <Td className="whitespace-nowrap">{account.email}</Td>
                <Td>
                  <AccountStatusBadge status={account.status} />
                </Td>
                <Td className="type-mono-label whitespace-nowrap">
                  {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : <Blank />}
                </Td>
                {!deactivated && (
                  <Td>
                    <div className="flex justify-end">
                      {account.status === 'LOCKED' ? (
                        <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'unlock', account })}>
                          <Icon name="unlock" size={16} />
                          Mở khóa
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'lock', account })}>
                          <Icon name="lock" size={16} />
                          Khóa
                        </Button>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <AccountFormDialog
        open={adding}
        accountRole="ORG_ADMIN"
        description={`Tài khoản thuộc trường ${org.name}, nhận email đặt mật khẩu lần đầu (48 giờ).`}
        onSubmit={(body) => adminOrganizationsApi.addOrgAdmin(org.id, body)}
        onCreated={(account, message) => {
          setAdding(false);
          toast.success(message ?? MESSAGES.passwordLinkSent(account.email ?? ''));
          void refresh();
        }}
        onClose={() => setAdding(false)}
      />
      <AccountActionDialog
        action={action}
        run={run}
        onDone={(message) => {
          setAction(null);
          if (message) toast.success(message);
          void refresh();
        }}
        onFailed={(message) => {
          setAction(null);
          toast.error(message);
          void refresh();
        }}
        onClose={() => setAction(null)}
      />
    </section>
  );
}

function SchoolDetail({ id }: { id: number }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [deactivating, setDeactivating] = useState(false);
  const detail = useQuery({
    queryKey: queryKeys.organization(id),
    queryFn: () => adminOrganizationsApi.get(id).then((r) => r.data),
  });

  if (detail.isPending) {
    return (
      <AreaPage>
        <PageHeader title="Chi tiết trường" before={backLink} />
        <LoadingState rows={6} />
      </AreaPage>
    );
  }
  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <AreaPage>
        <PageHeader title="Chi tiết trường" before={backLink} />
        <ErrorState error={detail.error} onRetry={notFound ? undefined : () => void detail.refetch()} />
      </AreaPage>
    );
  }

  const org = detail.data;
  return (
    <AreaPage>
      <PageHeader
        title={org.name}
        before={backLink}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <OrganizationStateBadge state={org.status} />
            <span>Tạo ngày {formatDate(org.createdAt)}</span>
            {org.deactivatedAt && <span>· Ngừng ngày {formatDate(org.deactivatedAt)}</span>}
          </span>
        }
        actions={
          org.status === 'ACTIVE' && (
            <Button variant="danger" onClick={() => setDeactivating(true)}>
              Ngừng trường
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-10 dsvlg:flex-row dsvlg:items-start">
        <EditInfoForm key={`${org.id}-${org.updatedAt ?? ''}-${org.status}`} org={org} />
        <SubscriptionSummary subscription={org.subscription} quota={org.teacherQuota} />
      </div>
      <OrgAdmins org={org} />

      <DeactivateOrganizationDialog
        organization={deactivating ? org : null}
        onDone={(message) => {
          setDeactivating(false);
          toast.success(message ?? MESSAGES.success('Ngừng trường'));
          void queryClient.invalidateQueries({ queryKey: queryKeys.organizations });
        }}
        onFailed={(message) => {
          setDeactivating(false);
          toast.error(message);
          void queryClient.invalidateQueries({ queryKey: queryKeys.organizations });
        }}
        onClose={() => setDeactivating(false)}
      />
    </AreaPage>
  );
}

export default function SchoolDetailPage() {
  const { truong } = useParams();
  if (truong === undefined) return <CreateSchool />;
  const id = Number(truong);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <AreaPage>
        <PageHeader title="Chi tiết trường" before={backLink} />
        <InlineMessage tone="danger">{MESSAGES.blocked('xem trường', 'Không tìm thấy trường.')}</InlineMessage>
      </AreaPage>
    );
  }
  return <SchoolDetail key={id} id={id} />;
}
