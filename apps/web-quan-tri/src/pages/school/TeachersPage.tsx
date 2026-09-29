import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AccountFormDialog } from '../../components/account/AccountFormDialog';
import { AccountActionDialog, type AccountAction } from '../../components/account/AccountActionDialog';
import { AccountStatusBadge } from '../../components/account/AccountStatusBadge';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import {
  Blank,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Pagination,
  SearchForm,
  SelectField,
  Table,
  Td,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { orgApi, type TeacherListQuery } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import type { Account, TeacherQuota, UserStatus } from '@dsvhvn/dung-chung/api';
import { formatDateTime, MESSAGES, NO_EFFECTIVE_PLAN, USER_STATUS_LABEL } from '@dsvhvn/dung-chung';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Giáo viên của trường — quản trị trường. Bảng giáo viên: họ tên, tên đăng nhập, email, trạng thái, lần đăng nhập gần
// nhất; bộ đếm "x / tối đa giáo viên" (đếm tài khoản giáo viên chưa xóa mềm, mọi trạng thái, không đếm học sinh);
// "Thêm giáo viên" mở Biểu mẫu tài khoản, khóa khi đã đủ hạn mức (kèm câu báo hạn mức) hoặc trường không có gói hiệu
// lực; khóa / mở khóa, xóa mềm qua hộp xác nhận chung. Máy chủ chỉ trả giáo viên của trường mình.

const USER_STATUS_SLUG = slugMap<UserStatus>({ ACTIVE: 'hoat-dong', LOCKED: 'bi-khoa', INACTIVE: 'ngung-su-dung' });

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...(Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((s) => ({
    value: USER_STATUS_SLUG.toSlug(s),
    label: USER_STATUS_LABEL[s],
  })),
];

function QuotaNotice({ quota }: { quota: TeacherQuota }) {
  if (quota.canAddTeacher) return null;
  const text =
    quota.max === null
      ? MESSAGES.blocked('thêm giáo viên', NO_EFFECTIVE_PLAN)
      : MESSAGES.teacherLimitReached(quota.used, quota.max, quota.planName ?? '');
  return <InlineMessage tone="warning">{text}</InlineMessage>;
}

function quotaText(quota: TeacherQuota): string {
  return quota.max === null ? `${quota.used} giáo viên` : `${quota.used} / ${quota.max} giáo viên`;
}

export default function TeachersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const keyword = params.get('tu-khoa') ?? '';
  const status = USER_STATUS_SLUG.fromSlug(params.get('trang-thai'));
  const query: TeacherListQuery = { keyword, status, page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: queryKeys.teachers(query),
    queryFn: () => orgApi.listTeachers(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<{ kind: AccountAction; account: Account } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.org });
  const quota = list.data?.quota;

  const run = (kind: AccountAction, account: Account) => {
    switch (kind) {
      case 'lock':
        return orgApi.lockTeacher(account.id);
      case 'unlock':
        return orgApi.unlockTeacher(account.id);
      case 'delete':
        return orgApi.deleteTeacher(account.id);
    }
  };

  return (
    <AreaPage>
      <PageHeader
        title="Giáo viên của trường"
        description={
          quota && (
            <span>
              Đang dùng <strong className="type-mono-label text-on-surface">{quotaText(quota)}</strong>
              {quota.planName && ` của gói ${quota.planName}`}.
            </span>
          )
        }
        actions={
          <Button onClick={() => setCreating(true)} disabled={!quota?.canAddTeacher}>
            <Icon name="plus" size={16} />
            Thêm giáo viên
          </Button>
        }
      />
      {quota && <QuotaNotice quota={quota} />}

      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
        <SearchForm
          key={keyword}
          label="Tìm giáo viên"
          placeholder="Họ tên, tên đăng nhập hoặc email"
          value={keyword}
          onSearch={(value) => update({ 'tu-khoa': value })}
        />
        <SelectField
          label="Trạng thái"
          name="trang-thai"
          value={USER_STATUS_SLUG.toSlug(status)}
          options={STATUS_OPTIONS}
          onChange={(e) => update({ 'trang-thai': e.target.value })}
          containerClassName="dsvmd:w-60"
        />
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        keyword || status ? (
          <EmptyState
            icon="search"
            title={MESSAGES.noResults}
            action={
              <Button variant="secondary" onClick={() => update({ 'tu-khoa': null, 'trang-thai': null })}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="users" title="Trường chưa có giáo viên nào.">
            Tạo tài khoản cho giáo viên; mỗi người nhận email để tự đặt mật khẩu lần đầu.
          </EmptyState>
        )
      ) : (
        <div>
          <Table caption="Giáo viên của trường" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Họ và tên</Th>
                <Th>Tên đăng nhập</Th>
                <Th>Email</Th>
                <Th>Trạng thái</Th>
                <Th>Đăng nhập gần nhất</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((teacher) => (
                <Tr key={teacher.id}>
                  <Td className="font-medium">{teacher.fullName}</Td>
                  <Td className="type-mono-label">{teacher.username}</Td>
                  <Td className="whitespace-nowrap">{teacher.email}</Td>
                  <Td>
                    <AccountStatusBadge status={teacher.status} />
                  </Td>
                  <Td className="type-mono-label whitespace-nowrap">
                    {teacher.lastLoginAt ? formatDateTime(teacher.lastLoginAt) : <Blank />}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {teacher.status === 'LOCKED' ? (
                        <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'unlock', account: teacher })}>
                          <Icon name="unlock" size={16} />
                          Mở khóa
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'lock', account: teacher })}>
                          <Icon name="lock" size={16} />
                          Khóa
                        </Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => setAction({ kind: 'delete', account: teacher })}>
                        Xóa
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            label="giáo viên"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}

      <AccountFormDialog
        open={creating}
        accountRole="TEACHER"
        description="Giáo viên nhận email đặt mật khẩu lần đầu, liên kết có hiệu lực 48 giờ."
        onSubmit={orgApi.createTeacher}
        onCreated={(account, message) => {
          setCreating(false);
          toast.success(message ?? MESSAGES.passwordLinkSent(account.email ?? ''));
          void refresh();
        }}
        onClose={() => setCreating(false)}
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
    </AreaPage>
  );
}
