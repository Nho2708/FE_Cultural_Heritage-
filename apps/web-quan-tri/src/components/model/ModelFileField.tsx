import { useId, useRef, useState, type DragEvent } from 'react';
import { cn, formatFileSize, MODEL_UPLOAD } from '@dsvhvn/dung-chung';
import { Button, Icon } from '@dsvhvn/dung-chung/ui';

// Ô chọn tệp mô hình 3D (.glb) để tải lên: kéo thả hoặc chọn từ máy, hiện tên và dung lượng. Chỉ chọn tệp; việc kiểm đuôi, 15 MB, đầu tệp
// glTF 2.0 và gửi lên thuộc biểu mẫu cha (backend vẫn kiểm theo nội dung tệp).

interface ModelFileFieldProps {
  file: File | null;
  error?: string | null;
  disabled?: boolean;
  /** Nhãn của ô, mặc định "Tệp mô hình 3D". */
  label?: string;
  onChange: (file: File | null) => void;
}

export function ModelFileField({ file, error, disabled = false, label = 'Tệp mô hình 3D', onChange }: ModelFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();
  const errorId = useId();

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files[0];
    if (dropped) onChange(dropped);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="type-label text-on-surface-variant">{label}</span>
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
            <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-surface-container-high text-on-surface-muted">
              <Icon name="box" size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate type-body-m text-on-surface">{file.name}</p>
              <p className="type-label text-on-surface-muted">{formatFileSize(file.size)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
                Đổi tệp
              </Button>
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(null)} aria-label={`Bỏ chọn ${file.name}`}>
                <Icon name="x" size={16} />
                Bỏ chọn
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Icon name="upload" size={32} className="text-on-surface-muted" />
            <p className="type-body-m text-on-surface">Kéo tệp .glb vào đây hoặc</p>
            <Button variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
              Chọn tệp từ máy
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={MODEL_UPLOAD.accept}
          hidden
          disabled={disabled}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hintId}
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            // Cho phép chọn lại đúng tệp vừa bỏ.
            event.target.value = '';
            if (picked) onChange(picked);
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
          Chỉ nhận .glb (glTF 2.0 đóng gói một tệp), tối đa 15 MB. Kết cấu và dữ liệu phải nằm trong tệp, không tham chiếu tệp ngoài.
        </p>
      )}
    </div>
  );
}
