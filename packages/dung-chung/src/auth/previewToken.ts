// Chuyển token quản trị hệ thống sang tab xem trước. Trang xem trước nằm ở web học tập (khác nguồn gốc với web quản trị nên
// không dùng chung phiên đăng nhập): tab mở từ web quản trị hỏi lại chính cửa sổ đã mở nó bằng postMessage. Web quản trị chỉ
// trả lời cửa sổ do nó vừa mở và chỉ khi tin nhắn đến từ đúng nguồn gốc web học tập; token chỉ gửi đến đúng nguồn gốc đó, không
// đi qua đường dẫn, không lưu lại ở web học tập (chỉ nằm trong bộ nhớ của tab xem trước).

export const PREVIEW_TOKEN_REQUEST = 'dsvhvn.xem-truoc.xin-token';
export const PREVIEW_TOKEN_REPLY = 'dsvhvn.xem-truoc.token';

const registered = new WeakSet<object>();

/** Web quản trị: ghi nhận cửa sổ vừa mở cho trang xem trước, chỉ cửa sổ này được nhận token. */
export function registerPreviewWindow(target: Window): void {
  registered.add(target);
}

/** Nguồn gốc (scheme + host + port) của một địa chỉ; null khi địa chỉ không hợp lệ. */
export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Web quản trị: trả token cho cửa sổ xem trước đã đăng ký khi nó xin. Trả về hàm gỡ bộ lắng nghe.
 * `getToken` trả null khi chưa đăng nhập hoặc không phải quản trị hệ thống: khi đó không trả lời.
 */
export function servePreviewToken(options: { learningOrigin: string; getToken: () => string | null }): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== options.learningOrigin) return;
    const data: unknown = event.data;
    if (typeof data !== 'object' || data === null || (data as { type?: unknown }).type !== PREVIEW_TOKEN_REQUEST) return;
    const source = event.source as Window | null;
    if (!source || !registered.has(source)) return;
    const token = options.getToken();
    if (token === null) return;
    source.postMessage({ type: PREVIEW_TOKEN_REPLY, token }, event.origin);
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}

/**
 * Web học tập (tab xem trước): xin token ở cửa sổ đã mở tab này. null khi không có cửa sổ mở (mở thẳng đường dẫn, quản trị đã
 * đóng tab) hoặc không ai trả lời trong `timeoutMs`.
 */
export function requestPreviewToken(options: { adminOrigin: string; timeoutMs?: number }): Promise<string | null> {
  const opener = typeof window === 'undefined' ? null : window.opener;
  if (!opener) return Promise.resolve(null);
  return new Promise((resolve) => {
    const done = (token: string | null) => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(token);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== options.adminOrigin || event.source !== opener) return;
      const data: unknown = event.data;
      if (typeof data !== 'object' || data === null || (data as { type?: unknown }).type !== PREVIEW_TOKEN_REPLY) return;
      const token = (data as { token?: unknown }).token;
      done(typeof token === 'string' && token !== '' ? token : null);
    };
    const timer = window.setTimeout(() => done(null), options.timeoutMs ?? 4000);
    window.addEventListener('message', onMessage);
    opener.postMessage({ type: PREVIEW_TOKEN_REQUEST }, options.adminOrigin);
  });
}
