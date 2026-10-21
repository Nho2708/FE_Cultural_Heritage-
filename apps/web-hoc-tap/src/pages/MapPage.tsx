import type { DiscoveryFilter, HeritagePin } from '@dsvhvn/dung-chung/api';
import { Button, ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { lazy, Suspense, useMemo, useRef, useState, type Ref } from 'react';
import { Link, useSearchParams } from 'react-router';
import { pathOf } from '../access/screens';
import { ListNotes } from '../components/ListNotes';
import { PublicErrorState } from '../components/PublicErrorState';
import { ClearFilters, FilterSelects } from '../discovery/FilterSelects';
import { FILTER_PARAM, KEYWORD_MAX, KEYWORD_MIN, filterFromParams, hasActiveFilter, keywordInvalid, paramsFromFilter, selectFilterCount, toSearch } from '../discovery/filters';
import { directionsPathOf, heritagePath, timelinePath } from '../discovery/paths';
import { useIsGuest } from '../guest/guestData';
import { MapNearby } from '../guest/MapNearby';
import { mapPositionOf, useNearby } from '../guest/useNearby';
import { useOverlayPadding } from '../discovery/overlayPadding';
import { useFilterCatalog, useMapPins } from '../discovery/queries';
import { Thumbnail } from '../discovery/Thumbnail';
import { useI18n } from '../i18n/context';
import { formatCount, listFlags } from '../i18n/format';
import { HERITAGE_TYPE_NAME, provinceName } from '@dsvhvn/dung-chung/i18n';

// Bản đồ di sản (công khai). Leaflet chỉ được nạp khi mở trang này (React.lazy). Bộ lọc dùng chung với trang tìm kiếm
// nên "Xem trên bản đồ" giữ nguyên từ khóa và bộ lọc; ghim đang chọn nằm trên địa chỉ trang (`chon=<slug>`).

const HeritageMap = lazy(() => import('../discovery/HeritageMap'));

function MapSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" className="flex size-full items-center justify-center bg-surface-container-low">
      <p className="type-body-m text-on-surface-variant">{t.map.loading}</p>
    </div>
  );
}

/** Thẻ tóm tắt trong popup của ghim: ảnh, tên, tỉnh và loại, mô tả ngắn, nút xem chi tiết, mở dòng thời gian và chỉ đường (mở trang chi tiết với phần chỉ đường sẵn). */
function PinCard({ pin }: { pin: HeritagePin }) {
  const { language, t } = useI18n();
  const meta = [provinceName(pin.provinceName, language), pin.heritageType ? HERITAGE_TYPE_NAME[language][pin.heritageType] : null].filter(Boolean).join(' · ');
  return (
    <article className="w-full text-on-background">
      <div className="relative h-[152px] bg-(--dsv-card-placeholder-bg)">
        <Thumbnail url={pin.thumbnailUrl} />
      </div>
      <div className="flex flex-col gap-2 px-5 pt-4 pb-5">
        <h2 className="type-h3">{pin.name}</h2>
        {meta && <p className="type-body-s text-on-surface-variant">{meta}</p>}
        {pin.shortDescription && <p className="line-clamp-4 type-body-s">{pin.shortDescription}</p>}
        {pin.isMachineTranslated && <p className="type-label text-on-surface-variant">{t.language.machineLabel}</p>}
        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink to={heritagePath(pin.slug)} className="flex-1 px-3 text-on-primary!">
            {t.map.viewDetail}
          </ButtonLink>
          {pin.hasTimeline && (
            <ButtonLink to={timelinePath(pin.slug)} variant="secondary" className="flex-1 border-primary px-3 text-primary!">
              {t.map.openTimeline}
            </ButtonLink>
          )}
          <ButtonLink to={directionsPathOf(pin.slug)} variant="secondary" className="basis-full px-3">
            <Icon name="navigation" size={16} />
            {t.directions.button}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 type-label text-on-surface-variant">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-4 rounded-full border border-surface bg-primary shadow-1" />
        {t.map.legendSite}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="flex size-[18px] items-center justify-center rounded-full border border-surface bg-secondary-container text-[7px] text-on-secondary-container shadow-1">
          2
        </span>
        {t.map.legendCluster}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-[22px] rounded-full border border-surface bg-primary-active shadow-1" />
        {t.map.legendSelected}
      </li>
    </ul>
  );
}

function MapNote({
  matched,
  withoutLocation,
  truncated,
  listSearch,
  ref,
}: {
  matched: number;
  withoutLocation: number;
  truncated: boolean;
  listSearch: string;
  /** Để trang đo phần bản đồ bị thẻ này che (khi thẻ nổi ở màn hình rộng). */
  ref?: Ref<HTMLDivElement>;
}) {
  const { language, t } = useI18n();
  const located = matched - withoutLocation;
  return (
    <div ref={ref} className="flex flex-col gap-2.5 border-t border-border bg-surface px-4 py-3.5 dsvmd:absolute dsvmd:bottom-6 dsvmd:left-(--dsv-content-gutter) dsvmd:z-10 dsvmd:max-w-[560px] dsvmd:rounded-md dsvmd:border-0 dsvmd:shadow-1">
      <div className="flex items-start gap-2">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
        <div className="flex flex-col gap-0.5">
          <p className="type-h4 text-on-background">{t.map.located(formatCount(located, language))}</p>
          {withoutLocation > 0 && (
            <p className="type-body-s text-on-surface-variant">
              {t.map.withoutLocation(formatCount(withoutLocation, language))}{' '}
              <Link to={{ pathname: pathOf('search'), search: listSearch }} className="text-link underline underline-offset-4">
                {t.map.viewInList}
              </Link>
            </p>
          )}
          {truncated && <p className="type-body-s text-on-surface-variant">{t.map.truncated}</p>}
        </div>
      </div>
      <Legend />
    </div>
  );
}

