import { HERITAGE_TYPE_LABEL } from '@dsvhvn/dung-chung';
import { Button, EmptyState, ErrorState, Field, Icon, LoadingState, Modal, TextField } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { publishedHeritagesApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Hai ô chọn của biểu mẫu câu hỏi: di sản đã xuất bản (bắt buộc) và hình trong thư viện ảnh của di sản đó (ảnh của di sản và ảnh
// của các sự kiện trên dòng thời gian, đúng nguồn mà máy chủ chấp nhận).

interface HeritageSelectProps {
  heritageId: number | null;
  heritageName: string;
  error?: string | null;
  disabled?: boolean;
  onChange: (id: number, name: string) => void;
}

export function HeritageSelect({ heritageId, heritageName, error, disabled, onChange }: HeritageSelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const trimmed = keyword.trim();
  const list = useQuery({
    queryKey: queryKeys.publishedHeritages({ keyword: trimmed, picker: true }),
    queryFn: ({ signal }) =>
      publishedHeritagesApi.search({ keyword: trimmed.length >= 2 ? trimmed : undefined }, { page: 1, pageSize: 12 }, { signal }),
    enabled: open,
  });

  return (
    <Field label="Di sản" error={error} hint="Chỉ chọn được di sản đã xuất bản.">
      {({ describedBy }) => (
        <div className="flex flex-wrap items-center gap-3" aria-describedby={describedBy}>
          <span className="type-body-m text-on-surface" data-testid="di-san-da-chon">
            {heritageId ? heritageName || `Di sản #${heritageId}` : 'Chưa chọn di sản'}
          </span>
          {!disabled && (
            <Button variant="secondary" size="sm" aria-invalid={error ? true : undefined} onClick={() => setOpen(true)}>
              <Icon name="map-pin" size={16} />
              {heritageId ? 'Đổi di sản' : 'Chọn di sản'}
            </Button>
          )}
          {open && (
            <Modal open title="Chọn di sản" size="panel" onClose={() => setOpen(false)}>
              <TextField
                label="Tìm di sản theo tên"
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Nhập ít nhất 2 ký tự"
              />
              <div className="mt-4">
                {list.isPending ? (
                  <LoadingState rows={2} />
                ) : list.isError ? (
                  <ErrorState error={list.error} onRetry={() => void list.refetch()} />
                ) : list.data.items.length === 0 ? (
                  <EmptyState icon="search" title="Không tìm thấy di sản đã xuất bản phù hợp." />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {list.data.items.map((card) => (
                      <li key={card.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-left hover:bg-surface-container-low"
                          onClick={() => {
                            onChange(card.id, card.name);
                            setOpen(false);
                          }}
                        >
                          <span className="type-label text-on-surface">{card.name}</span>
                          <span className="type-body-s text-on-surface-variant">
                            {[card.provinceName, card.heritageType ? HERITAGE_TYPE_LABEL[card.heritageType] : null].filter(Boolean).join(' · ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Modal>
          )}
        </div>
      )}
    </Field>
  );
}

export interface LibraryImage {
  url: string;
  caption: string | null;
  credit: string | null;
}

/** Ảnh trong thư viện của di sản: ảnh của di sản và ảnh của các sự kiện trên dòng thời gian. */
function useHeritageImages(heritageId: number | null, heritageName: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.heritageImages(heritageId ?? 0),
    enabled: enabled && heritageId !== null,
    queryFn: async ({ signal }): Promise<LibraryImage[]> => {
      const found = await publishedHeritagesApi.search({ keyword: heritageName.trim().length >= 2 ? heritageName.trim() : undefined }, { page: 1, pageSize: 100 }, { signal });
      const card = found.items.find((c) => c.id === heritageId);
      if (!card) return [];
      const [detail, timeline] = await Promise.all([publishedHeritagesApi.detail(card.slug, { signal }), publishedHeritagesApi.timeline(card.slug, { signal })]);
      const all = [...detail.media, ...timeline.phases.flatMap((p) => p.events.flatMap((e) => e.media))];
      const seen = new Set<string>();
      const images: LibraryImage[] = [];
      for (const m of all) {
        if (m.mediaType !== 'IMAGE' || !m.url || seen.has(m.url)) continue;
        seen.add(m.url);
        images.push({ url: m.url, caption: m.caption, credit: m.credit ?? m.author ?? m.source });
      }
      return images;
    },
  });
}

interface ImageFieldProps {
  label: string;
  value: string;
  heritageId: number | null;
  heritageName: string;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  onChange: (url: string) => void;
}

/** Hình của câu: chọn trong thư viện ảnh của di sản (không nhập đường dẫn tự do vì máy chủ chỉ nhận ảnh trong thư viện). */
export function ImageField({ label, value, heritageId, heritageName, error, hint, disabled, onChange }: ImageFieldProps) {
  const [open, setOpen] = useState(false);
  const images = useHeritageImages(heritageId, heritageName, open);

  return (
    <Field label={label} error={error} hint={hint}>
      {({ describedBy }) => (
        <div className="flex flex-wrap items-center gap-3" aria-describedby={describedBy}>
          {value ? <img src={value} alt="" className="h-16 w-24 rounded-sm object-cover" /> : <span className="type-body-s text-on-surface-variant">Chưa chọn hình</span>}
          {!disabled && (
            <>
              <Button variant="secondary" size="sm" disabled={heritageId === null} aria-label={`${label}: chọn từ thư viện ảnh`} onClick={() => setOpen(true)}>
                <Icon name="image" size={16} />
                {value ? 'Đổi hình' : 'Chọn hình'}
              </Button>
              {value && (
                <Button variant="ghost" size="sm" aria-label={`${label}: bỏ hình`} onClick={() => onChange('')}>
                  <Icon name="x" size={16} />
                  Bỏ hình
                </Button>
              )}
            </>
          )}
          {heritageId === null && !disabled && <span className="type-body-s text-on-surface-variant">Chọn di sản trước để xem thư viện ảnh.</span>}
          {open && (
            <Modal open title="Chọn hình trong thư viện ảnh của di sản" size="panel" onClose={() => setOpen(false)}>
              {images.isPending ? (
                <LoadingState rows={2} />
              ) : images.isError ? (
                <ErrorState error={images.error} onRetry={() => void images.refetch()} />
              ) : images.data.length === 0 ? (
                <EmptyState icon="image" title="Di sản này chưa có ảnh trong thư viện." />
              ) : (
                <ul className="grid grid-cols-2 gap-3 dsvsm:grid-cols-3">
                  {images.data.map((image) => (
                    <li key={image.url}>
                      <button
                        type="button"
                        aria-label={image.caption || 'Ảnh không có chú thích'}
                        className="block w-full overflow-hidden rounded-md border border-border text-left hover:border-primary"
                        onClick={() => {
                          onChange(image.url);
                          setOpen(false);
                        }}
                      >
                        <img src={image.url} alt="" loading="lazy" className="h-24 w-full object-cover" />
                        <span className="block p-2 type-body-s text-on-surface-variant">{image.caption || 'Không có chú thích'}</span>
                        {image.credit && <span className="block px-2 pb-2 type-body-s text-on-surface-variant">Nguồn: {image.credit}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Modal>
          )}
        </div>
      )}
    </Field>
  );
}
