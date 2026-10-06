import { Icon } from '@dsvhvn/dung-chung/ui';
import { ListNotes } from '../components/ListNotes';
import { HeritageCard } from '../discovery/HeritageCard';
import { useI18n } from '../i18n/context';
import { listFlags } from '../i18n/format';
import { useGuestRecommendations, useIsGuest } from './guestData';

// "Gợi ý cho bạn" của khách: tối đa 6 di sản giống những gì khách đã tìm, xem, đọc tóm tắt, nghe, xem 3D gần đây (máy chủ tính theo lịch sử của mã thiết bị,
// bỏ di sản đã xem nhiều lần). Mỗi thẻ ghi di sản giống nhất và các điểm chung bằng ngôn ngữ đang chọn (máy chủ chỉ trả mã điểm chung). Chưa có lịch sử thì
// máy chủ trả di sản nổi bật kèm lời mời xem thử. Học sinh không có mục này.

const MAX_ITEMS = 6;

function Skeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="grid grid-cols-1 gap-6 dsvsm:grid-cols-2 dsvlg:grid-cols-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-[5/4] animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-5 w-2/3 animate-pulse rounded-xs bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
}

interface Props {
  /** Khóa tải lại: trang chi tiết truyền slug để mỗi di sản mở ra một lần hỏi mới. */
  scope?: string;
  /** Chờ đến khi lượt xem của trang đã được ghi (trang chi tiết) rồi mới hỏi. */
  ready?: boolean;
  /** Không gợi lại di sản đang xem. */
  exceptSlug?: string;
  /** Chưa có lịch sử: chỉ hiện lời mời xem thử, không lặp lại danh sách di sản nổi bật (trang chủ đã có khối di sản nổi bật ngay bên dưới). */
  inviteOnly?: boolean;
  /** Nền của khối (trang chủ xen kẽ nền). */
  className?: string;
}

export function RecommendationsSection({ scope, ready, exceptSlug, inviteOnly = false, className = 'bg-background' }: Props) {
  const guest = useIsGuest();
  const { t } = useI18n();
  const query = useGuestRecommendations({ scope, ready });
  if (!guest) return null;

  const data = query.data;
  const items = (data?.items ?? []).filter((item) => item.heritage.slug !== exceptSlug).slice(0, MAX_ITEMS);
  const personalized = data?.isPersonalized === true;
  const g = t.guest.recommend;
  // Gợi ý chỉ là phần thêm: tải lỗi thì ẩn khối này, không báo lỗi che phần còn lại của trang (mở lại trang là hỏi lại).
  if (query.isError && !data) return null;
  const nothing = !query.isPending && (items.length === 0 || (inviteOnly && !personalized));
  if (nothing && personalized) return null;

  return (
    <section aria-labelledby="goi-y-cho-ban" className={`${className} py-12`}>
      <div className="dsv-content flex flex-col gap-6">
        <div className="flex max-w-[760px] flex-col gap-2">
          <h2 id="goi-y-cho-ban" className="type-h2 text-on-background">
            {g.title}
          </h2>
          <p className="type-body-m text-on-surface-variant">{data && !personalized ? g.textFeatured : g.text}</p>
          {data?.usedFallback && (
            <p className="flex items-start gap-2 type-body-s text-on-surface-variant">
              <Icon name="info" size={16} className="mt-[3px] shrink-0" />
              <span>{g.fallbackNote}</span>
            </p>
          )}
        </div>
        {query.isPending && <Skeleton label={g.loading} />}
        {!nothing && data && (
          <>
            <ListNotes flags={listFlags(items.map((item) => item.heritage))} />
            <ul className="grid grid-cols-1 gap-6 dsvsm:grid-cols-2 dsvlg:grid-cols-3">
              {items.map((item) => (
                <HeritageCard
                  key={item.heritage.id}
                  card={item.heritage}
                  footer={
                    personalized ? (
                      <div className="mt-2 flex flex-col gap-2">
                        {item.becauseOfName && <p className="type-body-s text-on-surface-variant">{g.because(item.becauseOfName)}</p>}
                        {item.reasons.length > 0 && (
                          <ul aria-label={g.reasonsLabel} className="flex flex-wrap gap-1.5">
                            {item.reasons.map((reason) => (
                              <li key={reason} className="rounded-full bg-surface-container px-2.5 py-0.5 type-label text-on-surface-variant">
                                {g.reasons[reason]}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : undefined
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
