import { HERITAGE_TYPE_LABEL, MESSAGES } from '@dsvhvn/dung-chung';
import type { DiscoveryFilter, HeritagePin } from '@dsvhvn/dung-chung/api';
import { Button, ButtonLink, ErrorState, Icon } from '@dsvhvn/dung-chung/ui';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { pathOf } from '../access/screens';
import { ClearFilters, FilterSelects } from '../discovery/FilterSelects';
import { FILTER_PARAM, filterFromParams, hasActiveFilter, keywordError, paramsFromFilter, selectFilterCount, toSearch } from '../discovery/filters';
import { heritagePath, timelinePath } from '../discovery/paths';
import { useFilterCatalog, useMapPins } from '../discovery/queries';
import { Thumbnail } from '../discovery/Thumbnail';

// Bản đồ di sản (công khai). Leaflet chỉ được nạp khi mở trang này (React.lazy). Bộ lọc dùng chung với trang tìm kiếm
// nên "Xem trên bản đồ" giữ nguyên từ khóa và bộ lọc; ghim đang chọn nằm trên địa chỉ trang (`chon=<slug>`).

const HeritageMap = lazy(() => import('../discovery/HeritageMap'));

function MapSkeleton() {
  return (
    <div aria-busy="true" className="flex size-full items-center justify-center bg-surface-container-low">
      <p className="type-body-m text-on-surface-variant">Đang tải bản đồ…</p>
    </div>
  );
}

