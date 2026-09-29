import type { ReactNode } from 'react';
import { cn } from '../cn';

// Nhãn trạng thái: nhãn tiếng Việt cho giá trị enum. Màu chỉ để nhấn: chữ luôn nói đủ nghĩa
// (quy tắc màu của design system), nền là bậc *-container để không thành khối đỏ đặc cạnh nút chính.

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  danger: 'bg-danger-container text-on-danger-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-xs px-2 whitespace-nowrap type-label', TONES[tone], className)}>
      {children}
    </span>
  );
}
