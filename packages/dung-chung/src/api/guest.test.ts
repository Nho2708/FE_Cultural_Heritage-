import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createApiClient } from './client';
import { createGuestApi, GUEST_ENDPOINTS } from './guest';

const KEY = '3f1c2a4e-5b6d-4c8e-9a1b-2c3d4e5f6a7b';
const api = createGuestApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'access-dang-nhap' }));

describe('khách tham quan', () => {
  it('không bao giờ gắn token đăng nhập và gửi mã thiết bị ở tiêu đề của từng yêu cầu', async () => {
    const calls = mockApi(() => envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }));
    await api.history(KEY);
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/public/guest/history', authorization: undefined, deviceKey: KEY });
  });

  it('lịch sử phân trang theo ngôn ngữ', async () => {
    const calls = mockApi(() => envelope(200, { data: { items: [], page: 2, pageSize: 10, totalItems: 0, totalPages: 0 } }));
    await api.history(KEY, { page: 2, pageSize: 10 }, { lang: 'ko' });
    expect(calls[0]!.path).toBe('/public/guest/history?page=2&pageSize=10&lang=ko');
  });

  it('xóa một mục và xóa tất cả (trả số mục đã xóa)', async () => {
    const calls = mockApi((call) => (call.path === GUEST_ENDPOINTS.history ? envelope(200, { data: { deleted: 7 } }) : envelope(200)));
    await api.deleteHistoryItem(KEY, 41);
    expect(await api.deleteHistory(KEY)).toBe(7);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['DELETE /public/guest/history/41', 'DELETE /public/guest/history']);
    expect(calls.every((c) => c.deviceKey === KEY)).toBe(true);
  });

  it('ghi một lượt nghe gửi loại và slug trong thân', async () => {
    const calls = mockApi(() => envelope(200, { data: { recorded: true, reason: null } }));
    const result = await api.recordActivity(KEY, { type: 'LISTEN', slug: 'co-do-hue' }, { lang: 'ja', platform: 'WEB' });
    expect(result.recorded).toBe(true);
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/public/guest/activities?lang=ja', body: { type: 'LISTEN', slug: 'co-do-hue' }, deviceKey: KEY });
  });

  it('đăng ký không mã thì máy chủ cấp mã; đổi cài đặt dùng PUT', async () => {
    const calls = mockApi(() => envelope(201, { data: { deviceKey: KEY, isRegistered: true, platform: 'WEB', language: 'vi', locationAllowed: false, createdAt: null, lastSeenAt: null } }));
    const device = await api.register(null);
    expect(device.deviceKey).toBe(KEY);
    expect(calls[0]!.deviceKey).toBeUndefined();
    await api.updateDevice(KEY, { locationAllowed: true });
    expect(calls[1]).toMatchObject({ method: 'PUT', path: '/public/guest/device', body: { locationAllowed: true }, deviceKey: KEY });
  });

  it('gợi ý chạy được cả khi chưa có mã thiết bị', async () => {
    const calls = mockApi(() => envelope(200, { data: { items: [], isPersonalized: false, usedFallback: false, message: null } }));
    await api.recommendations(null, { lang: 'en' });
    expect(calls[0]).toMatchObject({ path: '/public/guest/recommendations?lang=en', deviceKey: undefined });
  });

  it('"Gần bạn" gửi tọa độ trong thân (không lên đường dẫn) và không kèm mã thiết bị', async () => {
    const calls = mockApi(() => envelope(200, { data: { items: [], unavailableReason: null, message: null } }));
    await api.nearby({ latitude: 16.4637, longitude: 107.5909 }, { lang: 'zh-Hans' });
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/public/guest/nearby?lang=zh-Hans', body: { latitude: 16.4637, longitude: 107.5909 }, deviceKey: undefined });
    expect(calls[0]!.path).not.toContain('16.46');
  });
});
