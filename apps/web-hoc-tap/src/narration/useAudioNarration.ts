import type { PublicNarration } from '@dsvhvn/dung-chung/api';
import { sentenceIndexAt, sentenceStartMs } from '@dsvhvn/dung-chung/speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NarrationStatus, Speed } from './useNarration';

// Nghe thuyết minh tạo sẵn: một tệp MP3 đọc cả bản tóm tắt ngắn bằng giọng tự host, kèm mốc bắt đầu của từng câu. Phát bằng phần tử audio của
// trình duyệt; câu đang đọc tính từ thời điểm phát (sự kiện `timeupdate`), tốc độ đổi ngay bằng `playbackRate` và giữ cao độ. Tệp không tải hay
// không phát được (mạng, 404, hỏng) thì báo cho nơi gọi lùi về giọng của thiết bị, không hiện lỗi.

/** Phần của `HTMLAudioElement` mà thuyết minh dùng tới; test thay bằng bản giả qua `globalThis.Audio`. */
export interface NarrationAudio {
  src: string;
  preload: string;
  playbackRate: number;
  preservesPitch: boolean;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface AudioNarration {
  status: NarrationStatus;
  /** Chỉ số câu đang đọc theo mốc của tệp, -1 khi không phát. */
  index: number;
  speed: Speed;
  /** Tệp không dùng được: nơi gọi chuyển sang giọng của thiết bị. */
  failed: boolean;
  setSpeed: (speed: Speed) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** Nhảy tới đầu một câu và phát từ đó. */
  seekTo: (index: number) => void;
}

function createAudio(): NarrationAudio | null {
  if (typeof Audio === 'undefined') return null;
  try {
    return new Audio();
  } catch {
    return null;
  }
}

/**
 * @param narration Thuyết minh của bản tóm tắt đang hiện; null thì không tạo phần tử audio.
 * @param audioUrl Địa chỉ đủ của tệp (đã ghép với máy chủ API).
 * @param onFail Gọi một lần khi tệp hỏng; `wasActive` cho biết người dùng đang nghe (để đọc tiếp bằng giọng thiết bị thay vì im lặng).
 */
export function useAudioNarration(narration: PublicNarration | null, audioUrl: string | null, onFail?: (wasActive: boolean) => void): AudioNarration {
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [index, setIndex] = useState(-1);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [failed, setFailed] = useState(false);
  const audio = useRef<NarrationAudio | null>(null);
  // Bản sao để các hàm xử lý sự kiện của phần tử audio đọc được giá trị mới nhất mà không gắn lại sự kiện.
  const statusRef = useRef<NarrationStatus>('idle');
  const speedRef = useRef<Speed>(1);
  const failedRef = useRef(false);
  const onFailRef = useRef(onFail);
  const sentencesRef = useRef(narration?.sentences ?? []);
  useEffect(() => {
    onFailRef.current = onFail;
    sentencesRef.current = narration?.sentences ?? [];
  }, [onFail, narration]);

  const setPlayback = useCallback((next: NarrationStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const fail = useCallback(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    const wasActive = statusRef.current !== 'idle';
    audio.current?.pause();
    setPlayback('idle');
    setIndex(-1);
    setFailed(true);
    onFailRef.current?.(wasActive);
  }, [setPlayback]);

  const startPlaying = useCallback(
    (element: NarrationAudio) => {
      element.playbackRate = speedRef.current;
      setPlayback('playing');
      let started: Promise<void> | void;
      try {
        started = element.play();
      } catch {
        fail();
        return;
      }
      // Trình duyệt từ chối phát (định dạng không hỗ trợ, tệp hỏng) thì lùi về giọng thiết bị.
      if (started && typeof started.catch === 'function') started.catch(fail);
    },
    [fail, setPlayback],
  );

  // Tạo phần tử audio khi có thuyết minh và tải trước tệp để bấm Phát là nghe ngay; tệp hỏng được biết sớm (lúc chưa bấm) nên lùi về giọng thiết bị
  // mà người dùng không thấy khác gì. Đổi tệp (đổi ngôn ngữ, đổi tóm tắt) thì bỏ phần tử cũ.
  useEffect(() => {
    if (!narration || !audioUrl) return;
    const element = createAudio();
    if (!element) {
      fail();
      return;
    }
    const onTime = () => {
      if (statusRef.current === 'idle') return;
      setIndex(sentenceIndexAt(sentencesRef.current, element.currentTime * 1000));
    };
    const onEnded = () => {
      setPlayback('idle');
      setIndex(-1);
    };
    element.addEventListener('timeupdate', onTime);
    element.addEventListener('seeked', onTime);
    element.addEventListener('ended', onEnded);
    element.addEventListener('error', fail);
    element.preservesPitch = true;
    element.preload = 'auto';
    element.src = audioUrl;
    audio.current = element;
    return () => {
      element.removeEventListener('timeupdate', onTime);
      element.removeEventListener('seeked', onTime);
      element.removeEventListener('ended', onEnded);
      element.removeEventListener('error', fail);
      element.pause();
      audio.current = null;
    };
  }, [narration, audioUrl, fail, setPlayback]);

  const play = useCallback(() => {
    const element = audio.current;
    if (!element || failedRef.current || sentencesRef.current.length === 0) return;
    element.currentTime = 0;
    setIndex(sentenceIndexAt(sentencesRef.current, 0));
    startPlaying(element);
  }, [startPlaying]);

  const pause = useCallback(() => {
    const element = audio.current;
    if (!element || statusRef.current !== 'playing') return;
    element.pause();
    setPlayback('paused');
  }, [setPlayback]);

  const resume = useCallback(() => {
    const element = audio.current;
    if (!element || statusRef.current !== 'paused') return;
    startPlaying(element);
  }, [startPlaying]);

  const stop = useCallback(() => {
    const element = audio.current;
    if (element) {
      element.pause();
      element.currentTime = 0;
    }
    setPlayback('idle');
    setIndex(-1);
  }, [setPlayback]);

  /** Đổi tốc độ: áp ngay vào tệp đang phát, không đọc lại câu. */
  const setSpeed = useCallback((next: Speed) => {
    speedRef.current = next;
    setSpeedState(next);
    if (audio.current) audio.current.playbackRate = next;
  }, []);

  const seekTo = useCallback(
    (position: number) => {
      const element = audio.current;
      if (!element || failedRef.current) return;
      const target = Math.max(0, Math.min(position, sentencesRef.current.length - 1));
      element.currentTime = sentenceStartMs(sentencesRef.current, target) / 1000;
      setIndex(target);
      if (statusRef.current !== 'playing') startPlaying(element);
    },
    [startPlaying],
  );

  return { status, index, speed, failed, setSpeed, play, pause, resume, stop, seekTo };
}
