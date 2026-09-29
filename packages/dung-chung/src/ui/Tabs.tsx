import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../cn';

// Tabs biến thể gạch chân: chỉ báo 3px màu primary, chữ control.
// Giữ tab trên URL bằng ?tab= (trang cha lo).
// Bàn phím: ←/→ chuyển tab, Home/End về đầu/cuối (mẫu tablist của WAI-ARIA, kích hoạt tự động).

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  idPrefix: string;
  label: string;
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
}

const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

export function Tabs<T extends string>({ idPrefix, label, items, value, onChange }: TabsProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const focusAt = (index: number) => {
    const item = items[(index + items.length) % items.length];
    if (!item) return;
    onChange(item.id);
    refs.current.get(item.id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = items.findIndex((t) => t.id === value);
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: items.length - 1 };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    focusAt(next);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-2 overflow-x-auto border-b border-border [scrollbar-width:none]"
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) refs.current.set(item.id, el);
              else refs.current.delete(item.id);
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, item.id)}
            aria-selected={selected}
            aria-controls={selected ? panelId(idPrefix, item.id) : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={onKeyDown}
            className={cn(
              'relative h-12 shrink-0 rounded-t-sm px-4 type-control transition-colors duration-(--dsv-duration-fast)',
              "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t-xs after:content-['']",
              'after:transition-colors after:duration-(--dsv-duration-fast) after:ease-fade',
              selected
                ? 'text-(--dsv-tab-active-fg) after:bg-(--dsv-tab-active-indicator)'
                : 'text-(--dsv-tab-inactive-fg) hover:bg-surface-container-low hover:text-on-surface after:bg-transparent',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  idPrefix: string;
  id: string;
  children: ReactNode;
}

export function TabPanel({ idPrefix, id, children }: TabPanelProps) {
  return (
    <div role="tabpanel" id={panelId(idPrefix, id)} aria-labelledby={tabId(idPrefix, id)} className="pt-8">
      {children}
    </div>
  );
}
