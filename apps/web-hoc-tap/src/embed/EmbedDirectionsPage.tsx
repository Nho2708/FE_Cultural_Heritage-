import { ApiError } from '@dsvhvn/dung-chung/api';
import type { EmbedCommand, EmbedPosition } from '@dsvhvn/dung-chung/embed';
import { provinceName } from '@dsvhvn/dung-chung/i18n';
import { InlineMessage } from '@dsvhvn/dung-chung/ui';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { DirectionsPanel } from '../directions/DirectionsPanel';
import { useDirections } from '../directions/useDirections';
import { useHeritageDetail } from '../discovery/queries';
import { useI18n } from '../i18n/context';
import { postToHost, useHostCommands } from './hostMessages';

// Trang chỉ đường nhúng cho app mobile: bản đồ tuyến đường và các bước tới di sản, cùng bảng với trang chi tiết của web. Trang KHÔNG tự xin vị trí:
// app xin quyền của hệ điều hành rồi gửi vị trí bằng lệnh `set-position`; trang báo `ready` khi đã có tọa độ di sản. Vị trí chỉ nằm trong bộ nhớ của trang.

const LocationMap = lazy(() => import('../discovery/LocationMap'));

export function EmbedDirectionsPage() {
  const { slug = '' } = useParams();
  const { language, t } = useI18n();
  const query = useHeritageDetail(slug);
  const detail = query.data;
  const [position, setPosition] = useState<EmbedPosition | null>(null);

  useEffect(() => {
    if (query.isSuccess) postToHost({ type: 'ready', version: 1 });
  }, [query.isSuccess]);

  const onCommand = useCallback((command: EmbedCommand) => {
    if (command.type === 'set-position') setPosition(command.position);
  }, []);
  useHostCommands(onCommand);

  const latitude = detail?.latitude ?? null;
  const longitude = detail?.longitude ?? null;
  const destination = useMemo(() => (latitude !== null && longitude !== null ? { latitude, longitude } : null), [latitude, longitude]);
  const directions = useDirections({ destination: destination ?? { latitude: 0, longitude: 0 }, position: destination ? position : null });

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex size-full items-center justify-center bg-surface-container-low">
        <p className="type-body-m text-on-surface-variant">{t.detail.loading}</p>
      </div>
    );
  }
  if (query.isError || !detail || !destination) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="p-4">
        <InlineMessage tone="warning">{missing ? t.errors.notFoundTitle : !detail ? t.common.systemError : t.directions.noRoute}</InlineMessage>
      </div>
    );
  }

  const route = directions.status === 'ready' ? directions.route : null;
  return (
    <div className="flex size-full flex-col bg-background">
      <title>{t.documentTitle(t.directions.title)}</title>
      <div className="isolate h-[42%] min-h-[220px] shrink-0">
        <Suspense fallback={<div className="size-full bg-surface-container-low" />}>
          <LocationMap key={language} labels={t.map.base} latitude={destination.latitude} longitude={destination.longitude} label={provinceName(detail.province?.name, language)} route={route} startLabel={t.directions.start} />
        </Suspense>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DirectionsPanel controller={directions} destination={destination} destinationName={detail.name} idleText={t.directions.waitingPosition} scrollableSteps={false} className="flex flex-col gap-4 px-4 py-4" />
      </div>
    </div>
  );
}