/** Thẻ tóm tắt trong popup của ghim: ảnh, tên, tỉnh và loại, mô tả ngắn, hai nút. */
function PinCard({ pin }: { pin: HeritagePin }) {
  const meta = [pin.provinceName, pin.heritageType ? HERITAGE_TYPE_LABEL[pin.heritageType] : null].filter(Boolean).join(' · ');
  return (
    <article className="w-full text-on-background">
      <div className="relative h-[152px] bg-(--dsv-card-placeholder-bg)">
        <Thumbnail url={pin.thumbnailUrl} />
      </div>
      <div className="flex flex-col gap-2 px-5 pt-4 pb-5">
        <h2 className="type-h3">{pin.name}</h2>
        {meta && <p className="type-body-s text-on-surface-variant">{meta}</p>}
        {pin.shortDescription && <p className="line-clamp-4 type-body-s">{pin.shortDescription}</p>}
        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink to={heritagePath(pin.slug)} className="flex-1 px-3 text-on-primary!">
            Xem chi tiết
          </ButtonLink>
          {pin.hasTimeline && (
            <ButtonLink to={timelinePath(pin.slug)} variant="secondary" className="flex-1 border-primary px-3 text-primary!">
              Mở dòng thời gian
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 type-label text-on-surface-variant">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-4 rounded-full border border-surface bg-primary shadow-1" />
        Di sản
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="flex size-[18px] items-center justify-center rounded-full border border-surface bg-secondary-container text-[7px] text-on-secondary-container shadow-1">
          2
        </span>
        Nhóm di sản gần nhau
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-[22px] rounded-full border border-surface bg-primary-active shadow-1" />
        Đang chọn
      </li>
    </ul>
  );
}

function MapNote({ matched, withoutLocation, truncated, listSearch }: { matched: number; withoutLocation: number; truncated: boolean; listSearch: string }) {
  const located = matched - withoutLocation;
  return (
    <div className="flex flex-col gap-2.5 border-t border-border bg-surface px-4 py-3.5 dsvmd:absolute dsvmd:bottom-6 dsvmd:left-(--dsv-content-gutter) dsvmd:z-10 dsvmd:max-w-[560px] dsvmd:rounded-md dsvmd:border-0 dsvmd:shadow-1">
      <div className="flex items-start gap-2">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
        <div className="flex flex-col gap-0.5">
          <p className="type-h4 text-on-background">{located.toLocaleString('vi-VN')} di sản có vị trí trên bản đồ</p>
          {withoutLocation > 0 && (
            <p className="type-body-s text-on-surface-variant">
              {withoutLocation.toLocaleString('vi-VN')} di sản khớp bộ lọc nhưng không có vị trí trên bản đồ (thường là di sản phi vật thể).{' '}
              <Link to={{ pathname: pathOf('search'), search: listSearch }} className="text-link underline underline-offset-4">
                Xem trong danh sách
              </Link>
            </p>
          )}
          {truncated && (
            <p className="type-body-s text-on-surface-variant">Bản đồ chỉ hiện 500 ghim đầu tiên. Hãy chọn thêm bộ lọc để thu hẹp.</p>
          )}
        </div>
      </div>
      <Legend />
    </div>
  );
}

export function MapPage() {
  const [params, setParams] = useSearchParams();
  const filter = useMemo(() => filterFromParams(params), [params]);
  const selectedSlug = params.get(FILTER_PARAM.select);
  const catalog = useFilterCatalog();
  const result = useMapPins(filter);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setFilter = (next: DiscoveryFilter) => setParams(paramsFromFilter(next));
  const select = (slug: string | null) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (slug) next.set(FILTER_PARAM.select, slug);
        else next.delete(FILTER_PARAM.select);
        return next;
      },
      { replace: true },
    );
  const data = result.data;
  const invalidKeyword = keywordError(filter.keyword);
  const active = selectFilterCount(filter);
  const listSearch = toSearch(paramsFromFilter(filter));

  return (
    <div className="relative flex h-[calc(100dvh-var(--dsv-topbar-height))] min-h-[560px] flex-col">
      <title>Bản đồ di sản · Học di sản</title>
      <div className="relative min-h-0 flex-1">
        {/* Lớp riêng để các lớp z-index bên trong Leaflet (400-1000) không nổi lên trên thanh lọc và thẻ nổi. */}
        <div className="absolute inset-0 isolate">
          <Suspense fallback={<MapSkeleton />}>
            <HeritageMap
              pins={data?.pins ?? []}
              selectedSlug={selectedSlug}
              onSelect={select}
              fitKey={String(result.dataUpdatedAt)}
              fitToPins={hasActiveFilter(filter)}
              renderPopup={(pin) => <PinCard pin={pin} />}
            />
          </Suspense>
        </div>

        <div className="absolute inset-x-3 top-3 z-10 flex flex-col gap-3 rounded-md bg-surface p-3 shadow-1 dsvmd:inset-x-(--dsv-content-gutter) dsvmd:top-6 dsvmd:flex-row dsvmd:items-center dsvmd:px-4 dsvmd:py-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="type-h3 whitespace-nowrap text-on-background">Bản đồ di sản</h1>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="bo-loc-ban-do"
              onClick={() => setFiltersOpen((open) => !open)}
              className="flex h-11 items-center gap-1.5 rounded-sm border border-(--dsv-input-border) px-3 type-control text-on-surface dsvmd:hidden"
            >
              <Icon name="filter" size={18} />
              Bộ lọc{active > 0 || filter.keyword ? ` (${active + (filter.keyword ? 1 : 0)})` : ''}
            </button>
          </div>
          <span aria-hidden="true" className="hidden h-7 w-px bg-border dsvmd:block" />
          <div id="bo-loc-ban-do" className={filtersOpen ? 'flex flex-col gap-3 dsvmd:flex-1 dsvmd:flex-row dsvmd:items-center' : 'hidden dsvmd:flex dsvmd:flex-1 dsvmd:flex-row dsvmd:items-center dsvmd:gap-3'}>
            {filter.keyword && (
              <button
                type="button"
                onClick={() => setFilter({ ...filter, keyword: undefined })}
                aria-label={`Bỏ từ khóa ${filter.keyword}`}
                className="flex h-11 max-w-full shrink-0 items-center gap-2 rounded-full bg-primary-container px-4 type-body-s text-on-primary-container"
              >
                <span className="truncate">Từ khóa: {filter.keyword}</span>
                <Icon name="x" size={16} className="shrink-0" />
              </button>
            )}
            <FilterSelects
              catalog={catalog.data}
              filter={filter}
              onChange={setFilter}
              className="grid grid-cols-2 gap-3 dsvmd:flex dsvmd:flex-1 dsvmd:flex-wrap"
              itemClassName="dsvmd:grow dsvmd:basis-[150px] dsvmd:first:grow-[1.6]"
            />
            <ClearFilters filter={filter} onClear={() => setParams(new URLSearchParams())} className="self-start whitespace-nowrap" />
          </div>
        </div>

        {(invalidKeyword || result.isError || (data && data.totalMatched === 0)) && (
          <div className="absolute inset-x-3 top-1/2 z-10 mx-auto flex max-w-[480px] -translate-y-1/2 flex-col items-start gap-3 rounded-md bg-surface p-5 shadow-2">
            {invalidKeyword ? (
              <p className="type-body-m text-on-background">{invalidKeyword}</p>
            ) : result.isError && !data ? (
              <ErrorState error={result.error} onRetry={() => void result.refetch()} />
            ) : (
              <>
                <p className="type-h4 text-on-background">{MESSAGES.noResults}</p>
                <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                  Xóa bộ lọc
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {data && <MapNote matched={data.totalMatched} withoutLocation={data.withoutLocation} truncated={data.isTruncated} listSearch={listSearch} />}
    </div>
  );
}
