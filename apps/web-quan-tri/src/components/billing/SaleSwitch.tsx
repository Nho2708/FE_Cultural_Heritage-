import { cn } from '@dsvhvn/dung-chung';

// Công tắc bật tắt bán gói: nút `role="switch"`, trạng thái nói bằng aria-checked và vị trí núm, không chỉ bằng màu.

interface SaleSwitchProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onChange: (next: boolean) => void;
}

export function SaleSwitch({ checked, label, disabled = false, busy = false, onChange }: SaleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-(--dsv-duration-fast)',
        "after:absolute after:-inset-2.5 after:content-['']",
        checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface-container-high',
        'disabled:opacity-50',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'block size-4 rounded-full bg-surface shadow-1 transition-transform duration-(--dsv-duration-fast)',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}
