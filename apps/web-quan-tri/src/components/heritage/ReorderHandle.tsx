import type { KeyboardEvent } from 'react';
import { Icon } from '@dsvhvn/dung-chung/ui';

interface ReorderHandleProps {
  /** Tên phần tử cho trình đọc màn hình, ví dụ tên giai đoạn. */
  name: string;
  size?: number;
  disabled?: boolean;
  onKeyDown: (event: KeyboardEvent) => void;
}

/** Biểu tượng kéo: nút bàn phím đổi thứ tự bằng mũi tên lên / xuống. */
export function ReorderHandle({ name, size = 20, disabled, onKeyDown }: ReorderHandleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onKeyDown={onKeyDown}
      aria-label={`Đổi thứ tự "${name}": kéo thả hoặc dùng phím mũi tên lên, xuống`}
      className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-xs text-on-surface-muted hover:bg-surface-container hover:text-on-surface active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon name="grip" size={size} />
    </button>
  );
}
