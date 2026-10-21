import { useCallback, useEffect, useRef, useState } from 'react';
import { speakVietnamese, stopAllSpeech } from './speechVoice';

/** Giọng đọc tiếng Việt (Cloud FPT.AI kèm fallback Web Speech của trình duyệt). */
export function useSpeech() {
  const supported =
    typeof window !== 'undefined' &&
    (typeof Audio !== 'undefined' || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'));
  const [speaking, setSpeaking] = useState(false);
  const active = useRef(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    active.current = false;
    cancelRef.current?.();
    cancelRef.current = null;
    stopAllSpeech();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      stop();
      active.current = true;
      setSpeaking(true);

      speakVietnamese(text, {
        onEnd: () => {
          if (active.current) {
            active.current = false;
            setSpeaking(false);
          }
        },
        onError: () => {
          if (active.current) {
            active.current = false;
            setSpeaking(false);
          }
        },
      }).then((cancel) => {
        if (active.current) {
          cancelRef.current = cancel;
        } else {
          cancel();
        }
      });
    },
    [supported, stop],
  );

  useEffect(
    () => () => {
      stopAllSpeech();
    },
    [],
  );

  return { supported, speaking, speak, stop };
}
