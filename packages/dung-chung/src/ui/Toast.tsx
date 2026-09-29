import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../cn';
import { Icon, type IconName } from './Icon';
import { ToastContext, type ToastApi, type ToastKind } from './toastContext';

// Toast: nền inverse-surface, icon đứng trước chữ, role="status" cho thông tin,
// role="alert" cho lỗi. Tự tắt sau 5 giây, riêng lỗi không tự tắt; rê chuột / focus thì dừng đếm. Tối đa 3 toast.
// Nội dung lấy đúng câu của danh mục thông báo (thường là câu backend trả về). Icon đặt trong vùng data-theme="dark" để lấy bậc
// màu sáng của semantic trên nền tối — giống cách Figma đặt chế độ Dark riêng cho icon của Toast.

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 5000;

const KIND_STYLE: Record<ToastKind, { icon: IconName; color: string }> = {
  success: { icon: 'check', color: 'text-success' },
  info: { icon: 'info', color: 'text-on-surface' },
  warning: { icon: 'alert-triangle', color: 'text-warning' },
  danger: { icon: 'alert-triangle', color: 'text-danger' },
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const [paused, setPaused] = useState(false);
  const autoDismiss = item.kind !== 'danger';

  // Dừng đếm giờ khi con trỏ hoặc focus bàn phím đang ở trong toast.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pause = () => setPaused(true);
    const resume = () => setPaused(false);
    el.addEventListener('pointerenter', pause);
    el.addEventListener('pointerleave', resume);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', resume);
    return () => {
      el.removeEventListener('pointerenter', pause);
      el.removeEventListener('pointerleave', resume);
      el.removeEventListener('focusin', pause);
      el.removeEventListener('focusout', resume);
    };
  }, []);

  useEffect(() => {
    if (!autoDismiss || paused) return;
    const timer = window.setTimeout(() => onClose(item.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [autoDismiss, paused, item.id, onClose]);

  const style = KIND_STYLE[item.kind];
  return (
    <li
      ref={ref}
      role={item.kind === 'danger' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-lg bg-(--dsv-toast-bg) py-3 pr-2 pl-4 text-(--dsv-toast-fg) shadow-1"
    >
      <span data-theme="dark" className={cn('mt-0.5 shrink-0', style.color)}>
        <Icon name={style.icon} size={20} />
      </span>
      <p className="min-w-0 flex-1 py-0.5 type-body-m">{item.message}</p>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        aria-label="Đóng thông báo"
        className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-(--dsv-toast-fg)/10"
      >
        <Icon name="x" size={18} />
      </button>
    </li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const close = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, kind, message }].slice(-MAX_TOASTS));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      info: (m) => push('info', m),
      warning: (m) => push('warning', m),
      error: (m) => push('danger', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label="Thông báo"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-(--dsv-z-toast) dsvsm:left-auto dsvsm:w-100"
      >
        <ol aria-live="polite" className="flex flex-col gap-2">
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onClose={close} />
          ))}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}
