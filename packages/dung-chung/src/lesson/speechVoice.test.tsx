import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Giọng đọc tiếng Việt: giọng máy chủ trước; máy chủ không trả tiếng thì chỉ dùng giọng trình duyệt khi trình duyệt có giọng tiếng Việt, không thì báo một lần
// "Máy này chưa đọc được tiếng Việt" và không đọc; đọc từng câu thì xin trước tiếng câu kế tiếp; nhờ máy chủ tạo trước tiếng chỉ khi đã đăng nhập.

const BASE = 'http://api.test/api/v1';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  preload = '';
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn<() => Promise<void>>(async () => undefined);
  pause = vi.fn<() => void>();
  load = vi.fn<() => void>();
  constructor(src = '') {
    this.src = src;
    FakeAudio.instances.push(this);
  }
}

interface FakeUtterance {
  text: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

const VI_VOICE = { lang: 'vi-VN', name: 'Vietnamese' };
const EN_VOICE = { lang: 'en-US', name: 'English' };

interface Server {
  synth: string[];
  prefetch: string[][];
  /** Chữ nào trả null (máy chủ chưa có tiếng). */
  missing: Set<string>;
  /** Chặn trả lời yêu cầu tiếng cho tới khi gọi `release`. */
  hold: boolean;
  release: () => void;
}

let server: Server;
let utterances: FakeUtterance[];
let voice: typeof import('./speechVoice');
let tokenOn = true;

function stubSpeech(voices: Array<{ lang: string; name: string }>) {
  vi.stubGlobal('speechSynthesis', { getVoices: () => voices, cancel: () => undefined, speak: (u: FakeUtterance) => void utterances.push(u) });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
}

function stubServer() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server = { synth: [], prefetch: [], missing: new Set(), hold: false, release };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? '{}')) as { text?: string; texts?: string[] };
      if (url === `${BASE}/tts/prefetch`) {
        server.prefetch.push(body.texts ?? []);
        return new Response(JSON.stringify({ success: true, data: { queued: body.texts?.length ?? 0 } }), { status: 202, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === `${BASE}/tts`) {
        const text = body.text ?? '';
        server.synth.push(text);
        if (server.hold) await gate;
        const audioUrl = server.missing.has(text) ? null : `/files/speech/${server.synth.length}.mp3`;
        return new Response(JSON.stringify({ success: true, data: { audioUrl } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 404 });
    }),
  );
}

async function load(voices: Array<{ lang: string; name: string }> = [VI_VOICE]) {
  vi.resetModules();
  stubSpeech(voices);
  voice = await import('./speechVoice');
  voice.setTtsBaseUrl(BASE);
  voice.setTtsAccessTokenProvider(() => (tokenOn ? 'token-hoc-sinh' : null));
  voice.resetSpeechNotice();
}

beforeEach(() => {
  utterances = [];
  FakeAudio.instances = [];
  tokenOn = true;
  vi.stubGlobal('Audio', FakeAudio);
  stubServer();
});

afterEach(() => {
  cleanup();
  voice?.stopAllSpeech();
  vi.unstubAllGlobals();
});

