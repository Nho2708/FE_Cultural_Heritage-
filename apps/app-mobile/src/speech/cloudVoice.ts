import type { TtsApi } from '@dsvhvn/dung-chung/api';
import { resolveFileUrl } from '@dsvhvn/dung-chung';
import { createSpeechPrefetcher, isSpeakableText, normalizeSpeechText } from '@dsvhvn/dung-chung/speech';

// Giọng đọc tiếng Việt do máy chủ tạo (cấp 1): xin địa chỉ tệp MP3 của một đoạn chữ, nhớ kết quả, và nhờ máy chủ tạo trước tiếng. Chữ mới có thể mất vài
// giây để tạo, lần sau có ngay. Phần này không phát gì, chỉ lo địa chỉ tệp; phát tiếng làm ở `CloudNarrator`. Dựng một lần lúc khởi động app
// (`configureCloudVoice`); chưa dựng (khi test) thì mọi lời xin đều trả null và giao diện lùi về giọng của điện thoại.

export interface VoiceSource {
  /** Địa chỉ tệp tiếng của đoạn chữ; null khi chưa đăng nhập, chữ rỗng hoặc quá dài, máy chủ chưa có giọng, quá chậm hay lỗi mạng. */
  audioUrl(text: string): Promise<string | null>;
  /** Tiếng của đoạn chữ đã có sẵn (phát được ngay, không phải chờ máy chủ). */
  isReady(text: string): boolean;
  /** Nhờ máy chủ tạo trước tiếng (chạy ngầm, lỗi bỏ qua, chữ đã gửi không gửi lại). */
  prefetch(texts: readonly (string | null | undefined)[]): void;
}

/** Chờ tối đa bấy nhiêu mili giây một yêu cầu tiếng (máy chủ tự chờ khoảng 30 giây rồi trả null). */
const REQUEST_TIMEOUT_MS = 45_000;

export function createVoiceSource(api: Pick<TtsApi, 'synthesize' | 'prefetch'>, baseUrl: string): VoiceSource {
  const cache = new Map<string, string>();
  const inflight = new Map<string, Promise<string | null>>();
  const sendPrefetch = createSpeechPrefetcher((texts) => api.prefetch(texts), (text) => cache.has(text));

  async function request(text: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = await api.synthesize(text, { signal: controller.signal });
      if (!url) return null;
      const resolved = resolveFileUrl(url, baseUrl) ?? url;
      cache.set(text, resolved);
      return resolved;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    audioUrl(text) {
      const key = normalizeSpeechText(text);
      if (!isSpeakableText(key)) return Promise.resolve(null);
      const cached = cache.get(key);
      if (cached) return Promise.resolve(cached);
      let pending = inflight.get(key);
      if (!pending) {
        pending = request(key)
          .catch(() => null)
          .finally(() => inflight.delete(key));
        inflight.set(key, pending);
      }
      return pending;
    },
    isReady: (text) => cache.has(normalizeSpeechText(text)),
    prefetch: sendPrefetch,
  };
}

let current: VoiceSource | null = null;

/** Dựng nguồn giọng của máy chủ cho cả app (gọi lúc khởi động, sau khi có lớp gọi API). */
export function configureCloudVoice(source: VoiceSource | null): void {
  current = source;
}

export function getCloudVoice(): VoiceSource | null {
  return current;
}
