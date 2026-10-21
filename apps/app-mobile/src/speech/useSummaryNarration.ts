import type { PublicNarration } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { externalUrl } from '../guest/format';
import { AudioNarrator, type AudioNarrationState, type AudioPlayerFactory } from './audioNarrator';
import { expoAudioPlayer } from './expoAudioPlayer';
import type { NarrationState, SpeechEngine } from './narrator';
import { expoSpeechEngine, type Narration, useNarration } from './useNarration';

// Nghe bản tóm tắt ngắn của di sản: có thuyết minh tạo sẵn thì phát tệp MP3 và hiện đúng các câu đã có mốc; không có hoặc tệp hỏng thì đọc
// bằng giọng của điện thoại như trước (đang nghe dở mà tệp hỏng thì đọc tiếp luôn bằng giọng đó). Giao diện nhận cùng một dạng dữ liệu ở cả hai trường hợp.

const IDLE: AudioNarrationState = { status: 'idle', index: -1, speed: 1, voiceState: 'ready', failed: false };
const idleState = () => IDLE;
const noSubscribe = () => () => undefined;

/** Thuyết minh tạo sẵn dùng được: có tệp mở được từ điện thoại và có ít nhất một câu có mốc. */
function usableNarration(narration: PublicNarration | null | undefined): { narration: PublicNarration; url: string } | null {
  if (!narration || narration.sentences.length === 0) return null;
  const url = externalUrl(narration.audioUrl);
  return url ? { narration, url } : null;
}

/** Nối `AudioNarrator` với React: tạo khi có tệp, giải phóng khi rời màn hình hay đổi tệp. */
export function useAudioNarration(
  prepared: { narration: PublicNarration; url: string } | null,
  onFail: (wasActive: boolean) => void,
  createPlayer: AudioPlayerFactory = expoAudioPlayer,
) {
  // `onFail` phải ổn định (useCallback) vì đổi nó là tạo lại trình phát.
  const narrator = useMemo(
    () => (prepared ? new AudioNarrator(createPlayer, prepared.url, prepared.narration.sentences, onFail) : null),
    [prepared, createPlayer, onFail],
  );

  useEffect(() => {
    if (!narrator) return;
    narrator.init();
    return () => narrator.dispose();
  }, [narrator]);

  const state = useSyncExternalStore(narrator?.subscribe ?? noSubscribe, narrator?.getState ?? idleState, narrator?.getState ?? idleState);

  const actions = useMemo(
    () => ({
      play: () => narrator?.play(),
      pause: () => narrator?.pause(),
      resume: () => narrator?.resume(),
      stop: () => narrator?.stop(),
      playWhenReady: () => narrator?.playWhenReady() ?? Promise.resolve(),
      setSpeed: (speed: NarrationState['speed']) => narrator?.setSpeed(speed),
      seekTo: (index: number) => narrator?.seekTo(index),
    }),
    [narrator],
  );

  return { ...state, ...actions };
}

export interface SummaryNarration extends Narration {
  /** Đang phát tệp thuyết minh tạo sẵn (không cần giọng của điện thoại). */
  usingAudio: boolean;
  /** Nhảy tới đầu một câu và phát từ đó; chỉ có tác dụng khi đang phát tệp tạo sẵn. */
  seekTo: (index: number) => void;
}

export function useSummaryNarration(
  text: string,
  speechTag: string,
  narration: PublicNarration | null | undefined,
  engine: SpeechEngine = expoSpeechEngine,
  createPlayer: AudioPlayerFactory = expoAudioPlayer,
): SummaryNarration {
  const device = useNarration(text, speechTag, engine);
  const prepared = useMemo(() => usableNarration(narration), [narration]);
  const devicePlay = device.play;
  const onFail = useCallback((wasActive: boolean) => void (wasActive && devicePlay()), [devicePlay]);
  const audio = useAudioNarration(prepared, onFail, createPlayer);
  const usingAudio = prepared !== null && !audio.failed;
  const audioSentences = useMemo(() => prepared?.narration.sentences.map((sentence) => sentence.text) ?? [], [prepared]);

  if (!usingAudio) return { ...device, usingAudio: false, seekTo: () => undefined };
  return {
    status: audio.status,
    index: audio.index,
    speed: audio.speed,
    voiceState: audio.voiceState,
    sentences: audioSentences,
    play: audio.play,
    pause: audio.pause,
    resume: audio.resume,
    stop: audio.stop,
    playWhenReady: audio.playWhenReady,
    setSpeed: audio.setSpeed,
    seekTo: audio.seekTo,
    usingAudio: true,
  };
}
