import type { ApiClient } from './client';

export const TTS_ENDPOINTS = {
  synthesize: '/tts',
  prefetch: '/tts/prefetch',
} as const;

export interface TtsResponse {
  audioUrl: string | null;
}

export interface TtsPrefetchResponse {
  /** Số chữ máy chủ đã đưa vào hàng đợi tạo trước (chữ đã có tiếng thì không tính). */
  queued: number;
}

export function createTtsApi(client: ApiClient) {
  return {
    /**
     * Chuyển văn bản thành giọng nói tiếng Việt do máy chủ tạo (cần phiên đăng nhập; client dùng chung tự gửi token). Chữ mới có thể mất vài giây
     * để tạo, lần sau có ngay. Trả về audioUrl nếu thành công, hoặc null nếu giọng của máy chủ chưa dùng được để client lùi về giọng của thiết bị.
     */
    synthesize: async (text: string, { signal }: { signal?: AbortSignal } = {}): Promise<string | null> => {
      try {
        const res = await client.request<TtsResponse>(TTS_ENDPOINTS.synthesize, {
          method: 'POST',
          body: { text },
          signal,
        });
        return res.data?.audioUrl ?? null;
      } catch {
        return null;
      }
    },
    /**
     * Nhờ máy chủ tạo trước tiếng cho các chữ (tối đa 40 chữ, mỗi chữ ≤ 1000 ký tự; bớt chữ thừa trước khi gọi). Chạy nền, không chờ tiếng. Trả về số chữ đã vào
     * hàng đợi, hoặc null khi không gọi được (chưa đăng nhập, lỗi mạng) để nơi gọi gửi lại lần sau.
     */
    prefetch: async (texts: readonly string[]): Promise<number | null> => {
      try {
        const res = await client.request<TtsPrefetchResponse>(TTS_ENDPOINTS.prefetch, {
          method: 'POST',
          body: { texts },
        });
        return res.data?.queued ?? 0;
      } catch {
        return null;
      }
    },
  };
}

export type TtsApi = ReturnType<typeof createTtsApi>;