describe('đọc to một đoạn chữ', () => {
  it('dùng tiếng của máy chủ khi có: báo đang chuẩn bị rồi bắt đầu, không dùng giọng trình duyệt', async () => {
    await load();
    const events: string[] = [];
    await voice.speakVietnamese('  Xin chào   em  ', { onPreparing: () => events.push('preparing'), onStart: () => events.push('start'), onEnd: () => events.push('end') });

    expect(server.synth).toEqual(['Xin chào em']);
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0]!.src).toBe('http://api.test/files/speech/1.mp3');
    expect(FakeAudio.instances[0]!.play).toHaveBeenCalled();
    expect(utterances).toHaveLength(0);
    expect(events).toEqual(['preparing', 'start']);

    FakeAudio.instances[0]!.onended?.();
    expect(events).toEqual(['preparing', 'start', 'end']);
  });

  it('nút loa biết đoạn của mình đang chuẩn bị rồi đang đọc', async () => {
    await load();
    server.hold = true;
    const pending = voice.speakVietnamese('Chùa Một Cột.');
    await waitFor(() => expect(voice.getSpeechActivity()).toEqual({ status: 'preparing', text: 'Chùa Một Cột.' }));
    server.release();
    await pending;
    expect(voice.getSpeechActivity()).toEqual({ status: 'speaking', text: 'Chùa Một Cột.' });
    FakeAudio.instances[0]!.onended?.();
    expect(voice.getSpeechActivity().status).toBe('idle');
  });

  it('máy chủ không có tiếng thì lùi về giọng trình duyệt khi trình duyệt có giọng tiếng Việt', async () => {
    await load([EN_VOICE, VI_VOICE]);
    server.missing.add('Xin chào em');
    await voice.speakVietnamese('Xin chào em');

    expect(server.synth).toEqual(['Xin chào em']);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(utterances.map((u) => u.text)).toEqual(['Xin chào em']);
    expect(voice.getSpeechNoticeVisible()).toBe(false);
  });

  it('chưa đăng nhập thì không gọi máy chủ, dùng giọng trình duyệt tiếng Việt', async () => {
    await load();
    tokenOn = false;
    await voice.speakVietnamese('Xin chào em');

    expect(server.synth).toHaveLength(0);
    expect(utterances.map((u) => u.text)).toEqual(['Xin chào em']);
  });

  it('máy chủ không có tiếng và máy không có giọng tiếng Việt thì không đọc, báo một lần', async () => {
    await load([EN_VOICE]);
    server.missing.add('Xin chào em');
    server.missing.add('Em giỏi quá');
    const events: string[] = [];
    await voice.speakVietnamese('Xin chào em', { onUnavailable: () => events.push('unavailable'), onError: () => events.push('error'), onStart: () => events.push('start') });

    expect(utterances).toHaveLength(0);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(events).toEqual(['unavailable', 'error']);
    expect(voice.getSpeechNoticeVisible()).toBe(true);
    expect(voice.NO_VIETNAMESE_VOICE_NOTICE).toBe('Máy này chưa đọc được tiếng Việt');
    expect(voice.getSpeechActivity().status).toBe('idle');

    // Em tắt lời báo rồi bấm nghe lại: không báo lần nữa.
    voice.dismissSpeechNotice();
    await voice.speakVietnamese('Em giỏi quá');
    expect(voice.getSpeechNoticeVisible()).toBe(false);
    expect(utterances).toHaveLength(0);
  });

  it('chưa đăng nhập và máy không có giọng tiếng Việt thì cũng không đọc', async () => {
    await load([EN_VOICE]);
    tokenOn = false;
    await voice.speakVietnamese('Xin chào em');
    expect(server.synth).toHaveLength(0);
    expect(utterances).toHaveLength(0);
    expect(voice.getSpeechNoticeVisible()).toBe(true);
  });

  it('bắt đầu đọc đoạn mới hoặc dừng thì đoạn đang chờ máy chủ không phát chồng lên', async () => {
    await load();
    server.hold = true;
    const first = voice.speakVietnamese('Đoạn một.');
    const second = voice.speakVietnamese('Đoạn hai.');
    server.release();
    await Promise.all([first, second]);
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0]!.src).toContain('/files/speech/');
    expect(voice.getSpeechActivity().text).toBe('Đoạn hai.');

    server.hold = false;
    voice.stopAllSpeech();
    expect(voice.getSpeechActivity().status).toBe('idle');
  });

  it('tiếng đã nghe một lần thì lần sau phát ngay, không hỏi lại máy chủ', async () => {
    await load();
    await voice.speakVietnamese('Chùa Một Cột.');
    FakeAudio.instances[0]!.onended?.();
    const events: string[] = [];
    await voice.speakVietnamese('Chùa Một Cột.', { onPreparing: () => events.push('preparing') });
    expect(server.synth).toEqual(['Chùa Một Cột.']);
    expect(events).toEqual([]);
    expect(FakeAudio.instances).toHaveLength(2);
  });
});

