import { Link, type LinkProps } from 'react-router';
import { cn } from '../cn';

/** Link chữ: màu link + gạch chân bắt buộc (quy tắc liên kết của design system), nền hover link-hover-bg. */
export function TextLink({ className, ...rest }: LinkProps) {
  return (
    <Link
      className={cn(
        'rounded-xs type-control text-link underline decoration-1 underline-offset-4 hover:bg-link-hover-bg',
        typeof className === 'string' ? className : undefined,
      )}
      {...rest}
    />
  );
}
