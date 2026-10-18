import { cn } from '../cn';
import { Icon } from '../ui';
import { speakVietnamese } from './speechVoice';

// Nút loa đọc to bằng FPT.AI Cloud TTS hoặc giọng có sẵn của trình duyệt.

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
  if (!canSpeak()) return null;
  const speak = () => {
    speakVietnamese(text);
  };
  const s = SIZE_MAP[size] ?? SIZE_MAP.md;
  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-xs transition-transform hover:scale-105 active:scale-95',
        s.button,
        className,
      )}
    >
      <Icon name="volume" size={s.icon} />
    </button>
  );
}
