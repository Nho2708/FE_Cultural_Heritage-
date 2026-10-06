import { afterEach, describe, expect, it, vi } from 'vitest';
import { originOf, PREVIEW_TOKEN_REPLY, PREVIEW_TOKEN_REQUEST, registerPreviewWindow, requestPreviewToken, servePreviewToken } from './previewToken';

const LEARNING = 'http://localhost:5174';
const ADMIN = 'http://localhost:5173';

function fakeWindow() {
  return { postMessage: vi.fn<(message: unknown, origin: string) => void>() } as unknown as Window & { postMessage: ReturnType<typeof vi.fn> };
}

function send(data: unknown, origin: string, source: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as MessageEventSource }));
}

describe('trả token xem trước (phía web quản trị)', () => {
  let stop: (() => void) | null = null;
  afterEach(() => stop?.());

  it('trả token cho cửa sổ đã đăng ký, đúng nguồn gốc, và chỉ gửi đến nguồn gốc đó', () => {
    stop = servePreviewToken({ learningOrigin: LEARNING, getToken: () => 'tok' });
    const tab = fakeWindow();
    registerPreviewWindow(tab);
    send({ type: PREVIEW_TOKEN_REQUEST }, LEARNING, tab);
    expect(tab.postMessage).toHaveBeenCalledWith({ type: PREVIEW_TOKEN_REPLY, token: 'tok' }, LEARNING);
  });

  it('không trả lời cửa sổ chưa đăng ký, sai nguồn gốc, sai loại tin hoặc khi chưa có token', () => {
    let token: string | null = 'tok';
    stop = servePreviewToken({ learningOrigin: LEARNING, getToken: () => token });
    const tab = fakeWindow();
    registerPreviewWindow(tab);
    const stranger = fakeWindow();
    send({ type: PREVIEW_TOKEN_REQUEST }, LEARNING, stranger);
    send({ type: PREVIEW_TOKEN_REQUEST }, 'https://evil.example', tab);
    send({ type: 'khac' }, LEARNING, tab);
    send('chuoi', LEARNING, tab);
    token = null;
    send({ type: PREVIEW_TOKEN_REQUEST }, LEARNING, tab);
    expect(tab.postMessage).not.toHaveBeenCalled();
    expect(stranger.postMessage).not.toHaveBeenCalled();
  });
});

describe('xin token xem trước (phía web học tập)', () => {
  afterEach(() => {
    Object.defineProperty(window, 'opener', { value: null, configurable: true });
    vi.useRealTimers();
  });

  it('không có cửa sổ đã mở tab này thì trả null ngay', async () => {
    Object.defineProperty(window, 'opener', { value: null, configurable: true });
    await expect(requestPreviewToken({ adminOrigin: ADMIN })).resolves.toBeNull();
  });

  it('nhận token từ đúng cửa sổ mở và đúng nguồn gốc; bỏ qua tin từ nơi khác', async () => {
    const opener = fakeWindow();
    Object.defineProperty(window, 'opener', { value: opener, configurable: true });
    const pending = requestPreviewToken({ adminOrigin: ADMIN });
    expect(opener.postMessage).toHaveBeenCalledWith({ type: PREVIEW_TOKEN_REQUEST }, ADMIN);
    send({ type: PREVIEW_TOKEN_REPLY, token: 'gia' }, 'https://evil.example', opener);
    send({ type: PREVIEW_TOKEN_REPLY, token: 'gia' }, ADMIN, fakeWindow());
    send({ type: PREVIEW_TOKEN_REPLY, token: 'that' }, ADMIN, opener);
    await expect(pending).resolves.toBe('that');
  });

  it('hết thời gian chờ mà không ai trả lời thì trả null', async () => {
    vi.useFakeTimers();
    const opener = fakeWindow();
    Object.defineProperty(window, 'opener', { value: opener, configurable: true });
    const pending = requestPreviewToken({ adminOrigin: ADMIN, timeoutMs: 1000 });
    vi.advanceTimersByTime(1000);
    await expect(pending).resolves.toBeNull();
  });
});

describe('originOf', () => {
  it('lấy nguồn gốc và bỏ qua địa chỉ hỏng', () => {
    expect(originOf('http://localhost:5174/abc')).toBe('http://localhost:5174');
    expect(originOf('khong-phai-dia-chi')).toBeNull();
  });
});
