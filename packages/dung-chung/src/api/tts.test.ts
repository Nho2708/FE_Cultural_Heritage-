import { describe, expect, it } from 'vitest';
import { createApiClient } from './client';
import { createTtsApi, TTS_ENDPOINTS } from './tts';

const BASE = 'http://api.test/api/v1';

describe('tts api', () => {
  it('gửi token đăng nhập và trả về audioUrl khi backend thành công', async () => {
    const client = createApiClient({
      baseUrl: BASE,
      getAccessToken: () => 'token-hoc-sinh',
    });
    let capturedText: string | null = null;
    let capturedAuth: string | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url === `${BASE}${TTS_ENDPOINTS.synthesize}`) {
        const body = JSON.parse(String(init?.body)) as { text?: string };
        capturedText = body.text ?? null;
        capturedAuth = new Headers(init?.headers).get('Authorization');
        return new Response(JSON.stringify({ success: true, data: { audioUrl: 'https://file.fpt.ai/audio.mp3' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    };

    try {
      const api = createTtsApi(client);
      const url = await api.synthesize('Xin chào');
      expect(capturedText).toBe('Xin chào');
      expect(capturedAuth).toBe('Bearer token-hoc-sinh');
      expect(url).toBe('https://file.fpt.ai/audio.mp3');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('chưa đăng nhập thì trả về null và không gọi mạng', async () => {
    const client = createApiClient({
      baseUrl: BASE,
      getAccessToken: () => null,
    });
    let called = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      called = true;
      return new Response(null, { status: 200 });
    };

    try {
      const api = createTtsApi(client);
      expect(await api.synthesize('Xin chào')).toBeNull();
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('trả về null khi backend trả lỗi hoặc không khả dụng', async () => {
    const client = createApiClient({
      baseUrl: BASE,
      getAccessToken: () => 'token-hoc-sinh',
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Rate limit' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });

    try {
      const api = createTtsApi(client);
      const url = await api.synthesize('Xin chào');
      expect(url).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('prefetch gửi danh sách chữ và trả số chữ đã vào hàng đợi', async () => {
    const client = createApiClient({ baseUrl: BASE, getAccessToken: () => 'token-hoc-sinh' });
    let captured: string[] = [];
    let capturedAuth: string | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (String(input) === `${BASE}${TTS_ENDPOINTS.prefetch}`) {
        captured = (JSON.parse(String(init?.body)) as { texts: string[] }).texts;
        capturedAuth = new Headers(init?.headers).get('Authorization');
        return new Response(JSON.stringify({ success: true, data: { queued: 2 } }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 404 });
    };
    try {
      expect(await createTtsApi(client).prefetch(['Một.', 'Hai.'])).toBe(2);
      expect(captured).toEqual(['Một.', 'Hai.']);
      expect(capturedAuth).toBe('Bearer token-hoc-sinh');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('prefetch trả null khi chưa đăng nhập (không gọi mạng) hoặc máy chủ lỗi', async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response(JSON.stringify({ success: false, message: 'Lỗi' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    };
    try {
      expect(await createTtsApi(createApiClient({ baseUrl: BASE, getAccessToken: () => null })).prefetch(['Một.'])).toBeNull();
      expect(called).toBe(false);
      expect(await createTtsApi(createApiClient({ baseUrl: BASE, getAccessToken: () => 'token' })).prefetch(['Một.'])).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
