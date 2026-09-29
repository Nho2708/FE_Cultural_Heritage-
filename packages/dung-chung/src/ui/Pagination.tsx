import { Button } from './Button';
import { Icon } from './Icon';

// Phân trang dạng số của bảng quản trị: luôn hiện tổng số bản ghi
// ("1–20 / 45"), nút trước / sau có vùng bấm ≥ 44px, trang đầu / cuối thì khóa nút tương ứng.

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Tên danh sách để đọc cho trình đọc màn hình, ví dụ "giáo viên". */
  label: string;
}

const number = new Intl.NumberFormat('vi-VN');

export function Pagination({ page, pageSize, totalItems, totalPages, onChange, label }: PaginationProps) {
  if (totalItems === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return (
    <nav aria-label={`Phân trang ${label}`} className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="type-mono-label text-on-surface-variant">
        {number.format(from)}–{number.format(to)} / {number.format(totalItems)}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">
            <Icon name="chevron-left" size={16} />
          </Button>
          <span className="min-w-20 text-center type-body-s text-on-surface-variant" aria-live="polite">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Trang sau"
          >
            <Icon name="chevron-right" size={16} />
          </Button>
        </div>
      )}
    </nav>
  );
}
