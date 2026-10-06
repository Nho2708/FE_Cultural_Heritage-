import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickVoice } from './sentences';

// Nghe thuyết minh bằng giọng đọc có sẵn của trình duyệt (Web Speech API): không có tệp âm thanh, không tốn băng thông, không gọi dịch vụ ngoài.
// Đọc từng câu một để tô sáng câu đang đọc, đổi tốc độ và tạm dừng ổn định (đọc một đoạn dài một lần thì Chrome tự dừng giữa chừng).

export const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * `unsupported`: trình duyệt không có Web Speech API. `missing`: trình duyệt có nhưng không có giọng cho ngôn ngữ này (giao diện báo, hướng dẫn cài
 * giọng, vẫn hiện chữ). `unknown`: danh sách giọng chưa nạp xong (Chrome nạp muộn) nên cứ cho thử đọc. `ready`: có giọng.
 */
export type VoiceState = 'unsupported' | 'missing' | 'unknown' | 'ready';

export type NarrationStatus = 'idle' | 'playing' | 'paused';

function speechApi(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
}

export function useNarration(sentences: readonly string[], speechTag: string) {
  const synth = useMemo(() => speechApi(), []);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => synth?.getVoices() ?? []);
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [index, setIndex] = useState(-1);
  const [speed, setSpeedState] = useState<Speed>(1);
  const token = useRef(0);

  useEffect(() => {
    if (!synth) return;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener?.('voiceschanged', update);
    return () => synth.removeEventListener?.('voiceschanged', update);
  }, [synth]);

  const voice = useMemo(() => pickVoice(voices, speechTag), [voices, speechTag]);
  const voiceState: VoiceState = !synth ? 'unsupported' : voices.length === 0 ? 'unknown' : voice ? 'ready' : 'missing';

  const stop = useCallback(() => {
    token.current += 1;
    synth?.cancel();
    setStatus('idle');
    setIndex(-1);
  }, [synth]);

  const speakFrom = useCallback(
    (start: number, rate: Speed) => {
      if (!synth || sentences.length === 0) return;
      synth.cancel();
      const mine = ++token.current;
      const next = (position: number) => {
        if (mine !== token.current) return;
        if (position >= sentences.length) {
          setStatus('idle');
          setIndex(-1);
          return;
        }
        setIndex(position);
        const utterance = new SpeechSynthesisUtterance(sentences[position]);
        utterance.lang = speechTag;
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        utterance.onend = () => next(position + 1);
        utterance.onerror = (event) => {
          if (mine !== token.current) return;
          if (event.error === 'canceled' || event.error === 'interrupted') return;
          setStatus('idle');
          setIndex(-1);
        };
        synth.speak(utterance);
      };
      setStatus('playing');
      next(Math.max(0, Math.min(start, sentences.length - 1)));
    },
    [synth, sentences, speechTag, voice],
  );

  const play = useCallback(() => speakFrom(0, speed), [speakFrom, speed]);

  const pause = useCallback(() => {
    if (!synth || status !== 'playing') return;
    synth.pause();
    setStatus('paused');
  }, [synth, status]);

  const resume = useCallback(() => {
    if (!synth || status !== 'paused') return;
    synth.resume();
    setStatus('playing');
  }, [synth, status]);

  /** Đổi tốc độ: đang đọc thì đọc lại từ câu hiện tại với tốc độ mới. */
  const setSpeed = useCallback(
    (next: Speed) => {
      setSpeedState(next);
      if (status !== 'idle' && index >= 0) speakFrom(index, next);
    },
    [status, index, speakFrom],
  );

  // Rời trang (hoặc đóng hộp thoại, đổi nội dung: phần tử cha đổi `key`) thì dừng hẳn.
  useEffect(() => {
    const current = token;
    return () => {
      current.current += 1;
      synth?.cancel();
    };
  }, [synth]);

  return { voiceState, status, index, speed, setSpeed, play, pause, resume, stop };
}
