import { cn } from '@dsvhvn/dung-chung';
import { Icon } from '@dsvhvn/dung-chung/ui';
import { pageWindow } from './pagination';

const number = new Intl.NumberFormat('vi-VN');

interface NumberedPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Đơn vị đếm, ví dụ "di sản": "Hiển thị 1–12 trên 20 di sản". */
  unit: string;
}

const CELL = 'flex size-11 items-center justify-center rounded-sm type-control transition-colors';

/** Phân trang có số trang: "Hiển thị 1–12 trên 20 di sản" bên trái, nút trang bên phải (trang đang xem tô nền). */
export function NumberedPagination({ page, pageSize, totalItems, totalPages, onChange, unit }: NumberedPaginationProps) {
  if (totalItems === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return (
    <nav aria-label="Phân trang" className="flex flex-col items-center justify-between gap-3 py-3 dsvsm:flex-row">
      <p className="type-body-s text-on-surface-muted">
        Hiển thị {number.format(from)}–{number.format(to)} trên {number.format(totalItems)} {unit}
      </p>
      {totalPages > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              aria-label="Trang trước"
              disabled={page <= 1}
              onClick={() => onChange(page - 1)}
              className={cn(CELL, 'border border-border hover:bg-surface-container disabled:opacity-40')}
            >
              <Icon name="chevron-left" size={16} />
            </button>
          </li>
          {pageWindow(page, totalPages).map((item, i) =>
            item === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-on-surface-muted">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-label={`Trang ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => onChange(item)}
                  className={cn(
                    CELL,
                    item === page
                      ? 'bg-primary-container text-on-primary-container'
                      : 'border border-border text-on-surface hover:bg-surface-container',
                  )}
                >
                  {item}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              aria-label="Trang sau"
              disabled={page >= totalPages}
              onClick={() => onChange(page + 1)}
              className={cn(CELL, 'border border-border hover:bg-surface-container disabled:opacity-40')}
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}
