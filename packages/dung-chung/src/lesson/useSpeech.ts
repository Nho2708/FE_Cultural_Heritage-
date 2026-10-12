import { useCallback, useEffect, useRef, useState } from 'react';

/** Giọng đọc có sẵn của trình duyệt (không gọi dịch vụ ngoài). Trình duyệt không có thì `supported` là false. `speak` và `stop` giữ nguyên giữa các lần vẽ nên đặt được trong mảng phụ thuộc của hiệu ứng. */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const [speaking, setSpeaking] = useState(false);
  const active = useRef(false);

  const stop = useCallback(() => {
    if (!supported) return;
    active.current = false;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.onend = () => {
        if (active.current) {
          active.current = false;
          setSpeaking(false);
        }
      };
      utterance.onerror = utterance.onend;
      active.current = true;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { supported, speaking, speak, stop };
}
