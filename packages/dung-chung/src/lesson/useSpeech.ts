import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { normalizeSpeechText } from '../speech/ttsPrefetch';
import {
  dismissSpeechNotice,
  getSpeechActivity,
  getSpeechNoticeVisible,
  preloadSpeech,
  prefetchSpeech,
  speakVietnamese,
  stopAllSpeech,
  subscribeSpeechActivity,
  subscribeSpeechNotice,
} from './speechVoice';

function canSpeak(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof Audio !== 'undefined' || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'))
  );
}

/** Giọng đọc tiếng Việt (giọng của máy chủ, lùi về giọng trình duyệt nếu trình duyệt có giọng tiếng Việt). */
export function useSpeech() {
  const supported =
    typeof window !== 'undefined' &&
    (typeof Audio !== 'undefined' || ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'));
  const [speaking, setSpeaking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const active = useRef(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    active.current = false;
    cancelRef.current?.();
    cancelRef.current = null;
    stopAllSpeech();
    setSpeaking(false);
    setPreparing(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      stop();
      active.current = true;
      setSpeaking(true);

      const finish = () => {
        if (active.current) {
          active.current = false;
          setSpeaking(false);
          setPreparing(false);
        }
      };
      speakVietnamese(text, {
        onPreparing: () => active.current && setPreparing(true),
        onStart: () => active.current && setPreparing(false),
        onEnd: finish,
        onError: finish,
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

  return { supported, speaking, preparing, speak, stop };
}

/**
 * Đọc lần lượt từng câu và cho biết câu đang đọc (để tô sáng). `play` đọc từ câu đầu, `stop` dừng ngay. Mỗi lần đọc mới hủy lần đọc cũ,
 * nên câu của lần cũ đọc xong muộn cũng không đẩy tô sáng đi tiếp. Khi câu hiện tại bắt đầu có tiếng thì xin trước tiếng của câu kế tiếp để
 * hai câu nối liền, không hở. `preparing`: đang chờ máy chủ tạo tiếng của câu hiện tại.
 */
export function useSentenceReader(sentences: readonly string[]) {
  const supported = canSpeak();
  const [current, setCurrent] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);
  const run = useRef(0);
  const cancelRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    run.current += 1;
    cancelRef.current?.();
    cancelRef.current = null;
    stopAllSpeech();
    setCurrent(null);
    setPreparing(false);
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
        setPreparing(false);
        return;
      }
      setCurrent(index);
      void speakVietnamese(sentence, {
        onPreparing: () => id === run.current && setPreparing(true),
        onStart: () => {
          if (id !== run.current) return;
          setPreparing(false);
          const following = sentences[index + 1];
          if (following !== undefined) preloadSpeech(following);
        },
        onEnd: () => read(index + 1),
        onError: () => {
          if (id !== run.current) return;
          setCurrent(null);
          setPreparing(false);
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

  return { supported, current, preparing, speaking: current !== null, play, stop };
}

/** Trạng thái đọc chung của một đoạn chữ (cho nút loa): đang chuẩn bị tiếng hay đang đọc đúng đoạn này. Nút loa khác đang đọc thì đoạn này là rảnh. */
export function useSpeechState(text: string): { preparing: boolean; speaking: boolean } {
  const activity = useSyncExternalStore(subscribeSpeechActivity, getSpeechActivity, getSpeechActivity);
  const mine = activity.text !== null && activity.text === normalizeSpeechText(text);
  return { preparing: mine && activity.status === 'preparing', speaking: mine && activity.status === 'speaking' };
}

/**
 * Nhờ máy chủ tạo trước tiếng cho các chữ khi `enabled` (đã đăng nhập thì mới có tác dụng; xem trước của giáo viên truyền `false`). Chạy một lần cho mỗi bộ chữ
 * khác nhau, chữ đã gửi không gửi lại.
 */
export function usePrefetchSpeech(texts: readonly (string | null | undefined)[], enabled: boolean) {
  const key = useMemo(() => JSON.stringify(texts), [texts]);
  useEffect(() => {
    if (enabled) prefetchSpeech(JSON.parse(key) as Array<string | null>);
  }, [enabled, key]);
}

/** Lời báo "Máy này chưa đọc được tiếng Việt" có đang hiện không, và hàm tắt lời báo. */
export function useSpeechNotice(): { visible: boolean; dismiss: () => void } {
  const visible = useSyncExternalStore(subscribeSpeechNotice, getSpeechNoticeVisible, getSpeechNoticeVisible);
  return { visible, dismiss: dismissSpeechNotice };
}
