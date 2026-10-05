import { Icon } from '@dsvhvn/dung-chung/ui';

// Nút loa đọc to bằng giọng đọc có sẵn của trình duyệt (cấp 1). Trình duyệt không có giọng đọc thì không hiện nút.

function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function SpeakButton({ text, label }: { text: string; label: string }) {
  if (!canSpeak()) return null;
  const speak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };
  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label}
      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container transition-transform active:scale-95"
    >
      <Icon name="volume" size={28} />
    </button>
  );
}
