import { useEffect, useRef, useState } from 'react';

/** Giọng đọc có sẵn của trình duyệt (không gọi dịch vụ ngoài). Trình duyệt không có thì `supported` là false. */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const [speaking, setSpeaking] = useState(false);
  const active = useRef(false);

  const stop = () => {
    if (!supported) return;
    active.current = false;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = (text: string) => {
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
  };

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { supported, speaking, speak, stop };
}
