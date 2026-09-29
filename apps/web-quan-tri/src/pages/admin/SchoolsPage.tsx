import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../../access/screens';
import { DeactivateOrganizationDialog } from '../../components/account/DeactivateOrganizationDialog';
import { OrganizationStateBadge } from '../../components/account/OrganizationStateBadge';
import { SubscriptionBadge } from '../../components/account/SubscriptionSummary';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import {
  Blank,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Icon,
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
import { adminOrganizationsApi, type OrganizationListQuery } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import type { OrganizationState, OrganizationSummary } from '@dsvhvn/dung-chung/api';
import { formatDate, MESSAGES, ORGANIZATION_STATE_LABEL } from '@dsvhvn/dung-chung';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Quản lý trường — quản trị hệ thống. Bảng trường: tên, email, gói hiện tại, trạng thái gói, số giáo viên, ngày tạo,
// trạng thái; tìm theo tên / email, lọc trạng thái; "Tạo trường" mở Chi tiết trường ở trạng thái tạo mới; ngừng trường
// qua hộp xác nhận chung. Quản trị hệ thống thấy mọi trường, kể cả trường đã ngừng.

const STATE_SLUG = slugMap<OrganizationState>({ ACTIVE: 'dang-hoat-dong', DEACTIVATED: 'da-ngung' });

const STATE_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...(Object.keys(ORGANIZATION_STATE_LABEL) as OrganizationState[]).map((s) => ({
    value: STATE_SLUG.toSlug(s),
    label: ORGANIZATION_STATE_LABEL[s],
  })),
];

export default function SchoolsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const keyword = params.get('tu-khoa') ?? '';
  const status = STATE_SLUG.fromSlug(params.get('trang-thai'));
  const query: OrganizationListQuery = { keyword, status, page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: queryKeys.organizationList(query),
    queryFn: () => adminOrganizationsApi.list(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const [deactivating, setDeactivating] = useState<OrganizationSummary | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations });

  return (
    <AreaPage>
      <PageHeader
        title="Quản lý trường"
        description="Tạo trường cùng tài khoản quản trị trường đầu tiên; trường mới được gán gói Miễn phí."
        actions={
          <ButtonLink to={PATHS.newSchool}>
            <Icon name="plus" size={16} />
            Tạo trường
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
        <SearchForm
          key={keyword}
          label="Tìm trường"
          placeholder="Tên trường hoặc email"
          value={keyword}
          onSearch={(value) => update({ 'tu-khoa': value })}
        />
        <SelectField
          label="Trạng thái"
          name="trang-thai"
          value={STATE_SLUG.toSlug(status)}
          options={STATE_OPTIONS}
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
          <EmptyState
            icon="building"
            title="Chưa có trường nào."
            action={
              <ButtonLink to={PATHS.newSchool} variant="secondary">
                Tạo trường
              </ButtonLink>
            }
          />
        )
      ) : (
        <div>
          <Table caption="Danh sách trường" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Tên trường</Th>
                <Th>Email</Th>
                <Th>Gói hiện tại</Th>
                <Th>Trạng thái gói</Th>
                <Th className="text-right">Giáo viên</Th>
                <Th>Ngày tạo</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((org) => (
                <Tr key={org.id}>
                  <Td>
                    <Link to={PATHS.school(org.id)} className="font-medium text-link underline-offset-4 hover:underline">
                      {org.name}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">{org.email ?? <Blank />}</Td>
                  <Td>{org.planName ?? <Blank />}</Td>
                  <Td>
                    {org.subscriptionStatus ? (
                      <SubscriptionBadge status={org.subscriptionStatus} effective={org.hasEffectivePlan} />
                    ) : (
                      <Blank />
                    )}
                  </Td>
                  <Td className="text-right type-mono-label">{org.teacherCount}</Td>
                  <Td className="type-mono-label whitespace-nowrap">{formatDate(org.createdAt)}</Td>
                  <Td>
                    <OrganizationStateBadge state={org.status} />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <ButtonLink to={PATHS.school(org.id)} size="sm" variant="secondary">
                        Xem
                      </ButtonLink>
                      {org.status === 'ACTIVE' && (
                        <Button size="sm" variant="danger" onClick={() => setDeactivating(org)}>
                          Ngừng
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            label="trường"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}

      <DeactivateOrganizationDialog
        organization={deactivating}
        onDone={(message) => {
          setDeactivating(null);
          toast.success(message ?? MESSAGES.success('Ngừng trường'));
          void refresh();
        }}
        onFailed={(message) => {
          setDeactivating(null);
          toast.error(message);
          void refresh();
        }}
        onClose={() => setDeactivating(null)}
      />
    </AreaPage>
  );
}