describe('đọc từng câu', () => {
  it('trong lúc đọc câu hiện tại thì xin trước tiếng của câu kế tiếp', async () => {
    await load();
    const { useSentenceReader } = await import('./useSpeech');
    const reader = renderHook(() => useSentenceReader(['Câu một.', 'Câu hai.', 'Câu ba.']));

    act(() => reader.result.current.play());
    await waitFor(() => expect(reader.result.current.current).toBe(0));
    // Câu một bắt đầu có tiếng thì câu hai được xin trước, khi câu một chưa đọc xong.
    await waitFor(() => expect(server.synth).toEqual(['Câu một.', 'Câu hai.']));
    expect(reader.result.current.current).toBe(0);

    // Câu một đọc xong: câu hai phát bằng tệp đã tải trước, và câu ba được xin trước.
    const countBefore = FakeAudio.instances.length;
    await act(async () => FakeAudio.instances[0]!.onended?.());
    await waitFor(() => expect(reader.result.current.current).toBe(1));
    await waitFor(() => expect(server.synth).toEqual(['Câu một.', 'Câu hai.', 'Câu ba.']));
    const playing = FakeAudio.instances.filter((a) => a.play.mock.calls.length > 0);
    expect(playing).toHaveLength(2);
    expect(playing[1]!.src).toBe('http://api.test/files/speech/2.mp3');
    expect(FakeAudio.instances.length).toBeGreaterThanOrEqual(countBefore);

    // Câu cuối không còn câu sau để xin.
    await act(async () => playing[1]!.onended?.());
    await waitFor(() => expect(reader.result.current.current).toBe(2));
    expect(server.synth).toEqual(['Câu một.', 'Câu hai.', 'Câu ba.']);
    reader.unmount();
  });

  it('báo đang chuẩn bị khi câu đang chờ máy chủ', async () => {
    await load();
    const { useSentenceReader } = await import('./useSpeech');
    server.hold = true;
    const reader = renderHook(() => useSentenceReader(['Câu một.']));
    act(() => reader.result.current.play());
    await waitFor(() => expect(reader.result.current.preparing).toBe(true));
    server.release();
    await waitFor(() => expect(reader.result.current.preparing).toBe(false));
    expect(reader.result.current.current).toBe(0);
    reader.unmount();
  });
});

describe('nhờ máy chủ tạo trước tiếng', () => {
  it('gửi các chữ đã chuẩn hóa một lần, không gửi lại chữ đã gửi', async () => {
    await load();
    voice.prefetchSpeech(['Chùa  Một Cột.', '', 'Câu hai.', 'Câu hai.', null]);
    await waitFor(() => expect(server.prefetch).toHaveLength(1));
    expect(server.prefetch[0]).toEqual(['Chùa Một Cột.', 'Câu hai.']);

    voice.prefetchSpeech(['Câu hai.', 'Câu ba.']);
    await waitFor(() => expect(server.prefetch).toHaveLength(2));
    expect(server.prefetch[1]).toEqual(['Câu ba.']);
  });

  it('chia lô tối đa 40 chữ', async () => {
    await load();
    voice.prefetchSpeech(Array.from({ length: 95 }, (_, i) => `Câu số ${i + 1}.`));
    await waitFor(() => expect(server.prefetch).toHaveLength(3));
    expect(server.prefetch.map((batch) => batch.length)).toEqual([40, 40, 15]);
  });

  it('chưa đăng nhập thì không gọi', async () => {
    await load();
    tokenOn = false;
    voice.prefetchSpeech(['Chùa Một Cột.']);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(server.prefetch).toHaveLength(0);
  });
});
