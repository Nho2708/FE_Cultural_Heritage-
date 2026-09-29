import { cn } from '@dsvhvn/dung-chung';
import type { IllustrationSet, IllustrationState } from '@dsvhvn/dung-chung/theme';
import { useLearningTheme } from './context';

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
  const mouth = state === 'dong-vien' ? 'M40 70 Q60 60 80 70' : 'M40 64 Q60 84 80 64';
  return (
    <>
      <circle cx="60" cy="58" r="40" fill="var(--dsv-color-secondary-container)" stroke="currentColor" strokeWidth="4" />
      <circle cx="46" cy="50" r="5" fill="currentColor" />
      <circle cx="74" cy="50" r="5" fill="currentColor" />
      <path d={mouth} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {state === 'chuc-mung' && <path d="M18 18l8 8M102 18l-8 8M60 4v10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />}
    </>
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
      className={cn('flex size-28 shrink-0 items-center justify-center rounded-md bg-primary-container text-primary', className)}
    >
      <svg viewBox="0 0 120 120" className="size-24">
        <Drawing set={theme.illustrationSet} state={state} />
      </svg>
    </figure>
  );
}
