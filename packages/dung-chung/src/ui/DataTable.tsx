import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../cn';

// Bảng mật độ cao của khu quản trị, không dùng hệ thẻ ảnh của trang công khai. Hàng 48px, tiêu đề dính khi cuộn; màn hẹp thì bảng giữ tối thiểu 720px và cuộn ngang trong khung. Mã, thời điểm dùng mono-label
// để thẳng cột. Bảng nhật ký thao tác chỉ đọc: không có nút sửa, xóa ở bất kỳ vai trò nào.
// Khung cuộn ngang hiện dải mờ ở mép còn cột khuất (màn 1366px cắt mất các cột bên phải mà không có dấu hiệu gì) để người dùng biết bảng còn cuộn được.

interface TableProps {
  /** Tên bảng cho trình đọc màn hình. */
  caption: string;
  children: ReactNode;
  busy?: boolean;
  className?: string;
}

/** Mép nào của khung còn cột khuất. */
interface HiddenEdges {
  left: boolean;
  right: boolean;
}

function hiddenEdgesOf(element: HTMLElement): HiddenEdges {
  const maxScroll = element.scrollWidth - element.clientWidth;
  return { left: element.scrollLeft > 1, right: maxScroll - element.scrollLeft > 1 };
}

/** Theo dõi khung cuộn ngang: cuộn, đổi cỡ khung hay đổi nội dung bảng đều tính lại mép còn khuất. */
function useHiddenEdges() {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<HiddenEdges>({ left: false, right: false });
  // Chỉ đặt state khi mép khuất thật sự đổi (so với bản đang có), để không xếp thêm lượt render vô ích vào mỗi lần cuộn hay mỗi lần gắn bảng.
  const current = useRef(edges);
  useEffect(() => {
    current.current = edges;
  }, [edges]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const next = hiddenEdgesOf(element);
      if (next.left === current.current.left && next.right === current.current.right) return;
      setEdges(next);
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    // Bảng đổi nội dung (trang khác, bộ lọc khác) mà khung không đổi cỡ: theo dõi cả chiều rộng của chính bảng.
    if (observer && element.firstElementChild) observer.observe(element.firstElementChild);
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, []);

  return { ref, edges };
}

/** Dải mờ ở một mép khung khi bảng còn cột khuất phía đó; chỉ để nhìn, không chắn thao tác. */
function EdgeFade({ side, visible }: { side: 'left' | 'right'; visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-scroll-hint={side}
      className={cn(
        'pointer-events-none absolute inset-y-0 w-12 transition-opacity duration-(--dsv-duration-fast)',
        side === 'left' ? 'left-0 rounded-l-md' : 'right-0 rounded-r-md',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={{ backgroundImage: `linear-gradient(to ${side}, rgb(0 0 0 / 0), var(--dsv-color-surface) 85%)` }}
    />
  );
}

export function Table({ caption, children, busy, className }: TableProps) {
  const { ref, edges } = useHiddenEdges();
  return (
    <div className={cn('relative rounded-md border border-(--dsv-table-border) bg-surface', className)} aria-busy={busy || undefined}>
      <div ref={ref} className="overflow-x-auto rounded-md">
        <table className="w-full min-w-[720px] border-collapse text-left type-body-s">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
      <EdgeFade side="left" visible={edges.left} />
      <EdgeFade side="right" visible={edges.right} />
    </div>
  );
}

export function Th({ className, ...rest }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 h-11 border-b border-(--dsv-table-border) bg-(--dsv-table-header-bg) px-4 type-label whitespace-nowrap text-on-surface-variant',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: ComponentProps<'td'>) {
  return (
    <td className={cn('h-12 border-b border-(--dsv-table-border) px-4 py-2 align-middle text-on-surface', className)} {...rest} />
  );
}

export function Tr({ className, ...rest }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn('transition-colors duration-(--dsv-duration-fast) hover:bg-(--dsv-table-row-hover-bg)', className)}
      {...rest}
    />
  );
}

/** Ô "không có giá trị": hiện gạch ngang thay vì để trắng (danh sách lớp, bảng quản trị). */
export function Blank() {
  return (
    <span className="text-on-surface-muted" aria-label="Không có">
      —
    </span>
  );
}
