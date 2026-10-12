import { cn } from '../cn';

/** Công tắc "Tự đọc to" cạnh nút loa. */
export function AutoReadSwitch({ on, onChange, className }: { on: boolean; onChange: (on: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn('inline-flex min-h-12 items-center gap-3 rounded-full border-2 border-border bg-surface px-4 type-label text-on-surface', className)}
    >
      <span aria-hidden="true" className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'bg-border-strong')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-surface transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </span>
      Tự đọc to
    </button>
  );
}
