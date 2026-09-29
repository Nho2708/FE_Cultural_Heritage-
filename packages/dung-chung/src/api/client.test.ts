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
