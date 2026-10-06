import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { cn, formatFileSize, IMAGE_UPLOAD } from '@dsvhvn/dung-chung';
import { Button, Icon } from '@dsvhvn/dung-chung/ui';

// Ô chọn tệp ảnh để tải lên: kéo thả hoặc chọn từ máy, xem trước ngay, hiện tên và dung lượng. Chỉ chọn tệp; việc kiểm
// định dạng, dung lượng và gửi lên thuộc biểu mẫu cha (backend vẫn kiểm theo nội dung tệp).

interface ImageFileFieldProps {
  file: File | null;
  error?: string | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}

function previewUrlOf(file: File): string | null {
  try {
    return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
  } catch {
    return null; // không tạo được địa chỉ xem trước thì vẫn chọn tệp bình thường
  }
}

export function ImageFileField({ file, error, disabled = false, onChange }: ImageFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const hintId = useId();
  const errorId = useId();

  // Địa chỉ tạm để xem trước tệp: tạo khi chọn, thu hồi khi đổi tệp hoặc đóng ô. Trình duyệt không hỗ trợ thì không xem trước.
  const choose = (picked: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = picked ? previewUrlOf(picked) : null;
    setPreview(previewRef.current);
    onChange(picked);
  };

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files[0];
    if (dropped) choose(dropped);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-on-surface-variant">Tệp ảnh</span>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-5 text-center transition-colors',
          error ? 'border-danger' : dragging ? 'border-primary bg-surface-container-low' : 'border-border-strong',
        )}
      >
        {file ? (
          <div className="flex w-full flex-wrap items-center gap-4 text-left">
            {preview ? (
              <img src={preview} alt="Ảnh xem trước" className="size-24 shrink-0 rounded-sm bg-surface-container-high object-cover" />
            ) : (
              <span className="flex size-24 shrink-0 items-center justify-center rounded-sm bg-surface-container-high text-on-surface-muted">
                <Icon name="image" size={32} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate type-body-m text-on-surface">{file.name}</p>
              <p className="type-label text-on-surface-muted">{formatFileSize(file.size)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
                Đổi tệp
              </Button>
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => choose(null)} aria-label={`Bỏ chọn ${file.name}`}>
                <Icon name="x" size={16} />
                Bỏ chọn
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Icon name="upload" size={32} className="text-on-surface-muted" />
            <p className="type-body-m text-on-surface">Kéo ảnh vào đây hoặc</p>
            <Button variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
              Chọn ảnh từ máy
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={IMAGE_UPLOAD.accept}
          hidden
          disabled={disabled}
          aria-label="Chọn tệp ảnh"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hintId}
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            // Cho phép chọn lại đúng tệp vừa bỏ.
            event.target.value = '';
            if (picked) choose(picked);
          }}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 type-body-s text-danger">
          <Icon name="alert-triangle" size={16} className="mt-[3px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        <p id={hintId} className="type-label text-on-surface-muted">
          JPG, PNG hoặc WEBP, tối đa 5 MB. Hệ thống xóa vị trí GPS và dữ liệu EXIF khỏi ảnh khi lưu.
        </p>
      )}
    </div>
  );
}
