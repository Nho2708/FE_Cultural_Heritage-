import type { ReactNode } from 'react';

// Đầu trang của các màn hình trong khu làm việc: tiêu đề h1, mô tả ngắn, nhóm nút hành động bên phải.
// Đặt luôn <title> của tab trình duyệt theo tên màn hình.

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Dòng nhỏ phía trên tiêu đề, ví dụ liên kết quay lại danh sách. */
  before?: ReactNode;
}

export function PageHeader({ title, description, actions, before }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 dsvmd:flex-row dsvmd:items-end dsvmd:justify-between">
      <title>{`${title} · DSVHVN`}</title>
      <div className="min-w-0">
        {before && <div className="mb-2">{before}</div>}
        <h1 className="type-h1 text-on-surface">{title}</h1>
        {description && <div className="mt-2 max-w-[760px] type-body-m text-on-surface-variant">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/** Khung nội dung của một màn hình trong khu làm việc: lề và nhịp dọc thống nhất. */
export function AreaPage({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6 px-4 py-6 dsvmd:px-8 dsvmd:py-8">{children}</div>;
}
