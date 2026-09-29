import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

/**
 * Trạng thái mở / đóng của một menu thả xuống (menu tài khoản, menu điều hướng). Menu gắn với lần điều hướng lúc mở:
 * chuyển trang (kể cả nút Back) là tự đóng. Bấm ra ngoài hoặc Esc thì đóng; Esc trả focus về nút mở.
 */
export function usePopover<R extends HTMLElement = HTMLDivElement, B extends HTMLElement = HTMLButtonElement>() {
  const location = useLocation();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.key;
  const rootRef = useRef<R>(null);
  const buttonRef = useRef<B>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenAt(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenAt(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return {
    open,
    rootRef,
    buttonRef,
    toggle: () => setOpenAt(open ? null : location.key),
    close: () => setOpenAt(null),
  };
}
