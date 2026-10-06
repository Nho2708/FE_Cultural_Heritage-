import { cn } from '@dsvhvn/dung-chung';
import { Icon } from '@dsvhvn/dung-chung/ui';

// Hàng sao và thanh tiến độ dùng chung của khu học. Phần hình ẩn khỏi trình đọc màn hình, chữ đọc được nằm trong sr-only.

/** Hàng sao: `count` sao đầy trên `total` ô. */
export function Stars({ count, total = 3, size = 22, className }: { count: number; total?: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="sr-only">{`${count} trên ${total} sao`}</span>
      {Array.from({ length: total }, (_, i) => (
        <Icon key={i} name="star" size={size} className={i < count ? 'fill-current text-warning' : 'text-border-strong'} />
      ))}
    </span>
  );
}

/** Thanh tiến độ: `ratio` từ 0 đến 1, `label` là câu đọc cho trình đọc màn hình. */
export function Bar({ ratio, label, tone = 'primary', className }: { ratio: number; label: string; tone?: 'primary' | 'danger' | 'success'; className?: string }) {
  const width = Math.min(1, Math.max(0, ratio)) * 100;
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-surface-container-high', className)}>
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className={cn('h-full rounded-full', tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-success' : 'bg-primary')}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
