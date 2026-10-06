import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '../cn';
import { Icon } from './Icon';

// Nút: primary · secondary · ghost · danger · link; cỡ sm 32 · md 40 · lg 48 · icon 40.
// danger CHỈ có dạng viền + icon cảnh báo, vì màu danger #B3261E gần trùng màu primary #A4231F.
// Vùng bấm tối thiểu 44px: cỡ nhỏ hơn được nới vùng bấm bằng lớp ::after trong suốt.
// PillLink là component riêng, chỉ một biến thể.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BASE =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none type-control ' +
  'transition-colors duration-(--dsv-duration-fast) ease-fade ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 ' +
  "after:absolute after:inset-x-0 after:content-['']";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'rounded-sm bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'rounded-sm border border-border-strong bg-transparent text-on-surface hover:bg-surface-container active:bg-surface-container-high',
  ghost: 'rounded-sm bg-transparent text-on-surface hover:bg-surface-container active:bg-surface-container-high',
  danger: 'rounded-sm border border-danger bg-transparent text-danger hover:bg-danger-container',
  link: 'rounded-xs text-link underline underline-offset-4 hover:bg-link-hover-bg',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 after:-inset-y-1.5',
  md: 'h-10 px-4 after:-inset-y-0.5',
  lg: 'h-12 px-6',
  icon: 'size-10 after:-inset-0.5',
};

function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(BASE, VARIANTS[variant], variant === 'link' ? 'px-1' : SIZES[size], className);
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 m-auto size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Đang xử lý: khóa nút, giữ nguyên kích thước, hiện vòng quay thay chữ. */
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, cn(fullWidth && 'w-full', className))}
      {...rest}
    >
      {variant === 'danger' && <Icon name="alert-triangle" size={16} className={loading ? 'invisible' : undefined} />}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
      {loading && <Spinner />}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

/** Liên kết điều hướng mang hình dạng Button (dùng khi hành động là chuyển trang). */
export function ButtonLink({ variant = 'primary', size = 'md', fullWidth, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, cn(fullWidth && 'w-full', typeof className === 'string' ? className : undefined))} {...rest}>
      {children}
    </Link>
  );
}

interface ExternalButtonLinkProps extends Omit<ComponentProps<'a'>, 'target' | 'rel'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href: string;
  children: ReactNode;
}

/** Liên kết ra trang khác (web khác hoặc tệp) mang hình dạng Button; luôn mở ở tab mới, không để trang mới điều khiển trang này. */
export function ExternalButtonLink({ variant = 'primary', size = 'md', className, children, ...rest }: ExternalButtonLinkProps) {
  return (
    <a className={buttonClasses(variant, size, className)} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

// PillLink: nút kêu gọi hành động dạng viên thuốc của trang công khai. Cao 36, đệm 8/24, bo 4px, chữ control. Không có biến thể khác.
const PILL =
  'relative inline-flex h-9 items-center justify-center rounded-xs px-6 py-2 whitespace-nowrap type-control ' +
  'bg-(--dsv-pill-bg) text-(--dsv-pill-fg) hover:bg-(--dsv-pill-bg-hover) active:bg-(--dsv-pill-bg-active) ' +
  'transition-colors duration-(--dsv-duration-fast) ease-out ' +
  "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']";

export function PillLink({ className, children, ...rest }: LinkProps & { children: ReactNode }) {
  return (
    <Link className={cn(PILL, typeof className === 'string' ? className : undefined)} {...rest}>
      {children}
    </Link>
  );
}
