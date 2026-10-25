import { cn } from '../cn';
import type { IllustrationSet, IllustrationState } from '../theme';
import { useLearningTheme } from './themeContext';

// Chỗ đặt hình minh họa theo trạng thái (chào, chúc mừng, động viên, trống). Một khối cố định trên bố cục; hình lấy từ
// bộ hình của bộ giao diện đang dùng: ảnh di sản (mặc định), hình vẽ tay có linh vật (cấp 1), biểu tượng nét (cấp 2),
// biểu tượng tối giản (cấp 3). Bản này vẽ hình giữ chỗ bằng SVG; khi có tranh thật, đặt tệp ở
// public/hinh-minh-hoa/<bộ hình>/<trạng thái>.svg và đổi phần vẽ ở đây, không đổi nơi dùng.

const LABEL: Record<IllustrationState, string> = {
  chao: 'lời chào',
  'chuc-mung': 'chúc mừng',
  'dong-vien': 'động viên',
  trong: 'chưa có nội dung',
};

function Mascot({ state }: { state: IllustrationState }) {
  return (
    <g className="dsv-mascot">
      {/* Ears */}
      <circle cx="34" cy="32" r="14" fill="#FBBF24" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="34" cy="32" r="7" fill="#FDE68A" />
      <circle cx="86" cy="32" r="14" fill="#FBBF24" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="86" cy="32" r="7" fill="#FDE68A" />

      {/* Main Face */}
      <circle cx="60" cy="62" r="38" fill="var(--dsv-color-secondary-container, #FDE047)" stroke="currentColor" strokeWidth="3.5" />

      {/* Twinkly Happy Eyes */}
      <ellipse cx="45" cy="54" rx="5" ry="6.5" fill="currentColor" />
      <circle cx="43.5" cy="51.5" r="2" fill="#FFFFFF" />
      <ellipse cx="75" cy="54" rx="5" ry="6.5" fill="currentColor" />
      <circle cx="73.5" cy="51.5" r="2" fill="#FFFFFF" />

      {/* Rosy Cheeks */}
      <ellipse cx="34" cy="66" rx="6.5" ry="4" fill="#FB7185" opacity="0.65" />
      <ellipse cx="86" cy="66" rx="6.5" ry="4" fill="#FB7185" opacity="0.65" />

      {/* Cute Nose */}
      <ellipse cx="60" cy="61" rx="4" ry="3" fill="#D97706" />

      {/* Cheerful Mouth */}
      {state === 'dong-vien' ? (
        <path d="M48 73 Q60 67 72 73" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path d="M46 67 Q60 85 74 67 Z" fill="#EF4444" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      )}

      {/* Sparkles / Stars for Greeting & Celebration */}
      {(state === 'chao' || state === 'chuc-mung') && (
        <>
          <path d="M16 16 L22 22 M104 16 L98 22 M60 8 L60 16" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="18" cy="42" r="3" fill="#F59E0B" />
          <circle cx="102" cy="42" r="3" fill="#F59E0B" />
        </>
      )}
    </g>
  );
}

function LineIcon({ state }: { state: IllustrationState }) {
  return state === 'chuc-mung' ? (
    <path d="M60 14l13 27 30 4-22 21 5 30-26-14-26 14 5-30-22-21 30-4Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
  ) : (
    <path d="M20 30h32a8 8 0 0 1 8 8v58a6 6 0 0 0-6-6H20ZM100 30H68a8 8 0 0 0-8 8v58a6 6 0 0 1 6-6h34Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
  );
}

function Minimal({ state }: { state: IllustrationState }) {
  return state === 'chuc-mung' ? (
    <path d="M36 62l16 16 32-36" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  ) : (
    <>
      <circle cx="60" cy="58" r="26" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M30 100h60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function HeritagePhoto() {
  return (
    <>
      <rect x="10" y="18" width="100" height="80" rx="8" fill="var(--dsv-color-surface-container-low)" stroke="currentColor" strokeWidth="4" />
      <path d="M18 88l28-32 18 20 12-12 26 24Z" fill="currentColor" opacity="0.35" />
      <circle cx="84" cy="40" r="8" fill="currentColor" opacity="0.5" />
    </>
  );
}

function Drawing({ set, state }: { set: IllustrationSet; state: IllustrationState }) {
  switch (set) {
    case 'linh-vat':
      return <Mascot state={state} />;
    case 'bieu-tuong-net':
      return <LineIcon state={state} />;
    case 'toi-gian':
      return <Minimal state={state} />;
    case 'anh-di-san':
      return <HeritagePhoto />;
  }
}

export function Illustration({ state, className }: { state: IllustrationState; className?: string }) {
  const theme = useLearningTheme();
  return (
    <figure
      aria-hidden="true"
      data-bo-hinh={theme.illustrationSet}
      data-trang-thai={state}
      title={`Hình minh họa ${LABEL[state]}`}
      className={cn(
        'flex shrink-0 items-center justify-center text-primary',
        // Lớp nơi dùng truyền vào thay hẳn cỡ, bo góc, nền mặc định (cn không gộp lớp trùng thuộc tính).
        !/(^|\s)size-/.test(className ?? '') && 'size-28',
        !/(^|\s)rounded-/.test(className ?? '') && 'rounded-md',
        !/(^|\s)bg-/.test(className ?? '') && 'bg-primary-container',
        className,
      )}
    >
      <svg viewBox="0 0 120 120" className="size-[86%]">
        <Drawing set={theme.illustrationSet} state={state} />
      </svg>
    </figure>
  );
}
