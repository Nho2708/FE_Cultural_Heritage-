import { cn } from '../cn';
import { Icon } from '../ui';

import { getBestVietnameseVoice, VI_SPEECH_OPTIONS } from './speechVoice';

// Nút loa đọc to bằng giọng đọc có sẵn của trình duyệt (cấp 1). Trình duyệt không có giọng đọc thì không hiện nút.

function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
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
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    const voice = getBestVietnameseVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = VI_SPEECH_OPTIONS.rate;
    utterance.pitch = VI_SPEECH_OPTIONS.pitch;
    window.speechSynthesis.speak(utterance);
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
