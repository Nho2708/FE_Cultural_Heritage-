import { cn } from '@dsvhvn/dung-chung';
import type { LessonImageOption, LessonMaterials } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, LoadingState, Modal } from '@dsvhvn/dung-chung/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { creditLine } from './lessonForm';

// Chọn hình trong thư viện ảnh của các di sản của bài (để hình luôn có chú thích và ghi công đi kèm). Không dán đường dẫn ngoài:
// máy chủ chỉ nhận hình thuộc thư viện của di sản trong bài.

interface ImagePickerDialogProps {
  materials: UseQueryResult<LessonMaterials>;
  currentUrl: string;
  onPick: (image: LessonImageOption) => void;
  onClose: () => void;
}

export function ImagePickerDialog({ materials: images, currentUrl, onPick, onClose }: ImagePickerDialogProps) {
  const [selected, setSelected] = useState<string>(currentUrl);
  const options = (images.data?.images ?? []).filter((i): i is LessonImageOption & { url: string } => Boolean(i.url));
  const picked = options.find((i) => i.url === selected);

  return (
    <Modal
      open
      title="Chọn hình"
      description="Hình lấy từ thư viện ảnh của các di sản trong bài, kèm chú thích và ghi công."
      size="wide"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={!picked} onClick={() => picked && onPick(picked)}>
            Dùng hình này
          </Button>
        </>
      }
    >
      {images.isPending ? (
        <LoadingState rows={2} />
      ) : images.isError ? (
        <ErrorState error={images.error} onRetry={() => void images.refetch()} />
      ) : options.length === 0 ? (
        <EmptyState icon="image" title="Các di sản của bài chưa có ảnh trong thư viện.">
          Hãy nhờ quản trị hệ thống bổ sung ảnh cho di sản, hoặc chọn thêm di sản có ảnh khi tạo bài.
        </EmptyState>
      ) : (
        <fieldset>
          <legend className="sr-only">Hình trong thư viện</legend>
          <ul className="grid gap-3 dsvsm:grid-cols-2 dsvmd:grid-cols-3">
            {options.map((image) => (
              <li key={image.mediaId}>
                <label
                  htmlFor={`hinh-${image.mediaId}`}
                  className={cn(
                    'flex h-full cursor-pointer flex-col overflow-hidden rounded-md border',
                    selected === image.url ? 'border-2 border-primary' : 'border-border hover:bg-surface-container-low',
                  )}
                >
                  <img src={image.url} alt={image.caption ?? image.heritageName ?? ''} loading="lazy" className="h-36 w-full object-cover" />
                  <span className="flex flex-1 flex-col gap-1 p-3">
                    <span className="flex items-start gap-2">
                      <input
                        id={`hinh-${image.mediaId}`}
                        type="radio"
                        name="hinh"
                        checked={selected === image.url}
                        onChange={() => setSelected(image.url)}
                        aria-label={image.caption ?? image.heritageName ?? 'Hình'}
                        className="mt-1"
                      />
                      <span className="type-body-s text-on-surface">{image.caption ?? image.heritageName}</span>
                    </span>
                    <span className="type-body-s text-on-surface-variant">{creditLine(image) || image.heritageName}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </Modal>
  );
}
