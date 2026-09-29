import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

// Bảng mật độ cao của khu quản trị, không dùng hệ thẻ ảnh của trang công khai. Hàng 48px, tiêu đề dính khi cuộn; màn hẹp thì bảng giữ tối thiểu 720px và cuộn ngang trong khung. Mã, thời điểm dùng mono-label
// để thẳng cột. Bảng nhật ký thao tác chỉ đọc: không có nút sửa, xóa ở bất kỳ vai trò nào.

interface TableProps {
  /** Tên bảng cho trình đọc màn hình. */
  caption: string;
  children: ReactNode;
  busy?: boolean;
  className?: string;
}

export function Table({ caption, children, busy, className }: TableProps) {
  return (
    <div
      className={cn('overflow-x-auto rounded-md border border-(--dsv-table-border) bg-surface', className)}
      aria-busy={busy || undefined}
    >
      <table className="w-full min-w-[720px] border-collapse text-left type-body-s">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
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
