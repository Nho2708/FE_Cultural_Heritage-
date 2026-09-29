import { useState } from 'react';
import { errorMessage, type HeritageDetail, type HeritageMedia } from '@dsvhvn/dung-chung/api';
import { cn, MEDIA_TYPE_LABEL, MESSAGES } from '@dsvhvn/dung-chung';
import { Badge, Button, ConfirmDialog, EmptyState, Icon, useToast } from '@dsvhvn/dung-chung/ui';
import { adminHeritagesApi, adminMediaApi } from '../../lib/api/endpoints';
import { MediaFormDialog } from './MediaFormDialog';
import { useReorder } from './reorder';
import { ReorderHandle } from './ReorderHandle';

// Tab Ảnh và media: thư viện ảnh, video, âm thanh của di sản (đường dẫn, chú thích, ghi công bắt buộc, thứ tự kéo thả).
// Ảnh đại diện phải là một ảnh trong thư viện này. Ảnh của sự kiện quản lý trong Biểu mẫu giai đoạn và sự kiện.

interface MediaTabProps {
  heritage: HeritageDetail;
  /** Sau mỗi thay đổi: làm mới chi tiết di sản (đọc lại danh sách ảnh và điều kiện xuất bản). */
  onChanged: () => void;
}

export function MediaThumb({ media, className }: { media: Pick<HeritageMedia, 'mediaType' | 'url'>; className?: string }) {
  const box = cn('flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-container-high', className);
  if (media.mediaType === 'IMAGE' && media.url) {
    return (
      <span className={box}>
        <img src={media.url} alt="" loading="lazy" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span className={box}>
      <Icon name={media.mediaType === 'IMAGE' ? 'image' : 'file-text'} size={24} className="text-on-surface-muted" />
    </span>
  );
}

export function MediaTab({ heritage, onChanged }: MediaTabProps) {
  const toast = useToast();
  const [editing, setEditing] = useState<HeritageMedia | 'new' | null>(null);
  const [deleting, setDeleting] = useState<HeritageMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const ids = heritage.media.map((m) => m.id);
  const published = heritage.status === 'PUBLISHED';

  const run = async (action: () => Promise<{ message: string | null }>, fallback: string) => {
    setBusy(true);
    try {
      const { message } = await action();
      toast.success(message ?? fallback);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const reorder = useReorder(
    ids,
    (next) => void run(() => adminMediaApi.orderForHeritage(heritage.id, next), MESSAGES.success('Đổi thứ tự ảnh')),
    busy,
  );

  const remove = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    await run(() => adminMediaApi.remove(target.id), MESSAGES.success('Xóa ảnh'));
  };

  return (
    <section aria-labelledby="tab-anh-tieu-de" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tab-anh-tieu-de" className="type-body-m text-on-surface-variant">
          {heritage.media.length} ảnh và media. Kéo biểu tượng bên trái hoặc dùng phím mũi tên lên, xuống để đổi thứ tự.
        </h2>
        <Button onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} />
          Thêm ảnh
        </Button>
      </div>

      {heritage.media.length === 0 ? (
        <EmptyState icon="image" title="Di sản chưa có ảnh nào.">
          Thêm ảnh kèm ghi công đầy đủ, rồi chọn một ảnh làm ảnh đại diện để xuất bản di sản.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {heritage.media.map((media) => {
            const name = media.caption || media.url || 'ảnh';
            return (
              <li
                key={media.id}
                {...reorder.target(media.id)}
                className={cn(
                  'flex flex-wrap items-center gap-4 rounded-md border bg-surface p-3',
                  reorder.over === media.id && reorder.dragging !== media.id ? 'border-primary' : 'border-border',
                  reorder.dragging === media.id && 'opacity-50',
                )}
              >
                <div {...reorder.source(media.id)} className="flex min-w-0 flex-1 items-center gap-3">
                  <ReorderHandle name={name} disabled={busy} onKeyDown={reorder.handleKeys(media.id)} />
                  <MediaThumb media={media} className="size-16" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 type-body-m text-on-surface">
                      <span className="min-w-0 truncate">{media.caption || 'Chưa có chú thích'}</span>
                      <Badge>{media.mediaType ? MEDIA_TYPE_LABEL[media.mediaType] : 'Media'}</Badge>
                      {media.isThumbnail && <Badge tone="success">Ảnh đại diện</Badge>}
                    </p>
                    <p className="truncate type-body-s text-on-surface-variant">{media.credit}</p>
                    <p className="truncate type-mono-label text-on-surface-muted">{media.url}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {media.mediaType === 'IMAGE' && !media.isThumbnail && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(() => adminHeritagesApi.setThumbnail(heritage.id, media.id), 'Đã chọn ảnh đại diện.')
                      }
                    >
                      Chọn làm ảnh đại diện
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" aria-label={`Sửa ${name}`} onClick={() => setEditing(media)}>
                    <Icon name="pencil" size={20} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Xóa ${name}`}
                    disabled={busy || (published && media.isThumbnail)}
                    title={published && media.isThumbnail ? 'Di sản đang xuất bản cần có ảnh đại diện.' : undefined}
                    onClick={() => setDeleting(media)}
                  >
                    <Icon name="trash" size={20} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <MediaFormDialog
          heritageId={heritage.id}
          heritageName={heritage.name ?? ''}
          media={editing === 'new' ? null : editing}
          onSaved={(message) => {
            const wasNew = editing === 'new';
            setEditing(null);
            toast.success(message ?? MESSAGES.success(wasNew ? 'Thêm ảnh' : 'Lưu ảnh'));
            onChanged();
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa ảnh"
        confirmLabel="Xóa ảnh"
        tone="danger"
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      >
        {deleting && (
          <>
            <p>{MESSAGES.confirm('xóa ảnh', deleting.caption || deleting.url || 'này')}</p>
            {deleting.isThumbnail && <p className="mt-2 type-body-s">Đây là ảnh đại diện, di sản sẽ không còn ảnh đại diện.</p>}
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}
