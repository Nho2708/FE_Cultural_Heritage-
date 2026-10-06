import { describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../messages';
import { envelope, mockApi } from '../testing/api';
import { ApiError, ERROR_CODES, createApiClient, sessionEndNotice, withQuery, type UnauthorizedResponse } from './client';

const BASE = 'http://api.test/api/v1';

function clientWith(token: string | null) {
  const unauthorized: UnauthorizedResponse[] = [];
  const client = createApiClient({
    baseUrl: BASE,
    getAccessToken: () => token,
    onUnauthorized: (response) => unauthorized.push(response),
  });
  return { client, unauthorized };
}

describe('tầng gọi API dùng chung', () => {
  it('gắn Bearer, X-Correlation-Id và đọc khuôn phản hồi chung', async () => {
    const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      envelope(200, { data: { id: 1 }, message: 'ok' }),
    );
    vi.stubGlobal('fetch', fetch);
    const { client } = clientWith('access-1');

    const result = await client.request('/me');

    expect(result).toEqual({ data: { id: 1 }, message: 'ok' });
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/me`);
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer access-1');
    expect(headers['X-Correlation-Id']).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });

  it('thêm header do ứng dụng cung cấp vào mọi yêu cầu', async () => {
    const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => envelope(200, { data: {}, message: null }));
    vi.stubGlobal('fetch', fetch);
    const client = createApiClient({ baseUrl: BASE, getAccessToken: () => null, extraHeaders: () => ({ 'X-Device-Id': 'device-1', 'X-App-Channel': 'expo-go' }) });

    await client.request('/public/home', { auth: false });

    const headers = fetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['X-Device-Id']).toBe('device-1');
    expect(headers['X-App-Channel']).toBe('expo-go');
  });

  it('endpoint công khai không gắn Bearer dù đang đăng nhập', async () => {
    const calls = mockApi(() => envelope(200, { message: MESSAGES.forgotPasswordAccepted }));
    const { client } = clientWith('access-1');
    await client.request('/auth/forgot-password', { method: 'POST', body: { email: 'a@b.vn' }, auth: false });
    expect(calls[0]?.authorization).toBeUndefined();
  });

  it('bỏ tham số rỗng khỏi query', () => {
    expect(withQuery('/org/teachers', { keyword: '', status: undefined, page: 2, pageSize: 20 })).toBe(
      '/org/teachers?page=2&pageSize=20',
    );
    expect(withQuery('/org/teachers', { keyword: 'Bình An' })).toBe('/org/teachers?keyword=B%C3%ACnh+An');
  });

  it('lỗi nghiệp vụ trả ApiError mang mã theo nghĩa và lỗi theo trường, kể cả trường lồng nhau', async () => {
    const message = MESSAGES.taken('Email', 'qt@truong.vn');
    mockApi(() => envelope(409, { errorCode: ERROR_CODES.duplicate, message, errors: { 'orgAdmin.email': message } }));
    const { client } = clientWith('access-1');

    const error = await client.request('/admin/organizations', { method: 'POST', body: {} }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'DUPLICATE', message, fieldErrors: { 'orgAdmin.email': message } });
  });

  it('lỗi mạng hoặc phản hồi không đúng khuôn thành lỗi hệ thống', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const { client } = clientWith(null);
    await expect(client.request('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      code: 'SYSTEM_ERROR',
      status: 0,
      message: MESSAGES.systemError,
    });

    vi.stubGlobal('fetch', vi.fn<() => Promise<Response>>(async () => new Response('<html>502</html>', { status: 502 })));
    await expect(client.request('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      code: 'SYSTEM_ERROR',
      status: 502,
    });
  });

  it('không có làm mới phiên: máy chủ trả 401 thì báo cho ứng dụng kèm token đã gửi, không gọi lại', async () => {
    const calls = mockApi(() => envelope(401, { errorCode: ERROR_CODES.forbidden, message: MESSAGES.forbidden }));
    const { client, unauthorized } = clientWith('access-1');

    await expect(client.request('/org')).rejects.toMatchObject({ status: 401, code: 'FORBIDDEN' });
    expect(calls.map((c) => c.path)).toEqual(['/org']);
    expect(unauthorized).toEqual([{ token: 'access-1', errorCode: 'FORBIDDEN', message: MESSAGES.forbidden }]);
  });

  it('403 (sai vai trò) không kết thúc phiên', async () => {
    mockApi(() => envelope(403, { errorCode: ERROR_CODES.forbidden, message: MESSAGES.forbidden }));
    const { client, unauthorized } = clientWith('access-1');

    await expect(client.request('/org')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(unauthorized).toEqual([]);
  });

  it('endpoint cần đăng nhập mà chưa có token thì không gọi mạng', async () => {
    const calls = mockApi(() => envelope(200));
    const { client } = clientWith(null);
    await expect(client.request('/me')).rejects.toMatchObject({ status: 401, code: 'FORBIDDEN' });
    expect(calls).toHaveLength(0);
  });

  it('câu hiện ở màn hình đăng nhập khi phiên bị kết thúc: giữ lý do tài khoản bị chặn, còn lại là phiên đã hết', () => {
    const locked = MESSAGES.cannotSignIn('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    expect(sessionEndNotice({ errorCode: ERROR_CODES.accountBlocked, message: locked })).toBe(locked);
    expect(sessionEndNotice({ errorCode: ERROR_CODES.forbidden, message: MESSAGES.forbidden })).toBe(MESSAGES.sessionExpired);
    expect(sessionEndNotice({ errorCode: null, message: null })).toBe('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  });
});

describe('tải tệp có tiến độ', () => {
  const form = () => {
    const body = new FormData();
    body.set('file', new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    return body;
  };

  it('có onUploadProgress thì gửi bằng XMLHttpRequest, gắn Bearer, báo tiến độ rồi đọc khuôn phản hồi chung', async () => {
    const sent: { method: string; url: string; headers: Record<string, string>; body: unknown }[] = [];
    class FakeXhr {
      upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
      onload: (() => void) | null = null;
      status = 201;
      responseText = JSON.stringify({ success: true, data: { id: 7 }, message: 'Tải ảnh lên thành công.' });
      private record = { method: '', url: '', headers: {} as Record<string, string>, body: undefined as unknown };
      open(method: string, url: string) {
        Object.assign(this.record, { method, url });
      }
      setRequestHeader(name: string, value: string) {
        this.record.headers[name] = value;
      }
      getResponseHeader() {
        return 'application/json';
      }
      send(body: unknown) {
        this.record.body = body;
        sent.push(this.record);
        this.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
        this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
        this.onload?.();
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const fetch = vi.fn<() => Promise<Response>>();
    vi.stubGlobal('fetch', fetch);
    const progress: number[] = [];
    const { client } = clientWith('access-1');
    const body = form();

    const result = await client.request('/admin/heritages/3/media/upload', {
      method: 'POST',
      body,
      onUploadProgress: (fraction) => progress.push(fraction),
    });

    expect(result).toEqual({ data: { id: 7 }, message: 'Tải ảnh lên thành công.' });
    expect(fetch).not.toHaveBeenCalled();
    expect(progress).toEqual([0.25, 1, 1]);
    expect(sent[0]).toMatchObject({ method: 'POST', url: `${BASE}/admin/heritages/3/media/upload`, body });
    expect(sent[0]!.headers.Authorization).toBe('Bearer access-1');
    // Trình duyệt tự đặt Content-Type có ranh giới của multipart.
    expect(sent[0]!.headers['Content-Type']).toBeUndefined();
  });

  it('lỗi của backend khi tải lên vẫn thành ApiError có lỗi theo trường', async () => {
    const message = 'Tệp ảnh không hợp lệ: chỉ nhận định dạng JPG, PNG hoặc WEBP.';
    mockApi(() => envelope(400, { errorCode: ERROR_CODES.invalid, message, errors: { file: message } }));
    const { client } = clientWith('access-1');

    const error = await client
      .request('/admin/heritages/3/media/upload', { method: 'POST', body: form(), onUploadProgress: () => {} })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'INVALID', fieldErrors: { file: message } });
  });

  it('máy chủ cắt yêu cầu quá cỡ (413, không có khuôn phản hồi) vẫn báo câu về dung lượng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 413 })));
    const { client } = clientWith('access-1');

    await expect(client.request('/admin/files/models', { method: 'POST', body: form() })).rejects.toMatchObject({
      status: 413,
      message: 'Tệp tải lên không hợp lệ: vượt quá dung lượng cho phép.',
    });
  });
});
