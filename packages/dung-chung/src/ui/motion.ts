import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

// Hai móc chuyển động dùng chung của hai web: đọc cài đặt "giảm chuyển động" của hệ điều hành và cho một khối hiện lên
// một lần khi cuộn tới. Khi người dùng bật giảm chuyển động, khối hiện ngay, không chờ cuộn, không trượt.

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function canMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function subscribeReducedMotion(onChange: () => void): () => void {
  if (!canMatchMedia()) return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function readReducedMotion(): boolean {
  return canMatchMedia() && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** true khi người dùng bật "giảm chuyển động"; theo dõi cả khi họ đổi cài đặt lúc trang đang mở. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
}

/**
 * Trạng thái hiện lên của một khối:
 * - `static`: hiện ngay, không chuyển động (giảm chuyển động, trình duyệt không có IntersectionObserver);
 * - `waiting`: đang ẩn, chờ cuộn tới;
 * - `shown`: đã cuộn tới, các phần tử con chạy chuyển động vào đúng một lần.
 */
export type RevealState = 'static' | 'waiting' | 'shown';

/**
 * Cho khối hiện lên một lần khi lọt vào màn hình. Gắn `ref` và `data-reveal={state}` lên khối; phần tử con mang
 * `data-reveal-item` cùng biến `--reveal-index` để lệch nhịp 60 ms (token `--dsv-stagger-ui`).
 */
export function useRevealOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  const [state, setState] = useState<RevealState>('static');

  // Đặt trạng thái chờ trước khi trình duyệt vẽ để khối đã nằm trong màn hình không nháy hiện rồi ẩn.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || reduced || typeof IntersectionObserver === 'undefined') {
      setState((current) => (current === 'waiting' ? 'static' : current));
      return;
    }
    setState((current) => (current === 'shown' ? current : 'waiting'));
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('shown');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);

  return { ref, state };
}
