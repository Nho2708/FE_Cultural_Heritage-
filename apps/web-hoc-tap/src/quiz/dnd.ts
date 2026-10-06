import type { DragEvent } from 'react';

// Kéo thả bằng sự kiện gốc của trình duyệt, dùng thêm cho thao tác chạm (chạm vẫn làm được mọi việc kéo thả làm; màn hình cảm
// ứng không có sự kiện kéo). Dữ liệu kéo là một chuỗi nhỏ do nơi dùng đặt tên, ví dụ "ten:2" hoặc "muc:0".

const DRAG_TYPE = 'application/x-dsvhvn-bai-kiem-tra';

export function dragProps(payload: string, enabled = true) {
  if (!enabled) return {};
  return {
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData(DRAG_TYPE, payload);
      event.dataTransfer.setData('text/plain', payload);
      event.dataTransfer.effectAllowed = 'move';
    },
  };
}

export function dropProps(onDrop: (payload: string) => void, enabled = true) {
  if (!enabled) return {};
  return {
    onDragOver: (event: DragEvent) => {
      if (Array.from(event.dataTransfer.types).includes(DRAG_TYPE)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },
    onDrop: (event: DragEvent) => {
      const payload = event.dataTransfer.getData(DRAG_TYPE);
      if (!payload) return;
      event.preventDefault();
      onDrop(payload);
    },
  };
}

/** Đọc dữ liệu kéo dạng "loai:số"; null nếu không đúng loại. */
export function parseDrag(payload: string, kind: string): number | null {
  const [head, value] = payload.split(':');
  if (head !== kind || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}
