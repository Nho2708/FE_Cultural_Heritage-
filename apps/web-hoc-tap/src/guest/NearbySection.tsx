import { NEARBY_OUTSIDE_VIETNAM, type NearbyResult } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage } from '@dsvhvn/dung-chung/ui';
import { ListNotes } from '../components/ListNotes';
import { PublicErrorState } from '../components/PublicErrorState';
import { HeritageCard } from '../discovery/HeritageCard';
import { useI18n } from '../i18n/context';
import { listFlags } from '../i18n/format';
import { useIsGuest } from './guestData';
import { useDistanceText } from './useDistanceText';
import { useNearby, type NearbyController } from './useNearby';

// "Gần bạn" ở trang chủ: tối đa 6 di sản có tọa độ gần vị trí của khách, kèm khoảng cách. Vị trí chỉ dùng để tính, không lưu, không vào lịch sử. Khách chưa
// cho dùng vị trí thì mục này chỉ có lời mời và nút "Cho phép dùng vị trí" (trình duyệt hỏi quyền khi bấm); trình duyệt không hỗ trợ hoặc khách đã chặn
// quyền thì ẩn cả mục. Khách đã bật từ lần trước và trình duyệt vẫn cho phép thì danh sách hiện luôn, không hỏi lại.

/** Danh sách di sản gần bạn dạng lưới thẻ; dùng ở trang chủ. */
function NearbyCards({ result }: { result: NearbyResult }) {
  const distanceText = useDistanceText();
  return (
    <>
      <ListNotes flags={listFlags(result.items.map((item) => item.heritage))} />
      <ul className="grid grid-cols-1 gap-6 dsvsm:grid-cols-2 dsvlg:grid-cols-3">
        {result.items.map((item) => (
          <HeritageCard
            key={item.heritage.id}
            card={item.heritage}
            trailing={
              <span className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-secondary-container px-2 py-0.5 type-label whitespace-nowrap text-on-secondary-container">
                <Icon name="navigation" size={12} />
                {distanceText(item.distanceMeters)}
              </span>
            }
          />
        ))}
      </ul>
    </>
  );
}

/** Thân của mục theo trạng thái; trả null khi mục phải ẩn. */
function NearbyBody({ nearby }: { nearby: NearbyController }) {
  const { t } = useI18n();
  const n = t.guest.nearby;
  const { status, result } = nearby;
  if (status === 'denied' || nearby.permission === 'unsupported') return null;

  switch (status) {
    case 'idle':
      // Chưa đọc xong cờ đã nhớ ở máy chủ: chưa biết nên hiện lời mời hay danh sách, tránh nhấp nháy lời mời rồi đổi.
      if (nearby.loadingFlag) {
        return (
          <output aria-busy="true" className="block type-body-m text-on-surface-variant">
            {n.locating}
          </output>
        );
      }
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="type-body-m text-on-surface-variant">{n.allowText}</p>
          <Button onClick={nearby.locate}>
            <Icon name="navigation" size={18} />
            {n.allow}
          </Button>
        </div>
      );
    case 'locating':
      return (
        <output aria-busy="true" className="block type-body-m text-on-surface-variant">
          {n.locating}
        </output>
      );
    case 'loading':
      return (
        <output aria-busy="true" className="block type-body-m text-on-surface-variant">
          {n.loading}
        </output>
      );
    case 'unavailable':
      return (
        <InlineMessage
          tone="warning"
          action={
            <Button variant="secondary" size="sm" onClick={nearby.retry}>
              {t.common.retry}
            </Button>
          }
        >
          {n.unavailable}
        </InlineMessage>
      );
    case 'error':
      return <PublicErrorState error={nearby.error} onRetry={nearby.retry} />;
    case 'ready':
      if (!result) return null;
      if (result.unavailableReason === NEARBY_OUTSIDE_VIETNAM) return <InlineMessage tone="info">{n.outsideVietnam}</InlineMessage>;
      return (
        <div className="flex flex-col gap-4">
          {result.items.length === 0 ? <p className="type-body-m text-on-surface-variant">{n.empty}</p> : <NearbyCards result={result} />}
          <div>
            <Button variant="ghost" size="sm" onClick={nearby.stop}>
              {n.turnOff}
            </Button>
          </div>
        </div>
      );
  }
}

export function NearbySection({ className = 'bg-surface-container-low' }: { className?: string }) {
  const guest = useIsGuest();
  const { t } = useI18n();
  const nearby = useNearby({ auto: true });
  // Chưa đọc xong quyền của trình duyệt thì chưa hiện gì (tránh nhấp nháy rồi biến mất khi khách đã chặn vị trí).
  if (!guest || nearby.permission === null || nearby.permission === 'unsupported') return null;
  if (nearby.permission === 'denied') return null;
  return (
    <section aria-labelledby="gan-ban" className={`${className} py-12`}>
      <div className="dsv-content flex flex-col gap-6">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h2 id="gan-ban" className="type-h2 text-on-background">
            {t.guest.nearby.title}
          </h2>
          <p className="type-body-m text-on-surface-variant">{t.guest.nearby.text}</p>
        </div>
        <NearbyBody nearby={nearby} />
      </div>
    </section>
  );
}