export function MapPage() {
  const [params, setParams] = useSearchParams();
  const { language, t } = useI18n();
  const filter = useMemo(() => filterFromParams(params), [params]);
  const selectedSlug = params.get(FILTER_PARAM.select);
  const catalog = useFilterCatalog();
  const result = useMapPins(filter);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // "Gần bạn" chỉ cho khách; khách bấm nút mới hỏi vị trí (không tự hỏi khi mở trang để không đè lên ghim đang chọn từ địa chỉ trang).
  const guest = useIsGuest();
  const nearby = useNearby({ auto: false });
  // Thanh bộ lọc và thẻ ghi chú nổi trên bản đồ: đo phần bị che để khung nhìn cả nước không mất cực Bắc và Cà Mau.
  const areaRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<HTMLDivElement | null>(null);
  const fitPadding = useOverlayPadding(areaRef, barRef, note);

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
  const invalidKeyword = keywordInvalid(filter.keyword);
  const active = selectFilterCount(filter);
  const listSearch = toSearch(paramsFromFilter(filter));
  const flags = listFlags(data?.pins ?? []);

  return (
    <div className="relative flex h-[calc(100dvh-var(--dsv-topbar-height))] min-h-[560px] flex-col">
      <title>{t.documentTitle(t.map.title)}</title>
      <div ref={areaRef} className="relative min-h-0 flex-1">
        {/* Lớp riêng để các lớp z-index bên trong Leaflet (400-1000) không nổi lên trên thanh lọc và thẻ nổi. */}
        <div className="absolute inset-0 isolate">
          <Suspense fallback={<MapSkeleton />}>
            <HeritageMap
              key={language}
              labels={t.map.base}
              closeLabel={t.map.closeCard}
              mapLabel={t.map.title}
              pins={data?.pins ?? []}
              selectedSlug={selectedSlug}
              onSelect={select}
              fitKey={String(result.dataUpdatedAt)}
              fitToPins={hasActiveFilter(filter)}
              renderPopup={(pin) => <PinCard pin={pin} />}
              userPosition={mapPositionOf(nearby)}
              userLabel={t.guest.nearby.title}
              fitPadding={fitPadding}
            />
          </Suspense>
        </div>

        <div ref={barRef} className="absolute inset-x-3 top-3 z-10 flex flex-col gap-3 rounded-md bg-surface p-3 shadow-1 dsvmd:inset-x-(--dsv-content-gutter) dsvmd:top-6 dsvmd:flex-row dsvmd:items-center dsvmd:px-4 dsvmd:py-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="type-h3 whitespace-nowrap text-on-background">{t.map.title}</h1>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="bo-loc-ban-do"
              onClick={() => setFiltersOpen((open) => !open)}
              className="flex h-11 items-center gap-1.5 rounded-sm border border-(--dsv-input-border) px-3 type-control text-on-surface dsvmd:hidden"
            >
              <Icon name="filter" size={18} />
              {t.map.filters}
              {active > 0 || filter.keyword ? ` (${active + (filter.keyword ? 1 : 0)})` : ''}
            </button>
          </div>
          <span aria-hidden="true" className="hidden h-7 w-px bg-border dsvmd:block" />
          <div id="bo-loc-ban-do" className={filtersOpen ? 'flex flex-col gap-3 dsvmd:flex-1 dsvmd:flex-row dsvmd:items-center' : 'hidden dsvmd:flex dsvmd:flex-1 dsvmd:flex-row dsvmd:items-center dsvmd:gap-3'}>
            {filter.keyword && (
              <button
                type="button"
                onClick={() => setFilter({ ...filter, keyword: undefined })}
                aria-label={t.map.removeKeyword(filter.keyword)}
                className="flex h-11 max-w-full shrink-0 items-center gap-2 rounded-full bg-primary-container px-4 type-body-s text-on-primary-container"
              >
                <span className="truncate">{t.map.keywordChip(filter.keyword)}</span>
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
          <ListNotes flags={flags} compact />
        </div>

        {guest && <MapNearby nearby={nearby} pins={data?.pins ?? []} onSelect={select} />}

        {(invalidKeyword || result.isError || (data && data.totalMatched === 0)) && (
          <div className="absolute inset-x-3 top-1/2 z-10 mx-auto flex max-w-[480px] -translate-y-1/2 flex-col items-start gap-3 rounded-md bg-surface p-5 shadow-2">
            {invalidKeyword ? (
              <p className="type-body-m text-on-background">{t.keyword.invalid(KEYWORD_MIN, KEYWORD_MAX)}</p>
            ) : result.isError && !data ? (
              <PublicErrorState error={result.error} onRetry={() => void result.refetch()} />
            ) : (
              <>
                <p className="type-h4 text-on-background">{t.common.noResults}</p>
                <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                  {t.common.clearFilters}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {data && <MapNote ref={setNote} matched={data.totalMatched} withoutLocation={data.withoutLocation} truncated={data.isTruncated} listSearch={listSearch} />}
    </div>
  );
}
