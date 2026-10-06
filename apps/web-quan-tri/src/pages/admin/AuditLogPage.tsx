import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Fragment, useState, type FormEvent } from 'react';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import {
  Blank,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  SelectField,
  Table,
  Td,
  TextField,
  Th,
  Tr,
} from '@dsvhvn/dung-chung/ui';
import { auditLogsApi, type AuditLogQuery } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import type { ActorRole, AuditAction, AuditLog } from '@dsvhvn/dung-chung/api';
import {
  ACTOR_ROLE_LABEL,
  AUDIT_ACTION_LABEL,
  AUDIT_TARGET_LABEL,
  describeAuditValue,
  formatDateTime,
  formatPlanDate,
  MESSAGES,
  parseVietnameseDate,
  vietnamDayBoundary,
} from '@dsvhvn/dung-chung';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Nhật ký thao tác — quản trị hệ thống. Bảng CHỈ ĐỌC: không có nút sửa, xóa ở bất kỳ vai trò nào. Cột: thời điểm, người làm, vai trò, hành động, đối tượng, địa chỉ IP; lọc theo người làm, vai trò, hành
// động, đối tượng, khoảng thời gian (ngày theo giờ Việt Nam); mở một dòng để xem giá trị cũ / mới. Mới nhất trước.

const ROLE_SLUG = slugMap<ActorRole>({
  ADMIN: 'quan-tri-he-thong',
  ORG_ADMIN: 'quan-tri-truong',
  TEACHER: 'giao-vien',
  STUDENT: 'hoc-sinh',
  SYSTEM: 'he-thong',
});

const ACTION_SLUG = slugMap<AuditAction>({
  LOGIN: 'dang-nhap',
  LOGIN_LOCKED_OUT: 'tam-khoa-dang-nhap',
  ORG_CREATED: 'tao-truong',
  ORG_DEACTIVATED: 'ngung-truong',
  ACCOUNT_CREATED: 'tao-tai-khoan',
  ACCOUNT_LOCKED: 'khoa-tai-khoan',
  ACCOUNT_UNLOCKED: 'mo-khoa-tai-khoan',
  ACCOUNT_DELETED: 'xoa-tai-khoan',
  HERITAGE_PUBLISHED: 'xuat-ban-di-san',
  HERITAGE_ARCHIVED: 'an-di-san',
  HERITAGE_PREVIEW_ISSUED: 'cap-xem-truoc-di-san',
  TRANSLATION_APPROVED: 'duyet-ban-dich',
  TRANSLATION_REJECTED: 'tu-choi-ban-dich',
  HERITAGE_MODEL_CHANGED: 'doi-mo-hinh-3d',
  STUDENT_ACCOUNTS_CREATED: 'them-hoc-sinh',
  STUDENT_PASSWORD_RESET: 'dat-lai-mat-khau-hoc-sinh',
  STUDENT_DEACTIVATED: 'vo-hieu-hoc-sinh',
  STUDENT_REACTIVATED: 'mo-lai-hoc-sinh',
  QUIZ_PUBLISHED: 'phat-hanh-bai-kiem-tra',
  QUIZ_CLOSED: 'dong-bai-kiem-tra',
  QUESTION_HIDDEN: 'an-cau-hoi',
  QUESTION_RESTORED: 'hien-lai-cau-hoi',
  PLAN_UPDATED: 'cap-nhat-goi',
  SUBSCRIPTION_CHANGED: 'doi-goi',
  BILLING_STATUS_CHANGED: 'doi-trang-thai-thanh-toan',
  IPN_REJECTED: 'tu-choi-ipn',
});

const TARGET_SLUG: Record<string, string> = {
  users: 'tai-khoan',
  organizations: 'truong',
  subscriptions: 'dang-ky-goi',
  heritages: 'di-san',
  heritage_translations: 'ban-dich-di-san',
  heritage_summaries: 'tom-tat-di-san',
  heritage_models: 'mo-hinh-3d-di-san',
  students: 'hoc-sinh',
  classes: 'lop-hoc',
  quizzes: 'bai-kiem-tra',
  questions: 'cau-hoi',
  plans: 'goi-dich-vu',
  invoices: 'hoa-don',
  payments: 'giao-dich',
};
const TARGET_BY_SLUG = new Map(Object.entries(TARGET_SLUG).map(([target, slug]) => [slug, target]));

