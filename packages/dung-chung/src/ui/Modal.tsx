import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../cn';
import { Icon } from './Icon';

// Hộp thoại đè lên màn cha, không có URL riêng. Dùng <dialog> gốc của trình duyệt: giam focus, Esc để đóng, trả focus về phần tử đã mở.
// `dialog` ≤ 480px cho hộp xác nhận; `panel` ≤ 720px cho biểu mẫu (ví dụ biểu mẫu tài khoản). Nút hành động chính luôn ở bên phải.

interface ModalProps {
  open: boolean;
  title: string;
  /** Mô tả ngắn dưới tiêu đề (được đọc cùng tiêu đề bằng aria-describedby). */
  description?: ReactNode;
  size?: 'dialog' | 'panel';
  children?: ReactNode;
  /** Hàng nút cuối hộp thoại. Hộp biểu mẫu thường đặt nút trong <form> nên để trống. */
  footer?: ReactNode;
  /** Đang lưu: chặn Esc và nút đóng để không mất thao tác giữa chừng. */
  busy?: boolean;
  onClose: () => void;
}

export function Modal({ open, title, description, size = 'dialog', children, footer, busy = false, onClose }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // Esc: trình duyệt tự đóng <dialog>; khi đang lưu thì giữ lại.
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-32px)] overflow-y-auto rounded-md bg-(--dsv-modal-bg) p-6 text-on-surface shadow-2 backdrop:bg-(--dsv-modal-scrim) dsvsm:p-8',
        size === 'panel' ? 'w-[min(720px,calc(100%-32px))]' : 'w-[min(480px,calc(100%-32px))]',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="type-h3">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-2 type-body-m text-on-surface-variant">
              {description}
            </div>
          )}
        </div>
        {size === 'panel' && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            <Icon name="x" size={20} />
          </button>
        )}
      </div>
      {children != null && <div className="mt-6">{children}</div>}
      {footer && <div className="mt-8 flex flex-wrap justify-end gap-3">{footer}</div>}
    </dialog>
  );
}
