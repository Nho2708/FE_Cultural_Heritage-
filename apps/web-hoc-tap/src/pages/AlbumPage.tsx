import { albumGroups, cn, isNewCard, lockedCardHint } from '@dsvhvn/dung-chung';
import type { StudentAlbumCard } from '@dsvhvn/dung-chung/api';
import { Illustration, LevelOneButtonLink, LevelOneIconLink, LevelOneSpeak } from '@dsvhvn/dung-chung/lesson';
import { ErrorState, Icon, LoadingState, Modal } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { pathOf } from '../access/screens';
import { heritagePath } from '../discovery/paths';
import { albumQueryFn, albumQueryKey } from '../quiz/quizData';

// Album di sản của em (cấp 1): mỗi di sản của bài em học xong là một thẻ. Thẻ đã có hiện ảnh, tên, nhóm và nhãn "Mới" trong 7 ngày đầu;
// chạm thẻ mở mẩu chuyện ngắn có nút nghe. Thẻ chưa có là ô viền đứt kèm tên bài sẽ mở thẻ. Hàng chip lọc theo nhóm dễ hiểu do máy chủ
// đặt. Không quay số, không hộp quà ngẫu nhiên: thẻ chỉ đến từ bài em đã học.

const ALL = 'Tất cả';

export function AlbumPage() {
  const album = useQuery({ queryKey: albumQueryKey, queryFn: albumQueryFn, staleTime: 0 });
  const [group, setGroup] = useState(ALL);
  const [open, setOpen] = useState<StudentAlbumCard | null>(null);
  const [now] = useState(() => Date.now());

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1" aria-labelledby="album-tieu-de">
      <title>Album di sản · DiViet</title>
      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-5">
        <div className="flex items-center gap-3">
          <LevelOneIconLink to={pathOf('learnHome')} icon="arrow-left" label="Về trang học" />
          <h1 id="album-tieu-de" className="min-w-0 flex-1 text-[28px] leading-tight font-bold text-on-surface sm:text-[32px]">
            Album di sản
          </h1>
          {album.data && (
            <p className="shrink-0 text-[18px] font-bold whitespace-nowrap text-on-surface-variant">{`${album.data.collected} / ${album.data.total} thẻ`}</p>
          )}
        </div>

        {album.isPending ? (
          <LoadingState rows={3} />
        ) : album.isError ? (
          <ErrorState error={album.error} onRetry={() => void album.refetch()} />
        ) : (
          <>
            {album.data.collected === 0 && (
              <div className="flex items-center gap-4 rounded-[24px] bg-surface-container-low p-5">
                <Illustration state="dong-vien" className="size-20 rounded-full bg-surface" />
                <p className="min-w-0 flex-1 text-[20px] leading-snug font-bold text-on-surface">Em học xong một bài là có thẻ đầu tiên!</p>
              </div>
            )}

            {album.data.cards.length > 0 && (
              <>
                <fieldset className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                  <legend className="sr-only">Lọc theo nhóm</legend>
                  {[ALL, ...albumGroups(album.data.cards)].map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={group === name}
                      onClick={() => setGroup(name)}
                      className={cn(
                        'min-h-12 shrink-0 rounded-full border-2 px-4 text-[16px] font-bold whitespace-nowrap',
                        group === name ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-on-surface hover:bg-surface-container-low',
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </fieldset>

                <ul aria-label="Các thẻ di sản" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {album.data.cards
                    .filter((card) => group === ALL || card.groupName === group)
                    .map((card) => (
                      <li key={card.heritageId} className="flex">
                        {card.collected ? <CollectedCard card={card} fresh={isNewCard(card, now)} onOpen={() => setOpen(card)} /> : <LockedCard card={card} />}
                      </li>
                    ))}
                </ul>
              </>
            )}

            {album.data.total === 0 && (
              <LevelOneButtonLink to={pathOf('learnHome')} className="self-start">
                Về con đường
              </LevelOneButtonLink>
            )}
          </>
        )}
      </div>

      <Modal open={open !== null} size="panel" title={open?.name ?? ''} onClose={() => setOpen(null)}>
        {open && <CardStory card={open} />}
      </Modal>
    </section>
  );
}

function CardArt({ url, className }: { url: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" loading="lazy" className={cn('aspect-[4/3] w-full rounded-[14px] object-cover', className)} />
  ) : (
    <span className={cn('flex aspect-[4/3] w-full items-center justify-center rounded-[14px] bg-surface-container-low text-primary', className)}>
      <Icon name="cards" size={36} />
    </span>
  );
}

function CollectedCard({ card, fresh, onOpen }: { card: StudentAlbumCard; fresh: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${card.name}${fresh ? ', thẻ mới' : ''}. Chạm để xem mẩu chuyện`}
      className="relative flex min-h-[188px] w-full flex-col gap-2 rounded-[20px] border-2 border-border bg-surface p-2 text-left shadow-[0_3px_0_var(--dsv-color-border)] hover:border-primary/50 motion-safe:active:translate-y-0.5"
    >
      {fresh && <span className="absolute top-3 right-3 z-[1] rounded-full bg-primary px-2.5 py-0.5 text-[14px] font-bold text-on-primary">Mới</span>}
      <CardArt url={card.thumbnailUrl} />
      <span className="px-1 text-[18px] leading-tight font-bold text-on-surface">{card.name}</span>
      <span className="mt-auto px-1 pb-1 text-[14px] leading-snug text-on-surface-variant">{card.groupName}</span>
    </button>
  );
}

function LockedCard({ card }: { card: StudentAlbumCard }) {
  return (
    <div className="flex min-h-[188px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-border p-3 text-center">
      <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-full bg-surface-container-low text-[24px] font-bold text-on-surface-variant">
        ?
      </span>
      <span className="text-[18px] leading-tight font-bold text-on-surface">{card.name}</span>
      <span className="text-[14px] leading-snug text-on-surface-variant">{lockedCardHint(card)}</span>
    </div>
  );
}

function CardStory({ card }: { card: StudentAlbumCard }) {
  const story = card.shortDescription?.trim() || `Em đã học về ${card.name}.`;
  return (
    <div className="flex flex-col gap-4">
      <CardArt url={card.thumbnailUrl} className="max-h-[360px] rounded-[20px]" />
      <p className="text-[15px] font-bold text-on-surface-variant">{card.groupName}</p>
      <div className="flex items-start gap-3">
        <LevelOneSpeak text={`${card.name}. ${story}`} label={`Nghe mẩu chuyện về ${card.name}`} size={56} />
        <p className="min-w-0 flex-1 text-[21px] leading-[1.5] text-on-surface">{story}</p>
      </div>
      <LevelOneButtonLink to={heritagePath(card.slug)} variant="secondary" size="md" className="self-start">
        Xem về di sản này
        <Icon name="chevron-right" size={22} />
      </LevelOneButtonLink>
    </div>
  );
}
