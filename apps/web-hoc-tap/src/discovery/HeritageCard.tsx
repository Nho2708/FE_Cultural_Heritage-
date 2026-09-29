import { HERITAGE_TYPE_LABEL, cn } from '@dsvhvn/dung-chung';
import type { HeritageCard as HeritageCardData } from '@dsvhvn/dung-chung/api';
import { Link } from 'react-router';
import { cardSubtitle } from './format';
import { heritagePath } from './paths';
import { Thumbnail } from './Thumbnail';

const SCRIM = 'bg-gradient-to-b from-(--dsv-card-scrim-top)';
const ZOOM = 'transition-transform duration-(--dsv-duration-control) ease-out group-hover:scale-(--dsv-card-hover-scale) group-focus-visible:scale-(--dsv-card-hover-scale)';

/** Thẻ di sản của lưới tìm kiếm: ảnh có tên phủ lên, dưới ảnh là tỉnh và nhãn loại. `to` mặc định là trang chi tiết. */
export function HeritageCard({ card, to }: { card: HeritageCardData; to?: string }) {
  return (
    <li>
      <Link to={to ?? heritagePath(card.slug)} className="group flex flex-col gap-3 rounded-sm">
        <div className="relative aspect-[5/4] overflow-hidden rounded-sm bg-(--dsv-card-placeholder-bg)">
          <Thumbnail url={card.thumbnailUrl} className={ZOOM} />
          <div className={cn('absolute inset-x-0 bottom-0 px-4 pt-[60px] pb-4 to-(--dsv-card-scrim-soft)', SCRIM)}>
            <p className="type-h4 text-(--dsv-card-title-fg)">{card.name}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 type-body-s text-on-surface-variant">{card.provinceName ?? 'Nhiều địa phương'}</span>
          {card.heritageType && (
            <span className="shrink-0 rounded-xs bg-primary-container px-2 py-0.5 type-label whitespace-nowrap text-on-primary-container">
              {HERITAGE_TYPE_LABEL[card.heritageType]}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

/** Ô lớn của khối di sản nổi bật ở trang chủ: ảnh phủ kín, tên và dòng phụ trên lớp phủ tối. */
export function FeaturedTile({ card, large = false, className }: { card: HeritageCardData; large?: boolean; className?: string }) {
  return (
    <Link
      to={heritagePath(card.slug)}
      className={cn('group relative block min-h-[220px] overflow-hidden rounded-sm bg-(--dsv-card-placeholder-bg)', className)}
    >
      <Thumbnail url={card.thumbnailUrl} width={large ? 960 : 500} className={ZOOM} />
      <div className={cn('absolute inset-x-0 bottom-0 flex flex-col px-4 pt-[60px] pb-4 to-(--dsv-card-scrim-strong)', SCRIM)}>
        <p className={large ? 'type-h3 text-(--dsv-card-title-fg)' : 'type-h4 text-(--dsv-card-title-fg)'}>{card.name}</p>
        <p className="type-label text-(--dsv-card-subtitle-fg)">{cardSubtitle(card)}</p>
      </div>
    </Link>
  );
}
