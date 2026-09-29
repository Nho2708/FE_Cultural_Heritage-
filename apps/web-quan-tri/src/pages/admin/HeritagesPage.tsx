import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import type { ContentStatus, HeritageSummary, HeritageType, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import {
  formatDate,
  HERITAGE_STATUS_LABEL,
  HERITAGE_TYPE_LABEL,
  MESSAGES,
  RECOGNITION_LEVEL_LABEL,
} from '@dsvhvn/dung-chung';
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
import { PATHS } from '../../access/screens';
import { HeritageActionDialog, type HeritageAction } from '../../components/heritage/HeritageActionDialog';
import { HeritageStatusBadge } from '../../components/heritage/HeritageStatusBadge';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { adminHeritagesApi, type HeritageListQuery } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Quản lý di sản — quản trị hệ thống. Bảng di sản: ảnh, tên, tỉnh, loại, cấp xếp hạng, trạng thái (Nháp / Đã xuất bản /
// Đã ẩn), số giai đoạn, số nguồn; tìm theo tên (không phân biệt hoa thường và dấu), lọc theo tỉnh, loại, cấp xếp hạng,
// trạng thái; "Tạo di sản" mở Biên tập di sản ở trạng thái tạo mới. Ẩn, hiện lại và xóa qua hộp xác nhận chung: ẩn cho
// di sản đã xuất bản, hiện lại cho di sản đã ẩn (kiểm lại điều kiện xuất bản), xóa cho di sản nháp hoặc đã ẩn.

const TYPE_SLUG = slugMap<HeritageType>({
  TANGIBLE: 'vat-the',
  INTANGIBLE: 'phi-vat-the',
  NATURAL: 'thien-nhien',
  MIXED: 'hon-hop',
  DOCUMENTARY: 'tu-lieu',
});
const LEVEL_SLUG = slugMap<RecognitionLevel>({
  UNESCO: 'unesco',
  NATIONAL_SPECIAL: 'quoc-gia-dac-biet',
  NATIONAL: 'quoc-gia',
  PROVINCIAL: 'cap-tinh',
  NONE: 'chua-xep-hang',
});
const STATUS_SLUG = slugMap<ContentStatus>({ DRAFT: 'nhap', PUBLISHED: 'da-xuat-ban', ARCHIVED: 'da-an' });

function options<T extends string>(
  all: string,
  labels: Record<T, string>,
  slug: { toSlug: (value: T | '') => string },
) {
  return [{ value: '', label: all }, ...(Object.keys(labels) as T[]).map((v) => ({ value: slug.toSlug(v), label: labels[v] }))];
}

const TYPE_OPTIONS = options('Tất cả loại', HERITAGE_TYPE_LABEL, TYPE_SLUG);
const LEVEL_OPTIONS = options('Tất cả cấp xếp hạng', RECOGNITION_LEVEL_LABEL, LEVEL_SLUG);
const STATUS_OPTIONS = options('Tất cả trạng thái', HERITAGE_STATUS_LABEL, STATUS_SLUG);

function Thumbnail({ url }: { url: string | null }) {
  return (
    <span className="flex size-12 items-center justify-center overflow-hidden rounded-sm bg-surface-container-high">
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <Icon name="map-pin" size={20} className="text-on-surface-muted" />
      )}
    </span>
  );
}

