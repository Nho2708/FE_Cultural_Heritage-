import type { ReactNode } from 'react';

interface StatusPageProps {
  /** Nhãn nhỏ viết hoa phía trên, ví dụ "LỖI 403". Viết sẵn chữ hoa (label-kicker giữ dấu tiếng Việt). */
  kicker: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

/** Khung chung của trang 403, 404 và trang lỗi hệ thống (EmptyState: luôn có hành động kế tiếp). */
export function StatusPage({ kicker, title, children, actions }: StatusPageProps) {
  return (
    <section className="dsv-content flex min-h-[60dvh] flex-col items-start justify-center gap-4 py-16">
      <title>{`${title} · DiViet`}</title>
      <p className="type-label-kicker text-on-surface-muted">{kicker}</p>
      <h1 className="max-w-[760px] type-h1 text-on-surface">{title}</h1>
      {children && <div className="max-w-[760px] type-body-m text-on-surface-variant">{children}</div>}
      {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
    </section>
  );
}
