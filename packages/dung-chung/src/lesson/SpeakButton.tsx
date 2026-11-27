import { cn } from '../cn';
import { Icon } from '../ui';
import { speakVietnamese } from './speechVoice';
import { useSpeechState } from './useSpeech';

// Nút loa đọc to bằng giọng của máy chủ, hoặc giọng tiếng Việt có sẵn của trình duyệt. Đang chờ máy chủ tạo tiếng thì nút xoay và báo "đang chuẩn bị".

function canSpeak(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof Audio !== 'undefined' || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'))
  );
}

const SIZE_MAP = {
  sm: { button: 'size-10', icon: 20 },
  md: { button: 'size-12', icon: 24 },
  lg: { button: 'size-14', icon: 28 },
};

export function SpeakButton({
  text,
  label,
  className,
  size = 'md',
}: {
  text: string;
  label: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { preparing } = useSpeechState(text);
  if (!canSpeak()) return null;
  const speak = () => {
    if (preparing) return;
    void speakVietnamese(text);
  };
  const s = SIZE_MAP[size] ?? SIZE_MAP.md;
  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label}
      aria-busy={preparing || undefined}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-xs transition-transform hover:scale-105 active:scale-95',
        s.button,
        className,
      )}
    >
      <Icon name={preparing ? 'refresh' : 'volume'} size={s.icon} className={preparing ? 'motion-safe:animate-spin' : undefined} />
      <span className="sr-only" aria-live="polite">
        {preparing ? 'Đang chuẩn bị giọng đọc' : ''}
      </span>
    </button>
  );
}
