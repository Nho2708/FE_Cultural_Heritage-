import type { ReactNode } from 'react';
import { errorMessage } from '../api/client';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { InlineMessage } from './InlineMessage';

// Trạng thái tải, lỗi, rỗng của vùng dữ liệu (khối xương giữ chỗ, trạng thái rỗng).
// Mọi trạng thái rỗng và lỗi đều có một hành động kế tiếp.

/** Khối xương giữ chỗ trong lúc tải; bỏ hiệu ứng nhấp nháy khi người dùng tắt chuyển động (nen.css). */
export function LoadingState({ rows = 4, label = 'Đang tải…' }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-sm bg-surface-container-high" />
      ))}
    </div>
  );
}

/** Lỗi khi tải: câu thông báo của máy chủ (hoặc câu lỗi hệ thống) kèm nút "Thử lại". */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <InlineMessage
      tone="danger"
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </InlineMessage>
  );
}

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = 'info', title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border-strong px-6 py-10">
      <Icon name={icon} size={24} className="text-on-surface-muted" />
      <p className="type-h4 text-on-surface">{title}</p>
      {children && <div className="max-w-[560px] type-body-m text-on-surface-variant">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
