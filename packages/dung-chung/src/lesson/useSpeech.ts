import { useCallback, useEffect, useRef, useState } from 'react';
import { speakVietnamese, stopAllSpeech } from './speechVoice';

function canSpeak(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof Audio !== 'undefined' || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'))
  );
}

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

/**
 * Đọc lần lượt từng câu và cho biết câu đang đọc (để tô sáng). `play` đọc từ câu đầu, `stop` dừng ngay. Mỗi lần đọc mới hủy lần đọc cũ,
 * nên câu của lần cũ đọc xong muộn cũng không đẩy tô sáng đi tiếp.
 */
export function useSentenceReader(sentences: readonly string[]) {
  const supported = canSpeak();
  const [current, setCurrent] = useState<number | null>(null);
  const run = useRef(0);
  const cancelRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    run.current += 1;
    cancelRef.current?.();
    cancelRef.current = null;
    stopAllSpeech();
    setCurrent(null);
  }, []);

  const play = useCallback(() => {
    if (!supported) return;
    stop();
    const id = run.current;
    const read = (index: number) => {
      if (id !== run.current) return;
      const sentence = sentences[index];
      if (sentence === undefined) {
        setCurrent(null);
        return;
      }
      setCurrent(index);
      void speakVietnamese(sentence, {
        onEnd: () => read(index + 1),
        onError: () => {
          if (id === run.current) setCurrent(null);
        },
      }).then((cancel) => {
        if (id === run.current) cancelRef.current = cancel;
        else cancel();
      });
    };
    read(0);
  }, [sentences, stop, supported]);

  useEffect(
    () => () => {
      run.current += 1;
      stopAllSpeech();
    },
    [],
  );

  return { supported, current, speaking: current !== null, play, stop };
}