const ROLE_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  ...(Object.keys(ACTOR_ROLE_LABEL) as ActorRole[]).map((r) => ({ value: ROLE_SLUG.toSlug(r), label: ACTOR_ROLE_LABEL[r] })),
];
const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  ...(Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]).map((a) => ({
    value: ACTION_SLUG.toSlug(a),
    label: AUDIT_ACTION_LABEL[a],
  })),
];
const TARGET_OPTIONS = [
  { value: '', label: 'Tất cả đối tượng' },
  ...Object.entries(TARGET_SLUG).map(([target, slug]) => ({ value: slug, label: AUDIT_TARGET_LABEL[target] ?? target })),
];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_RULE = 'nhập theo dạng ngày/tháng/năm, ví dụ 26/09/2026';

interface DateErrors {
  from?: string;
  to?: string;
}

interface Filters {
  actor: string;
  role: string;
  action: string;
  target: string;
  from: string;
  to: string;
}

function FilterForm({ initial, onApply, onReset }: { initial: Filters; onApply: (f: Filters) => void; onReset: () => void }) {
  // Ô ngày hiện theo dạng ngày/tháng/năm; URL và API dùng yyyy-MM-dd.
  const [values, setValues] = useState<Filters>({
    ...initial,
    from: formatPlanDate(initial.from),
    to: formatPlanDate(initial.to),
  });
  const [errors, setErrors] = useState<DateErrors>({});
  const set = (key: keyof Filters) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = values.from.trim() === '' ? '' : parseVietnameseDate(values.from);
    const to = values.to.trim() === '' ? '' : parseVietnameseDate(values.to);
    const found: DateErrors = {
      from: from === null ? MESSAGES.invalid('Từ ngày', DATE_RULE) : undefined,
      to:
        to === null
          ? MESSAGES.invalid('Đến ngày', DATE_RULE)
          : from && to && to < from
            ? MESSAGES.invalid('Đến ngày', 'không được trước Từ ngày')
            : undefined,
    };
    setErrors(found);
    if (found.from || found.to || from === null || to === null) return;
    onApply({ ...values, actor: values.actor.trim(), from, to });
  };

  return (
    <search aria-label="Lọc nhật ký">
      <form onSubmit={submit} className="grid gap-4 rounded-md border border-border p-4 dsvmd:grid-cols-3">
        <TextField
          label="Người làm"
          name="nguoi-lam"
          placeholder="Tên đăng nhập hoặc họ tên"
          value={values.actor}
          onChange={set('actor')}
        />
        <SelectField label="Vai trò" name="vai-tro" value={values.role} options={ROLE_OPTIONS} onChange={set('role')} />
        <SelectField label="Hành động" name="hanh-dong" value={values.action} options={ACTION_OPTIONS} onChange={set('action')} />
        <SelectField label="Đối tượng" name="doi-tuong" value={values.target} options={TARGET_OPTIONS} onChange={set('target')} />
        <TextField
          label="Từ ngày"
          name="tu-ngay"
          inputMode="numeric"
          placeholder="ngày/tháng/năm"
          value={values.from}
          onChange={set('from')}
          error={errors.from}
        />
        <TextField
          label="Đến ngày"
          name="den-ngay"
          inputMode="numeric"
          placeholder="ngày/tháng/năm"
          value={values.to}
          onChange={set('to')}
          error={errors.to}
        />
        <div className="flex flex-wrap gap-3 dsvmd:col-span-3">
          <Button type="submit">
            <Icon name="search" size={16} />
            Lọc
          </Button>
          <Button variant="secondary" onClick={onReset}>
            Bỏ lọc
          </Button>
        </div>
      </form>
    </search>
  );
}

