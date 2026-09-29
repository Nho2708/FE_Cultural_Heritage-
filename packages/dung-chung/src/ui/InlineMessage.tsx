import type { ReactNode } from 'react';
import { cn } from '../cn';
import { Icon, type IconName } from './Icon';

// Thông báo kiểu "In line" (sai thông tin đăng nhập, tài khoản bị chặn, đã gửi liên kết…): khối nằm trong form,
// luôn có icon và nằm trên nền *-container (lỗi không bao giờ là khối đỏ đặc cạnh nút chính).

type Tone = 'danger' | 'success' | 'warning' | 'info';

const TONES: Record<Tone, { icon: IconName; className: string }> = {
  danger: { icon: 'alert-triangle', className: 'bg-danger-container text-on-danger-container' },
  success: { icon: 'check', className: 'bg-success-container text-on-success-container' },
  warning: { icon: 'alert-triangle', className: 'bg-warning-container text-on-warning-container' },
  info: { icon: 'info', className: 'bg-surface-container text-on-surface' },
};

interface InlineMessageProps {
  tone: Tone;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function InlineMessage({ tone, children, action, className }: InlineMessageProps) {
  const style = TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-sm px-4 py-3 type-body-s', style.className, className)}
    >
      <Icon name={style.icon} size={20} className="mt-px shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <p>{children}</p>
        {action}
      </div>
    </div>
  );
}
