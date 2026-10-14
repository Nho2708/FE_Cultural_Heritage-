import { cn } from '../cn';
import { useTheme, type ThemeMode } from '../theme/useTheme';

const LABELS: Record<ThemeMode, string> = {
  light: 'Chế độ sáng',
  dark: 'Chế độ tối',
  system: 'Giao diện hệ thống',
};

function getNextMode(current: ThemeMode): ThemeMode {
  switch (current) {
    case 'light':
      return 'dark';
    case 'dark':
      return 'system';
    case 'system':
    default:
      return 'light';
  }
}

/** Biểu tượng mặt trời vàng ấm, lõi đặc và 8 tia sáng rõ nét */
function SunIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Vầng thái dương lõi đặc */}
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      {/* 8 tia sáng đậm nét */}
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="1.8" x2="12" y2="4.5" />
        <line x1="12" y1="19.5" x2="12" y2="22.2" />
        <line x1="1.8" y1="12" x2="4.5" y2="12" />
        <line x1="19.5" y1="12" x2="22.2" y2="12" />
        <line x1="4.8" y1="4.8" x2="6.7" y2="6.7" />
        <line x1="17.3" y1="17.3" x2="19.2" y2="19.2" />
        <line x1="4.8" y1="19.2" x2="6.7" y2="17.3" />
        <line x1="17.3" y1="6.7" x2="19.2" y2="4.8" />
      </g>
    </svg>
  );
}

/** Biểu tượng mặt trăng khuyết vàng phát sáng kèm sao lấp lánh nổi bật trên nền tối */
function MoonIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Mặt trăng khuyết đúc đặc màu vàng sáng */}
      <path
        d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3.5a8.5 8.5 0 1 0 10 10Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Ngôi sao lấp lánh 1 */}
      <path
        d="M17.5 3.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5Z"
        fill="currentColor"
      />
      {/* Ngôi sao lấp lánh 2 */}
      <path
        d="M20.5 8l.4.8.8.4-.8.4-.4.8-.4-.8-.8-.4.8-.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Biểu tượng màn hình vi tính cho chế độ hệ thống */
function MonitorIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const BUTTON_STYLE =
  'flex size-11 shrink-0 items-center justify-center rounded-sm border border-(--dsv-input-border) ' +
  'bg-transparent transition-all duration-(--dsv-duration-control) ease-header ' +
  'hover:bg-(--dsv-topbar-hover-bg) hover:border-(--dsv-color-primary) active:scale-95 focus-visible:outline-2 focus-visible:outline-(--dsv-color-primary)';

/**
 * Nút chuyển Light / Dark / System mode trên topbar.
 * Bấm để chuyển đổi qua lại: Sáng (light) → Tối (dark) → Hệ thống (system) → Sáng…
 * Icon được thiết kế tương phản cao, đậm nét và có màu sắc đặc trưng dễ nhận biết trên mọi nền.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const next = getNextMode(mode);
  const currentLabel = LABELS[mode] ?? LABELS.light;
  const nextLabel = LABELS[next] ?? LABELS.light;

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={`Giao diện: ${currentLabel}. Bấm để chuyển sang ${nextLabel}`}
      title={`${currentLabel} (bấm để đổi sang ${nextLabel})`}
      className={cn(BUTTON_STYLE, className)}
    >
      {mode === 'light' && (
        <SunIcon size={22} className="text-amber-500 transition-transform duration-200 hover:rotate-45" />
      )}
      {mode === 'dark' && (
        <MoonIcon size={22} className="text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] transition-transform duration-200 hover:-rotate-12" />
      )}
      {mode === 'system' && (
        <MonitorIcon size={20} className="text-sky-500 transition-transform duration-200" />
      )}
    </button>
  );
}