export default function HeritagesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const keyword = params.get('tu-khoa') ?? '';
  const provinceParam = params.get('tinh') ?? '';
  const provinceId = /^\d+$/.test(provinceParam) ? Number(provinceParam) : '';
  const heritageType = TYPE_SLUG.fromSlug(params.get('loai'));
  const recognitionLevel = LEVEL_SLUG.fromSlug(params.get('cap'));
  const status = STATUS_SLUG.fromSlug(params.get('trang-thai'));
  const query: HeritageListQuery = { keyword, provinceId, heritageType, recognitionLevel, status, page, pageSize: PAGE_SIZE };
  const filtered = Boolean(keyword || provinceId || heritageType || recognitionLevel || status);

  const list = useQuery({
    queryKey: queryKeys.heritageList(query),
    queryFn: () => adminHeritagesApi.list(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const provinces = useQuery({
    queryKey: queryKeys.provinces,
    queryFn: () => adminHeritagesApi.provinces().then((r) => r.data),
    staleTime: Infinity,
  });
  const [action, setAction] = useState<HeritageAction | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.heritages });

  const provinceOptions = [
    { value: '', label: 'Tất cả tỉnh, thành phố' },
    ...(provinces.data ?? []).map((p) => ({ value: String(p.id), label: p.name ?? String(p.id) })),
  ];

  const act = (kind: HeritageAction['kind'], item: HeritageSummary) =>
    setAction({ kind, heritage: { id: item.id, name: item.name ?? '' } });

  const total = list.data?.totalItems;

  return (
    <AreaPage>
      <PageHeader
        title="Di sản"
        description={`${total === undefined ? '' : `${total} di sản. `}Nội dung tóm lược lại từ nguồn Cục Di sản văn hóa và luôn kèm nguồn tham chiếu.`}
        actions={
          <ButtonLink to={PATHS.newHeritage}>
            <Icon name="plus" size={16} />
            Tạo di sản
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
          <SearchForm
            key={keyword}
            label="Tìm theo tên di sản"
            placeholder="Tên di sản"
            value={keyword}
            onSearch={(value) => update({ 'tu-khoa': value })}
          />
        </div>
        <div className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
          <SelectField
            label="Tỉnh, thành phố"
            name="tinh"
            value={String(provinceId)}
            options={provinceOptions}
            onChange={(e) => update({ tinh: e.target.value })}
          />
          <SelectField
            label="Loại"
            name="loai"
            value={TYPE_SLUG.toSlug(heritageType)}
            options={TYPE_OPTIONS}
            onChange={(e) => update({ loai: e.target.value })}
          />
          <SelectField
            label="Cấp xếp hạng"
            name="cap"
            value={LEVEL_SLUG.toSlug(recognitionLevel)}
            options={LEVEL_OPTIONS}
            onChange={(e) => update({ cap: e.target.value })}
          />
          <SelectField
            label="Trạng thái"
            name="trang-thai"
            value={STATUS_SLUG.toSlug(status)}
            options={STATUS_OPTIONS}
            onChange={(e) => update({ 'trang-thai': e.target.value })}
          />
        </div>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon="search"
            title={MESSAGES.noResults}
            action={
              <Button
                variant="secondary"
                onClick={() => update({ 'tu-khoa': null, tinh: null, loai: null, cap: null, 'trang-thai': null })}
              >
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="map-pin"
            title="Chưa có di sản nào."
            action={
              <ButtonLink to={PATHS.newHeritage} variant="secondary">
                Tạo di sản
              </ButtonLink>
            }
          />
        )
      ) : (
        <div>
          <Table caption="Danh sách di sản" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Ảnh</Th>
                <Th>Tên</Th>
                <Th>Tỉnh</Th>
                <Th>Loại</Th>
                <Th>Cấp xếp hạng</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Số giai đoạn</Th>
                <Th className="text-right">Số nguồn</Th>
                <Th>Cập nhật</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Thumbnail url={item.thumbnailUrl} />
                  </Td>
                  <Td className="min-w-[200px]">
                    <Link to={PATHS.heritage(item.id)} className="font-medium text-link underline-offset-4 hover:underline">
                      {item.name}
                    </Link>
                  </Td>
                  <Td>{item.provinceName ?? <Blank />}</Td>
                  <Td>{item.heritageType ? HERITAGE_TYPE_LABEL[item.heritageType] : <Blank />}</Td>
                  <Td>{item.recognitionLevel ? RECOGNITION_LEVEL_LABEL[item.recognitionLevel] : <Blank />}</Td>
                  <Td>
                    <HeritageStatusBadge status={item.status} />
                  </Td>
                  <Td className="text-right type-mono-label">{item.timelineCount}</Td>
                  <Td className="text-right type-mono-label">{item.referenceCount}</Td>
                  <Td className="type-mono-label whitespace-nowrap">{formatDate(item.updatedAt ?? item.createdAt)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <ButtonLink
                        to={PATHS.heritage(item.id)}
                        size="icon"
                        variant="ghost"
                        aria-label={`Sửa di sản ${item.name ?? ''}`}
                      >
                        <Icon name="pencil" size={20} />
                      </ButtonLink>
                      {item.status === 'PUBLISHED' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Ẩn di sản ${item.name ?? ''}`}
                          onClick={() => act('archive', item)}
                        >
                          <Icon name="eye-off" size={20} />
                        </Button>
                      )}
                      {item.status === 'ARCHIVED' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Hiện lại di sản ${item.name ?? ''}`}
                          onClick={() => act('restore', item)}
                        >
                          <Icon name="eye" size={20} />
                        </Button>
                      )}
                      {item.status !== 'PUBLISHED' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Xóa di sản ${item.name ?? ''}`}
                          onClick={() => act('delete', item)}
                        >
                          <Icon name="trash" size={20} />
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            label="di sản"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}

      <HeritageActionDialog
        action={action}
        onDone={(kind, message) => {
          const done = { archive: 'Ẩn di sản', restore: 'Hiện lại di sản', delete: 'Xóa di sản' }[kind];
          setAction(null);
          toast.success(message ?? MESSAGES.success(done));
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
