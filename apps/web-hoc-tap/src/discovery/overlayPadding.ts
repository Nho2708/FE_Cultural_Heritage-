import { useLayoutEffect, useState, type RefObject } from 'react';
import type { FitPadding } from './HeritageMap';

// Trang Bản đồ có thanh bộ lọc nổi ở mép trên và (ở màn hình rộng) thẻ ghi chú nổi ở mép dưới. Đo phần bản đồ bị hai lớp này
// che để khung nhìn cả nước căn vào phần còn lại, không bị che cực Bắc hay Cà Mau.

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Khoảng cách giữa lớp nổi và phần bản đồ muốn thấy. */
const GAP = 16;

/**
 * Phần mép (điểm ảnh) của vùng bản đồ `area` bị `bar` (thanh bộ lọc, luôn nổi ở mép trên) và `note` (thẻ ghi chú: nổi ở góc dưới
 * trái của màn hình rộng, nằm dưới bản đồ ở khổ hẹp nên không che) che. Thẻ ghi chú cho cả mép dưới lẫn cạnh trái để bản đồ chọn
 * cách chừa cho khung nhìn to hơn. Lớp không giao với vùng bản đồ thì không tính.
 */
export function overlayPadding(area: Box, bar: Box | null, note: Box | null): FitPadding {
  const top = bar && bar.bottom > area.top && bar.top < area.bottom ? bar.bottom - area.top + GAP : 0;
  const noteOverlaps = note !== null && note.top < area.bottom && note.bottom > area.top && note.right > area.left && note.left < area.right;
  const bottom = noteOverlaps ? area.bottom - note.top + GAP : 0;
  const left = noteOverlaps ? note.right - area.left + GAP : 0;
  const px = (value: number) => Math.max(0, Math.round(value));
  return { top: px(top), bottom: px(bottom), left: px(left) };
}

/**
 * Đo trước khi vẽ (và đo lại khi các phần tử đổi kích thước hoặc cửa sổ đổi cỡ). `note` là phần tử (không phải ref) vì thẻ ghi
 * chú chỉ xuất hiện khi có dữ liệu. Trả về cùng một đối tượng khi số không đổi để không dựng lại hiệu ứng ở nơi dùng.
 */
export function useOverlayPadding(areaRef: RefObject<HTMLElement | null>, barRef: RefObject<HTMLElement | null>, note: HTMLElement | null): FitPadding {
  const [padding, setPadding] = useState<FitPadding>({ top: 0, bottom: 0, left: 0 });
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => {
      const next = overlayPadding(area.getBoundingClientRect(), barRef.current?.getBoundingClientRect() ?? null, note?.getBoundingClientRect() ?? null);
      setPadding((previous) => (previous.top === next.top && previous.bottom === next.bottom && previous.left === next.left ? previous : next));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(area);
    if (barRef.current) observer?.observe(barRef.current);
    if (note) observer?.observe(note);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [areaRef, barRef, note]);
  return padding;
}
