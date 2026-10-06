import type { DiscoveryFilter, HeritagePin } from '@dsvhvn/dung-chung/api';
import { readEmbedMapParams, type EmbedCommand } from '@dsvhvn/dung-chung/embed';
import { HERITAGE_TYPE_NAME, provinceName } from '@dsvhvn/dung-chung/i18n';
import { Button } from '@dsvhvn/dung-chung/ui';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { hasActiveFilter } from '../discovery/filters';
import { useMapPins } from '../discovery/queries';
import { Thumbnail } from '../discovery/Thumbnail';
import { useI18n } from '../i18n/context';
import { postToHost, useHostCommands } from './hostMessages';

// Trang bản đồ nhúng cho app mobile (và dùng được trực tiếp trên web): cùng bản đồ Leaflet + OpenStreetMap, cùng Hoàng Sa, Trường Sa với trang Bản đồ,
// nhưng không có thanh điều hướng. Bộ lọc, ngôn ngữ và ghim cần làm nổi nằm trên địa chỉ; app đổi bộ lọc hoặc làm nổi một ghim bằng lệnh `postMessage`.
// Chạm ghim mở thẻ di sản; bấm "Xem chi tiết" thì gửi thông điệp để app đi tới trang chi tiết di sản.

const HeritageMap = lazy(() => import('../discovery/HeritageMap'));

function EmbedPinCard({ pin }: { pin: HeritagePin }) {
  const { language, t } = useI18n();
  const meta = [provinceName(pin.provinceName, language), pin.heritageType ? HERITAGE_TYPE_NAME[language][pin.heritageType] : null].filter(Boolean).join(' · ');
  return (
    <article className="w-full text-on-background">
      <div className="relative h-[120px] bg-(--dsv-card-placeholder-bg)">
        <Thumbnail url={pin.thumbnailUrl} />
      </div>
      <div className="flex flex-col gap-2 px-4 pt-3 pb-4">
        <h2 className="type-h3">{pin.name}</h2>
        {meta && <p className="type-body-s text-on-surface-variant">{meta}</p>}
        {pin.isMachineTranslated && <p className="type-label text-on-surface-variant">{t.language.machineLabel}</p>}
        <Button className="mt-1 self-start" onClick={() => postToHost({ type: 'pin-selected', version: 1, slug: pin.slug })}>
          {t.map.viewDetail}
        </Button>
      </div>
    </article>
  );
}

export function EmbedMapPage() {
  const [params] = useSearchParams();
  const initial = useMemo(() => readEmbedMapParams(params), [params]);
  const { language, t } = useI18n();
  const [filter, setFilter] = useState<DiscoveryFilter>(initial.filter);
  const [selected, setSelected] = useState<string | null>(initial.select);
  const result = useMapPins(filter);
  const data = result.data;

  // Báo cho app biết dữ liệu ghim đã về (app ẩn màn hình chờ).
  useEffect(() => {
    if (result.isSuccess) postToHost({ type: 'ready', version: 1 });
  }, [result.isSuccess]);

  const onCommand = useCallback((command: EmbedCommand) => {
    if (command.type === 'focus') setSelected(command.slug);
    else setFilter({ keyword: command.filter.keyword, region: command.filter.region, heritageType: command.filter.heritageType });
  }, []);
  useHostCommands(onCommand);

  return (
    <div className="relative size-full isolate">
      <title>{t.documentTitle(t.map.title)}</title>
      <Suspense
        fallback={
          <div aria-busy="true" className="flex size-full items-center justify-center bg-surface-container-low">
            <p className="type-body-m text-on-surface-variant">{t.map.loading}</p>
          </div>
        }
      >
        <HeritageMap
          key={language}
          labels={t.map.base}
          closeLabel={t.map.closeCard}
          mapLabel={t.map.title}
          pins={data?.pins ?? []}
          selectedSlug={selected}
          onSelect={setSelected}
          fitKey={String(result.dataUpdatedAt)}
          fitToPins={hasActiveFilter(filter)}
          renderPopup={(pin) => <EmbedPinCard pin={pin} />}
        />
      </Suspense>
    </div>
  );
}
