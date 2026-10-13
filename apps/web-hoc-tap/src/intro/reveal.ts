import type { CSSProperties } from 'react';

/** Thuộc tính cho phần tử thứ `index` của một nhóm hiện lên lần lượt khi cuộn tới (lệch nhịp 60 ms, xem chuyen-dong.css). */
export function revealItem(index: number): { 'data-reveal-item': ''; style: CSSProperties } {
  return { 'data-reveal-item': '', style: { '--reveal-index': index } as CSSProperties };
}
