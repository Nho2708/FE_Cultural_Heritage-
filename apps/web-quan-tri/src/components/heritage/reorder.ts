import { useState, type DragEvent, type KeyboardEvent } from 'react';

// Đổi thứ tự bằng kéo thả (chuột) và phím mũi tên lên / xuống trên biểu tượng kéo (bàn phím). Danh sách gửi lên máy chủ
// là toàn bộ id theo thứ tự mới; máy chủ từ chối nếu thiếu hoặc thừa phần tử.

function moveTo(ids: readonly number[], from: number, to: number): number[] {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Dời phần tử `id` lên (-1) hoặc xuống (+1) một vị trí; ở đầu / cuối hoặc không có thì trả null. */
export function moveId(ids: readonly number[], id: number, delta: -1 | 1): number[] | null {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  return moveTo(ids, from, to);
}

/** Đặt phần tử `id` vào vị trí hiện tại của `targetId` (kéo thả); trùng nhau hoặc không có thì trả null. */
export function moveBefore(ids: readonly number[], id: number, targetId: number): number[] | null {
  const from = ids.indexOf(id);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return null;
  return moveTo(ids, from, to);
}

/**
 * Trạng thái kéo thả của một danh sách. `source` gắn vào phần tử kéo được, `target` vào vùng thả (có thể rộng hơn),
 * `handleKeys` vào nút biểu tượng kéo. Mỗi danh sách dùng một bản riêng nên kéo từ danh sách khác bị bỏ qua.
 */
export function useReorder(ids: readonly number[], onReorder: (ids: number[]) => void, disabled = false) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const finish = () => {
    setDragging(null);
    setOver(null);
  };

  return {
    dragging,
    over,
    source: (id: number) => ({
      draggable: !disabled,
      onDragStart: (event: DragEvent) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(id));
        setDragging(id);
      },
      onDragEnd: finish,
    }),
    target: (id: number) => ({
      onDragOver: (event: DragEvent) => {
        if (dragging === null) return;
        event.preventDefault();
        event.stopPropagation();
        if (over !== id) setOver(id);
      },
      onDrop: (event: DragEvent) => {
        if (dragging === null) return;
        event.preventDefault();
        event.stopPropagation();
        const next = moveBefore(ids, dragging, id);
        finish();
        if (next) onReorder(next);
      },
    }),
    handleKeys: (id: number) => (event: KeyboardEvent) => {
      if (disabled) return;
      const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : null;
      if (delta === null) return;
      event.preventDefault();
      const next = moveId(ids, id, delta);
      if (next) onReorder(next);
    },
  };
}
