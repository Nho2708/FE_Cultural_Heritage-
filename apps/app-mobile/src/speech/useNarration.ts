import { splitSentences } from '@dsvhvn/dung-chung/speech';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Narrator, type NarrationState, type SpeechEngine } from './narrator';

// Nối `Narrator` với expo-speech (có sẵn trong Expo Go) và với React.

export const expoSpeechEngine: SpeechEngine = {
  speak(text, { language, voice, rate, onDone, onError }) {
    Speech.speak(text, { language, voice, rate, onDone, onError: () => onError() });
  },
  stop() {
    void Speech.stop();
  },
  async voices() {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.map((voice) => ({ lang: voice.language, id: voice.identifier }));
  },
};

export interface Narration extends NarrationState {
  sentences: string[];
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** Tự đọc khi vào màn, sau khi biết thiết bị có giọng phù hợp. */
  playWhenReady: () => Promise<void>;
  setSpeed: (speed: NarrationState['speed']) => void;
}

/** Nghe một đoạn chữ: tách câu theo ngôn ngữ, đọc từng câu, báo câu đang đọc. Rời màn hình thì dừng hẳn. */
export function useNarration(text: string, speechTag: string, engine: SpeechEngine = expoSpeechEngine): Narration {
  const sentences = useMemo(() => splitSentences(text, speechTag), [text, speechTag]);
  const narrator = useMemo(() => new Narrator(engine, sentences, speechTag), [engine, sentences, speechTag]);

  useEffect(() => {
    void narrator.init();
    return () => narrator.dispose();
  }, [narrator]);

  const state = useSyncExternalStore(narrator.subscribe, narrator.getState, narrator.getState);

  const actions = useMemo(
    () => ({
      play: () => narrator.play(),
      pause: () => narrator.pause(),
      resume: () => narrator.resume(),
      stop: () => narrator.stop(),
      playWhenReady: () => narrator.playWhenReady(),
      setSpeed: (speed: NarrationState['speed']) => narrator.setSpeed(speed),
    }),
    [narrator],
  );

  return { ...state, sentences, ...actions };
}
