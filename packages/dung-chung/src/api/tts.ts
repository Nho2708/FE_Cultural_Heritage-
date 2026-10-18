import type { ApiClient } from './client';

export const TTS_ENDPOINTS = {
  synthesize: '/tts',
} as const;

export interface TtsResponse {
  audioUrl: string | null;
}

export function createTtsApi(client: ApiClient) {
  return {
    /**
     * Chuyển văn bản thành giọng nói FPT.AI qua backend.
     * Trả về audioUrl nếu thành công, hoặc null nếu dịch vụ không khả dụng để client lùi về giọng trình duyệt.
     */
    synthesize: async (text: string, { signal }: { signal?: AbortSignal } = {}): Promise<string | null> => {
      try {
        const res = await client.request<TtsResponse>(TTS_ENDPOINTS.synthesize, {
          method: 'POST',
          auth: false,
          body: { text },
          signal,
        });
        return res.data?.audioUrl ?? null;
      } catch {
        return null;
      }
    },
  };
}

export type TtsApi = ReturnType<typeof createTtsApi>;
