import { MESSAGES } from '@dsvhvn/dung-chung';
import type { DiscoveryFilter } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, Icon } from '@dsvhvn/dung-chung/ui';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { pathOf } from '../access/screens';
import { ClearFilters, FilterSelects } from '../discovery/FilterSelects';
import { filterFromParams, keywordError, pageFromParams, paramsFromFilter, toSearch } from '../discovery/filters';
import { HeritageCard } from '../discovery/HeritageCard';
import { KeywordSearch } from '../discovery/KeywordSearch';
import { NumberedPagination } from '../discovery/NumberedPagination';
import { useFilterCatalog, useSearch } from '../discovery/queries';

// Tìm kiếm và lọc di sản (công khai). Từ khóa và bộ lọc nằm trên địa chỉ trang; đổi bộ lọc thì về trang 1. Kết quả do
// máy chủ xếp: cụm từ khóa nằm nguyên trong tên trước, rồi cấp xếp hạng cao trước.

const PAGE_SIZE = 12;

function SkeletonGrid() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid grid-cols-1 gap-6 dsvsm:grid-cols-2 dsvmd:grid-cols-3 dsvlg:grid-cols-4">
      <span className="sr-only">Đang tải danh sách di sản…</span>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-[5/4] animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-5 w-2/3 animate-pulse rounded-xs bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const filter = useMemo(() => filterFromParams(params), [params]);
  const page = pageFromParams(params);
  const catalog = useFilterCatalog();
  const result = useSearch(filter, page, PAGE_SIZE);

  const apply = (next: DiscoveryFilter, nextPage = 1) => setParams(paramsFromFilter(next, { page: nextPage }));
  const clear = () => setParams(new URLSearchParams());
  const mapSearch = toSearch(paramsFromFilter(filter));
  const invalidKeyword = keywordError(filter.keyword);
  const data = result.data;

  return (
    <>
      <title>Tìm kiếm và lọc di sản · Học di sản</title>
      <section aria-labelledby="tieu-de-tim-kiem" className="bg-surface-container-low pt-12 pb-8">
        <div className="dsv-content flex flex-col gap-6">
          <h1 id="tieu-de-tim-kiem" className="type-display-l text-on-background">
            Tìm kiếm và lọc di sản
          </h1>
          <KeywordSearch
            key={filter.keyword ?? ''}
            large
            value={filter.keyword ?? ''}
            placeholder={'Nhập tên di sản, tỉnh hoặc từ khóa, ví dụ "cồng chiêng"'}
            externalError={invalidKeyword}
            onSearch={(keyword) => apply({ ...filter, keyword: keyword || undefined })}
          />
          <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-center">
            <p className="flex shrink-0 items-center gap-1.5 type-body-s text-on-surface-variant">
              <Icon name="filter" size={18} />
              Lọc theo
            </p>
            <FilterSelects
              catalog={catalog.data}
              filter={filter}
              onChange={(next) => apply(next)}
              className="grid flex-1 grid-cols-2 gap-3 dsvmd:grid-cols-[236fr_160fr_160fr_216fr_176fr]"
            />
            <ClearFilters filter={filter} onClear={clear} className="self-start dsvmd:self-center" />
          </div>
        </div>
      </section>

      <section aria-label="Kết quả" className="dsv-content py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="type-h2 text-on-background" aria-live="polite">
              {data ? `${data.totalItems.toLocaleString('vi-VN')} di sản` : 'Di sản'}
            </h2>
            <p className="type-body-s text-on-surface-variant">Cấp xếp hạng cao xếp trước</p>
          </div>
          <Link
            to={{ pathname: pathOf('map'), search: mapSearch }}
            className="inline-flex h-11 items-center gap-2 rounded-sm border-[1.5px] border-primary px-5 type-control text-primary transition-colors hover:bg-link-hover-bg"
          >
            <Icon name="map" size={20} />
            Xem trên bản đồ
          </Link>
        </div>

        {result.isError && !data ? (
          <ErrorState error={result.error} onRetry={() => void result.refetch()} />
        ) : invalidKeyword ? null : !data ? (
          <SkeletonGrid />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon="search"
            title={MESSAGES.noResults}
            action={
              <Button variant="secondary" onClick={clear}>
                Xóa bộ lọc
              </Button>
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-10 dsvsm:grid-cols-2 dsvmd:grid-cols-3 dsvlg:grid-cols-4">
              {data.items.map((card) => (
                <HeritageCard key={card.id} card={card} />
              ))}
            </ul>
            <NumberedPagination
              page={data.page}
              pageSize={data.pageSize}
              totalItems={data.totalItems}
              totalPages={data.totalPages}
              unit="di sản"
              onChange={(next) => apply(filter, next)}
            />
          </>
        )}
      </section>
    </>
  );
}
