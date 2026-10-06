import { NEARBY_OUTSIDE_VIETNAM, type HeritagePin } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage } from '@dsvhvn/dung-chung/ui';
import { provinceName } from '@dsvhvn/dung-chung/i18n';
import { useState } from 'react';
import { Link } from 'react-router';
import { PublicErrorState } from '../components/PublicErrorState';
import { heritagePath } from '../discovery/paths';
import { useI18n } from '../i18n/context';
import { useDistanceText } from './useDistanceText';
import type { NearbyController } from './useNearby';

// "Gần bạn" trên trang bản đồ (chỉ khách): nút nổi ở góc dưới bên phải. Bấm thì trình duyệt hỏi quyền vị trí (nếu chưa hỏi), bản đồ về vị trí của khách và hiện
// bảng tối đa 6 di sản gần nhất kèm khoảng cách; chọn một dòng thì mở ghim đó trên bản đồ. Khách không cho dùng vị trí (hoặc trình duyệt không hỗ trợ) thì nút ẩn.
// Vị trí chỉ nằm trong bộ nhớ của trang, không lưu và không vào địa chỉ trang.

export function MapNearby({ nearby, pins, onSelect }: { nearby: NearbyController; pins: HeritagePin[]; onSelect: (slug: string) => void }) {
  const { language, t } = useI18n();
  const n = t.guest.nearby;
  const distanceText = useDistanceText();
  const [panelOpen, setPanelOpen] = useState(false);
  const { status, result } = nearby;

  if (nearby.permission === null || nearby.permission === 'unsupported' || nearby.permission === 'denied' || status === 'denied') return null;
  const busy = status === 'locating' || status === 'loading';

  const body = () => {
    if (status === 'unavailable') return <InlineMessage tone="warning">{n.unavailable}</InlineMessage>;
    if (status === 'error') return <PublicErrorState error={nearby.error} onRetry={nearby.retry} />;
    if (busy || !result) {
      return (
        <output aria-busy="true" className="block type-body-s text-on-surface-variant">
          {status === 'locating' ? n.locating : n.loading}
        </output>
      );
    }
    if (result.unavailableReason === NEARBY_OUTSIDE_VIETNAM) return <InlineMessage tone="info">{n.outsideVietnam}</InlineMessage>;
    if (result.items.length === 0) return <p className="type-body-s text-on-surface-variant">{n.empty}</p>;
    return (
      <ul className="flex flex-col divide-y divide-border">
        {result.items.map((item) => {
          const card = item.heritage;
          const onMap = pins.some((pin) => pin.slug === card.slug);
          const content = (
            <span className="flex min-w-0 flex-col text-left">
              <span className="type-label text-on-background">{card.name}</span>
              <span className="type-body-s text-on-surface-variant">
                {[provinceName(card.provinceName, language), distanceText(item.distanceMeters)].filter(Boolean).join(' · ')}
              </span>
            </span>
          );
          const row = 'flex min-h-12 w-full items-center gap-3 rounded-xs px-1 py-2 hover:bg-surface-container-low';
          return (
            <li key={card.id}>
              {onMap ? (
                <button type="button" className={row} onClick={() => onSelect(card.slug)}>
                  <Icon name="map-pin" size={18} className="shrink-0 text-primary" />
                  {content}
                </button>
              ) : (
                <Link to={heritagePath(card.slug)} className={row}>
                  <Icon name="map-pin" size={18} className="shrink-0 text-on-surface-muted" />
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      {panelOpen && (
        <section
          aria-label={n.title}
          className="absolute right-3 bottom-[96px] z-10 flex max-h-[50%] w-[min(360px,calc(100%-24px))] flex-col gap-2 overflow-y-auto rounded-md bg-surface p-4 shadow-2 dsvmd:right-(--dsv-content-gutter)"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="type-h4 text-on-background">{n.title}</h2>
            <Button variant="ghost" size="icon" aria-label={n.panelClose} onClick={() => setPanelOpen(false)}>
              <Icon name="x" size={18} />
            </Button>
          </div>
          {body()}
        </section>
      )}
      <div className="absolute right-16 bottom-3 z-10 dsvmd:right-20 dsvmd:bottom-6">
        <Button
          variant="secondary"
          size="lg"
          loading={busy}
          className="bg-surface shadow-1"
          onClick={() => {
            setPanelOpen(true);
            nearby.locate();
          }}
        >
          <Icon name="navigation" size={18} />
          {n.button}
        </Button>
      </div>
    </>
  );
}
