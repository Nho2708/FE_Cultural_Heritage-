import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnimatedLogo } from './AnimatedLogo';

// Huy hiệu chuyển động: dựng từ các lớp ảnh, chỉ chạy khi các lớp đã tải, tôn trọng "giảm chuyển động" (kể cả khi người
// dùng đổi cài đặt lúc trang đang mở).

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

describe('huy hiệu chuyển động', () => {
  it('có tên thương hiệu cho trình đọc màn hình, các lớp ảnh ẩn; chờ ảnh lớp cổng tải xong mới chạy', () => {
    render(<AnimatedLogo size={120} />);
    const logo = screen.getByRole('img', { name: 'DiViet' });
    expect(logo).toHaveStyle({ width: '120px', height: '120px' });
    expect(logo).toHaveAttribute('data-logo-motion', 'loading');

    const layers = logo.querySelectorAll('img');
    expect(layers).toHaveLength(5);
    for (const layer of layers) expect(layer).toHaveAttribute('alt', '');

    fireEvent.load(layers[0] as HTMLImageElement);
    expect(logo).toHaveAttribute('data-logo-motion', 'ready');
  });

  it('trang trí: ẩn hẳn khỏi trình đọc màn hình', () => {
    const { container } = render(<AnimatedLogo decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('giảm chuyển động: ảnh huy hiệu tĩnh; đổi cài đặt lúc đang mở thì đổi theo', () => {
    const setReduce = prefersReducedMotion(true);
    const { container } = render(<AnimatedLogo size={96} />);
    const still = screen.getByRole('img', { name: 'DiViet' });
    expect(still.tagName).toBe('IMG');
    expect(still).toHaveAttribute('width', '96');
    expect(container.querySelector('[data-logo-motion]')).toBeNull();

    act(() => setReduce(false));
    expect(container.querySelector('[data-logo-motion]')).not.toBeNull();
  });
});