function ValueList({ title, json }: { title: string; json: string | null }) {
  const fields = describeAuditValue(json);
  return (
    <div className="min-w-0 flex-1">
      <p className="type-label text-on-surface-variant">{title}</p>
      {fields.length === 0 ? (
        <p className="mt-2 type-body-s text-on-surface-muted">Không có</p>
      ) : (
        <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 type-body-s">
          {fields.map((f, i) => (
            <Fragment key={`${f.label}-${i}`}>
              <dt className="text-on-surface-variant">{f.label}</dt>
              <dd className="break-all text-on-surface">{f.value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}

function actorOf(log: AuditLog) {
  if (log.actorRole === 'SYSTEM' || log.userId === null) return <span className="text-on-surface-variant">Hệ thống</span>;
  return (
    <span className="flex flex-col">
      <span>{log.fullName ?? <Blank />}</span>
      {log.username && <span className="type-mono-label text-on-surface-variant">{log.username}</span>}
    </span>
  );
}

function targetOf(log: AuditLog): string {
  const label = AUDIT_TARGET_LABEL[log.targetType] ?? log.targetType;
  return log.targetId === null ? label : `${label} #${log.targetId}`;
}

export default function AuditLogPage() {
  const { params, update, page } = useListParams();
  const [open, setOpen] = useState<number | null>(null);

  const filters: Filters = {
    actor: params.get('nguoi-lam') ?? '',
    role: ROLE_SLUG.toSlug(ROLE_SLUG.fromSlug(params.get('vai-tro'))),
    action: ACTION_SLUG.toSlug(ACTION_SLUG.fromSlug(params.get('hanh-dong'))),
    target: TARGET_BY_SLUG.has(params.get('doi-tuong') ?? '') ? (params.get('doi-tuong') ?? '') : '',
    from: DAY.test(params.get('tu-ngay') ?? '') ? (params.get('tu-ngay') ?? '') : '',
    to: DAY.test(params.get('den-ngay') ?? '') ? (params.get('den-ngay') ?? '') : '',
  };
  const query: AuditLogQuery = {
    actor: filters.actor,
    actorRole: ROLE_SLUG.fromSlug(filters.role),
    action: ACTION_SLUG.fromSlug(filters.action),
    targetType: TARGET_BY_SLUG.get(filters.target) ?? '',
    from: vietnamDayBoundary(filters.from, 'start'),
    to: vietnamDayBoundary(filters.to, 'end'),
    page,
    pageSize: PAGE_SIZE,
  };
  const filtered = Object.values(filters).some((v) => v !== '');

  const list = useQuery({
    queryKey: queryKeys.auditLogs(query),
    queryFn: () => auditLogsApi.list(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const apply = (f: Filters) =>
    update({
      'nguoi-lam': f.actor,
      'vai-tro': f.role,
      'hanh-dong': f.action,
      'doi-tuong': f.target,
      'tu-ngay': f.from,
      'den-ngay': f.to,
    });
  const reset = () =>
    update({ 'nguoi-lam': null, 'vai-tro': null, 'hanh-dong': null, 'doi-tuong': null, 'tu-ngay': null, 'den-ngay': null });

  return (
    <AreaPage>
      <PageHeader
        title="Nhật ký thao tác"
        description="Bản ghi chỉ thêm, không sửa, không xóa. Thời điểm hiển thị theo giờ Việt Nam."
      />
      <FilterForm key={params.toString()} initial={filters} onApply={apply} onReset={reset} />

      {list.isPending ? (
        <LoadingState rows={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={filtered ? 'search' : 'file-text'}
          title={filtered ? MESSAGES.noResults : 'Chưa có bản ghi nhật ký nào.'}
          action={
            filtered && (
              <Button variant="secondary" onClick={reset}>
                Bỏ lọc
              </Button>
            )
          }
        />
      ) : (
        <div>
          <Table caption="Nhật ký thao tác" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Thời điểm</Th>
                <Th>Người làm</Th>
                <Th>Vai trò</Th>
                <Th>Hành động</Th>
                <Th>Đối tượng</Th>
                <Th>Địa chỉ IP</Th>
                <Th className="text-right">Chi tiết</Th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((log) => {
                const expanded = open === log.id;
                const hasValues = log.oldValue !== null || log.newValue !== null;
                return (
                  <Fragment key={log.id}>
                    <Tr>
                      <Td className="type-mono-label whitespace-nowrap">{formatDateTime(log.createdAt)}</Td>
                      <Td>{actorOf(log)}</Td>
                      <Td className="whitespace-nowrap">{log.actorRoleLabel}</Td>
                      <Td>{log.actionLabel}</Td>
                      <Td className="whitespace-nowrap">{targetOf(log)}</Td>
                      <Td className="type-mono-label">{log.ipAddress ?? <Blank />}</Td>
                      <Td className="text-right">
                        {hasValues ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-expanded={expanded}
                            aria-controls={expanded ? `nhat-ky-${log.id}` : undefined}
                            onClick={() => setOpen(expanded ? null : log.id)}
                          >
                            {expanded ? 'Thu gọn' : 'Xem'}
                            <Icon name="chevron-down" size={16} className={expanded ? 'rotate-180' : undefined} />
                          </Button>
                        ) : (
                          <Blank />
                        )}
                      </Td>
                    </Tr>
                    {expanded && (
                      <tr id={`nhat-ky-${log.id}`} className="bg-surface-container-low">
                        <td colSpan={7} className="border-b border-(--dsv-table-border) px-4 py-4">
                          <div className="flex flex-col gap-6 dsvmd:flex-row">
                            <ValueList title="Giá trị cũ" json={log.oldValue} />
                            <ValueList title="Giá trị mới" json={log.newValue} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
          <Pagination
            label="nhật ký"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}
    </AreaPage>
  );
}
