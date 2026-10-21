import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnimatedLogo } from './AnimatedLogo';

// Biểu tượng chuyển động: dựng từ bốn nét vector (nóc, mái, hai trang sách), tôn trọng "giảm chuyển động" (kể cả khi
// người dùng đổi cài đặt lúc trang đang mở).

type Listener = () => void;

function prefersReducedMotion(initial: boolean) {
  let reduce = initial;
  const listeners = new Set<Listener>();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string) => ({
      get matches() {
        return reduce && media.includes('prefers-reduced-motion');
      },
      media,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
    }),
  });
  return (next: boolean) => {
    reduce = next;
    for (const listener of listeners) listener();
  };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('biểu tượng chuyển động', () => {
  it('có tên thương hiệu cho trình đọc màn hình; bốn nét vector, chiều cao theo cỡ, chiều rộng theo tỉ lệ', () => {
    render(<AnimatedLogo size={120} />);
    const logo = screen.getByRole('img', { name: 'DiViet' });
    expect(logo).toHaveAttribute('data-logo-motion', 'play');
    expect(logo).toHaveAttribute('height', '120');
    expect(logo).toHaveAttribute('width', '168');
    expect(logo.querySelectorAll('path')).toHaveLength(4);
    expect(logo.querySelector('img')).toBeNull();
  });

  it('trang trí: ẩn hẳn khỏi trình đọc màn hình', () => {
    const { container } = render(<AnimatedLogo decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('nền tối cố định: gắn lớp bộ màu tối', () => {
    const { container } = render(<AnimatedLogo decorative onDark />);
    expect(container.firstElementChild).toHaveClass('dsv-brand-mark--on-dark');
  });

  it('giảm chuyển động: biểu tượng tĩnh; đổi cài đặt lúc đang mở thì đổi theo', () => {
    const setReduce = prefersReducedMotion(true);
    const { container } = render(<AnimatedLogo size={96} />);
    const still = screen.getByRole('img', { name: 'DiViet' });
    expect(still).toHaveAttribute('height', '96');
    expect(still.querySelectorAll('path')).toHaveLength(4);
    expect(container.querySelector('[data-logo-motion]')).toBeNull();

    act(() => setReduce(false));
    expect(container.querySelector('[data-logo-motion]')).not.toBeNull();
  });
});
