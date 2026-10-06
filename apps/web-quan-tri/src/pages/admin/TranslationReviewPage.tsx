import { formatDateTime } from '@dsvhvn/dung-chung';
import { TRANSLATION_KIND_HINT, TRANSLATION_KIND_LABEL } from '@dsvhvn/dung-chung';
import type { TranslationQueueItem } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, Icon, LoadingState, Pagination, SelectField, Table, TabPanel, Tabs, Td, Th, Tr } from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { ReviewPanel } from '../../components/translation/ReviewPanel';
import { LANGUAGE_CODES, LANGUAGE_NAME, isLanguage } from '../../components/translation/translationLabels';
import { KIND_SLUG, REVIEW_TABS, itemParam, readItem, readKind, readReviewTab, type ReviewItemRef } from '../../components/translation/translationLinks';
import { StatusBadge } from '../../components/translation/translationUi';
import { adminHeritagesApi, adminTranslationsApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, readPage } from '../../lib/listParams';

// Duyệt bản dịch và tóm tắt — quản trị hệ thống. Hàng chờ các tóm tắt tiếng Việt và bản dịch, tóm tắt tiếng Anh do AI tạo; mở một mục thì hiện khung hai
// cột (bản gốc tiếng Việt bên trái, bản chờ duyệt bên phải, sửa được tại chỗ) với "Duyệt" và "Từ chối". Tab: Chờ duyệt (có số đếm), Đã duyệt (sửa lại thì quay về
// Chờ duyệt), Bản dịch máy (tiếng Hàn, Trung, Nhật: chỉ xem), Bị từ chối (chờ dịch lại). Tab, bộ lọc, mục đang mở và số trang nằm trên URL.

const TAB_PREFIX = 'duyet';

const KIND_OPTIONS = [
  { value: '', label: 'Bản dịch và tóm tắt' },
  { value: KIND_SLUG.TRANSLATION, label: TRANSLATION_KIND_LABEL.TRANSLATION },
  { value: KIND_SLUG.SUMMARY, label: TRANSLATION_KIND_LABEL.SUMMARY },
];

const LANGUAGE_OPTIONS = [{ value: '', label: 'Tất cả ngôn ngữ' }, ...LANGUAGE_CODES.map((code) => ({ value: code, label: LANGUAGE_NAME[code] }))];

