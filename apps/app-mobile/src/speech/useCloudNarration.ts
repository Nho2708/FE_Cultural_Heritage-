import { normalizeSpeechText, splitSentences } from '@dsvhvn/dung-chung/speech';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { AudioPlayerFactory } from './audioNarrator';
import { CloudNarrator, type CloudNarrationState } from './cloudNarrator';
import { getCloudVoice, type VoiceSource } from './cloudVoice';
import { expoAudioPlayer } from './expoAudioPlayer';
import type { SpeechEngine } from './narrator';
import { expoSpeechEngine } from './useNarration';
import { announceNoVietnameseVoice } from './voiceNotice';

// Nối `CloudNarrator` với React: giọng tiếng Việt của máy chủ (kèm lùi về giọng điện thoại khi điện thoại có giọng tiếng Việt) cho nút loa của khu học cấp 1.

export interface CloudNarration extends CloudNarrationState {
  sentences: string[];
  play: () => void;
  stop: () => void;
  /** Tự đọc khi vào màn. */
  playWhenReady: () => Promise<void>;
}

export interface CloudNarrationOptions {
  /** Nguồn giọng của máy chủ; mặc định là nguồn đã dựng lúc khởi động app. */
  source?: VoiceSource | null;
  engine?: SpeechEngine;
  createPlayer?: AudioPlayerFactory;
}

/** Các câu cần đọc cho một đoạn chữ: cả đoạn là một câu (`whole`: nút loa, gửi nguyên đoạn cho máy chủ), hoặc tách từng câu (`sentences`: để tô sáng câu đang đọc). */
export function narrationSentences(text: string, mode: 'whole' | 'sentences'): string[] {
  if (mode === 'sentences') return splitSentences(text, 'vi-VN');
  const whole = normalizeSpeechText(text);
  return whole ? [whole] : [];
}

/** Nghe một đoạn chữ bằng giọng của máy chủ. Rời màn hình thì dừng hẳn. */
export function useCloudNarration(text: string, mode: 'whole' | 'sentences' = 'whole', options: CloudNarrationOptions = {}): CloudNarration {
  const sentences = useMemo(() => narrationSentences(text, mode), [text, mode]);
  const { engine = expoSpeechEngine, createPlayer = expoAudioPlayer } = options;
  const source = options.source === undefined ? getCloudVoice() : options.source;
  const narrator = useMemo(
    () => new CloudNarrator({ source, engine, createPlayer, onNoVoice: announceNoVietnameseVoice }, sentences),
    [source, engine, createPlayer, sentences],
  );

  useEffect(() => {
    narrator.init();
    return () => narrator.dispose();
  }, [narrator]);

  const state = useSyncExternalStore(narrator.subscribe, narrator.getState, narrator.getState);
  const actions = useMemo(
    () => ({ play: () => narrator.play(), stop: () => narrator.stop(), playWhenReady: () => narrator.playWhenReady() }),
    [narrator],
  );
  return { ...state, sentences, ...actions };
}

/**
 * Nhờ máy chủ tạo trước tiếng cho các chữ khi `enabled` (chạy ngầm, lỗi bỏ qua, chữ đã gửi không gửi lại). Chạy lại khi bộ chữ đổi.
 */
export function usePrefetchSpeech(texts: readonly (string | null | undefined)[], enabled = true): void {
  const key = useMemo(() => JSON.stringify(texts), [texts]);
  useEffect(() => {
    if (enabled) getCloudVoice()?.prefetch(JSON.parse(key) as Array<string | null>);
  }, [enabled, key]);
}