export default function TranslationReviewPage() {
  const [params, setParams] = useSearchParams();
  const tab = readReviewTab(params.get('tab'));
  const heritageParam = Number(params.get('di-san'));
  const heritageId = Number.isSafeInteger(heritageParam) && heritageParam > 0 ? heritageParam : undefined;
  const languageParam = params.get('ngon-ngu');
  const language = isLanguage(languageParam) ? languageParam : undefined;
  const kind = readKind(params.get('loai'));
  const page = readPage(params.get('trang'));
  const selected = readItem(params.get('muc'));

  const update = useCallback(
    (changes: Record<string, string | number | null>, keepPage = false) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '' || (key === 'trang' && value === 1)) next.delete(key);
            else next.set(key, String(value));
          }
          if (!keepPage && !('trang' in changes)) next.delete('trang');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const query = { tab: tab.tab, heritageId, language, kind: kind || undefined, page, pageSize: PAGE_SIZE };
  const list = useQuery({
    queryKey: queryKeys.translationQueue(query),
    queryFn: () => adminTranslationsApi.queue(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const counts = useQuery({
    queryKey: queryKeys.translationCounts,
    queryFn: () => adminTranslationsApi.counts().then((r) => r.data),
  });
  const heritages = useQuery({
    queryKey: queryKeys.translationHeritages,
    queryFn: () => adminHeritagesApi.list({ pageSize: 100, page: 1 }).then((r) => r.data.items),
    staleTime: 5 * 60_000,
  });

  const tabs = REVIEW_TABS.map((item) => ({
    id: item.slug,
    label: item.tab === 'PENDING' && counts.data ? `${item.label} (${counts.data.pending})` : item.label,
  }));
  const heritageOptions = [
    { value: '', label: 'Tất cả di sản' },
    ...(heritages.data ?? []).map((heritage) => ({ value: String(heritage.id), label: heritage.name ?? String(heritage.id) })),
  ];
  const filtered = Boolean(heritageId || language || kind);

  const open = (item: TranslationQueueItem) =>
    update({ muc: itemParam({ heritageId: item.heritageId, kind: item.kind, language: item.language }) }, true);
  const isSelected = (item: TranslationQueueItem, ref: ReviewItemRef | null) =>
    ref !== null && ref.heritageId === item.heritageId && ref.kind === item.kind && ref.language === item.language;

  return (
    <AreaPage>
      <PageHeader
        title="Duyệt bản dịch và tóm tắt"
        description="Tóm tắt tiếng Việt, bản dịch và tóm tắt tiếng Anh do AI tạo phải được duyệt trước khi hiện công khai. Bản tiếng Hàn, Trung, Nhật là bản dịch máy, không có bước duyệt."
      />

      <Tabs idPrefix={TAB_PREFIX} label="Trạng thái bản dịch" items={tabs} value={tab.slug} onChange={(slug) => update({ tab: slug === REVIEW_TABS[0]!.slug ? null : slug, muc: null })} />

      <TabPanel idPrefix={TAB_PREFIX} id={tab.slug}>
        <div className="flex flex-col gap-6">
        <div className="grid gap-3 dsvsm:grid-cols-3">
          <SelectField
            label="Di sản"
            value={heritageId ? String(heritageId) : ''}
            options={heritageOptions}
            onChange={(event) => update({ 'di-san': event.target.value })}
          />
          <SelectField label="Ngôn ngữ" value={language ?? ''} options={LANGUAGE_OPTIONS} onChange={(event) => update({ 'ngon-ngu': event.target.value })} />
          <SelectField label="Loại" value={kind ? KIND_SLUG[kind] : ''} options={KIND_OPTIONS} onChange={(event) => update({ loai: event.target.value })} />
        </div>

        {tab.tab === 'APPROVED' && <p className="type-body-s text-on-surface-variant">Sửa bản đã duyệt thì bản đó quay về tab Chờ duyệt và ngừng hiện cho khách cho tới khi được duyệt lại.</p>}

        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon="languages"
            title={filtered ? 'Không có mục nào khớp bộ lọc.' : `Không có bản nào ở tab ${tab.label}.`}
            action={
              filtered ? (
                <Button variant="secondary" onClick={() => update({ 'di-san': null, 'ngon-ngu': null, loai: null })}>
                  Bỏ bộ lọc
                </Button>
              ) : undefined
            }
          >
            {tab.tab === 'PENDING' && !filtered ? 'Bản dịch và tóm tắt do AI tạo sẽ xuất hiện ở đây để bạn duyệt. Bấm "Dịch và tóm tắt bằng AI" ở tab Bản dịch và tóm tắt của một di sản.' : undefined}
          </EmptyState>
        ) : (
          <div>
            <Table caption={`Danh sách ${tab.label.toLowerCase()}`} busy={list.isFetching}>
              <thead>
                <tr>
                  <Th>Di sản</Th>
                  <Th>Loại</Th>
                  <Th>Ngôn ngữ</Th>
                  <Th>Ngày yêu cầu</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">
                    <span className="sr-only">Mở</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((item) => {
                  const active = isSelected(item, selected);
                  return (
                    <Tr key={`${item.heritageId}.${item.kind}.${item.language}`} className={active ? 'bg-primary-container/40' : undefined}>
                      <Td className="min-w-[220px]">
                        <button
                          type="button"
                          aria-current={active ? 'true' : undefined}
                          onClick={() => open(item)}
                          className="text-left font-medium text-link underline-offset-4 hover:underline"
                        >
                          {item.heritageName}
                        </button>
                      </Td>
                      <Td>
                        <span className="block font-medium">{TRANSLATION_KIND_LABEL[item.kind]}</span>
                        <span className="block type-label text-on-surface-variant">{TRANSLATION_KIND_HINT[item.kind]}</span>
                      </Td>
                      <Td lang={item.language}>{LANGUAGE_NAME[item.language]}</Td>
                      <Td className="type-mono-label whitespace-nowrap">{formatDateTime(item.requestedAt)}</Td>
                      <Td>
                        <StatusBadge status={item.status} outdated={item.isOutdated} />
                      </Td>
                      <Td className="text-right">
                        <Icon name="chevron-right" size={20} className="inline text-on-surface-variant" />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              label="bản dịch và tóm tắt"
              page={list.data.page}
              pageSize={list.data.pageSize}
              totalItems={list.data.totalItems}
              totalPages={list.data.totalPages}
              onChange={(next) => update({ trang: next }, true)}
            />
          </div>
        )}
        </div>
      </TabPanel>

      {selected && <ReviewPanel key={itemParam(selected)} item={selected} onResolved={() => update({ muc: null }, true)} />}
    </AreaPage>
  );
}
