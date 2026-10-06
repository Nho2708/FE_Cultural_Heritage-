import { afterEach, describe, expect, it, vi } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createAdminAdsApi, createAdsApi } from './ads';
import { ApiError, createApiClient, ERROR_CODES } from './client';

const client = createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'access-dang-nhap' });
const ads = createAdsApi(client);
const KEY = '3f1c2a4e-5b6d-4c8e-9a1b-2c3d4e5f6a7b';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Thay fetch để đọc cả tiêu đề của yêu cầu. */
function stubFetch(response: () => Response) {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => response());
  vi.stubGlobal('fetch', fetchMock);
  const lastHeaders = () => fetchMock.mock.calls.at(-1)?.[1]?.headers as Record<string, string>;
  return { fetchMock, lastHeaders };
}

describe('cổng quảng cáo có thưởng của khách', () => {
  it('không endpoint nào gắn token đăng nhập; mã thiết bị đi ở tiêu đề của riêng yêu cầu', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await ads.config();
    await ads.unlock(KEY, 'co-do-hue');
    await ads.startWeb(KEY, 'co-do-hue');
    await ads.reportWebReward(KEY, { slug: 'co-do-hue', transactionId: 'mot-lan', adUnit: '/1/web' });

    expect(calls.map((c) => [c.method, c.path])).toEqual([
      ['GET', '/public/ads/config'],
      ['GET', '/public/ads/unlock?slug=co-do-hue'],
      ['POST', '/public/ads/web/start'],
      ['POST', '/public/ads/web/rewarded'],
    ]);
    expect(calls.every((c) => c.authorization === undefined)).toBe(true);
    expect(calls.map((c) => c.deviceKey)).toEqual([undefined, KEY, KEY, KEY]);
    expect(calls[2]!.body).toEqual({ slug: 'co-do-hue' });
    expect(calls[3]!.body).toEqual({ slug: 'co-do-hue', transactionId: 'mot-lan', adUnit: '/1/web' });
  });

  it('web luôn khai nền tảng WEB; app gửi nền tảng của mình và khai báo "thiết bị không có quảng cáo" ở tiêu đề thêm', async () => {
    const { lastHeaders } = stubFetch(() => envelope(200, { data: {} }));
    await ads.startWeb(KEY, 'co-do-hue');
    expect(lastHeaders()).toMatchObject({ 'X-Device-Key': KEY, 'X-Client-Platform': 'WEB' });

    await ads.unlock(KEY, 'co-do-hue', { platform: 'IOS', headers: { 'X-Ads-Unavailable': 'true' } });
    expect(lastHeaders()).toMatchObject({ 'X-Device-Key': KEY, 'X-Client-Platform': 'IOS', 'X-Ads-Unavailable': 'true' });
    expect(lastHeaders().Authorization).toBeUndefined();
  });

  it('mã lỗi của cổng đã có tên theo nghĩa', () => {
    expect(ERROR_CODES.adUnlockRequired).toBe('AD_UNLOCK_REQUIRED');
    expect(ERROR_CODES.adRewardRejected).toBe('AD_REWARD_REJECTED');
    expect(ERROR_CODES.adRewardRateLimited).toBe('AD_REWARD_RATE_LIMITED');
    expect(ERROR_CODES.adUnavailable).toBe('AD_UNAVAILABLE');
  });

  it('429 mang số giây chờ từ tiêu đề Retry-After; thiếu hoặc không phải số thì null', async () => {
    const limited = (retryAfter?: string) =>
      new Response(JSON.stringify({ success: false, data: null, message: 'Quá nhiều.', errorCode: 'AD_REWARD_RATE_LIMITED', traceId: 't' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...(retryAfter ? { 'Retry-After': retryAfter } : {}) },
      });
    const input = { slug: 'co-do-hue', transactionId: 'mot-lan', adUnit: '/1/web' };

    stubFetch(() => limited('1800'));
    const withHeader = await ads.reportWebReward(KEY, input).catch((e: unknown) => e);
    expect(withHeader).toBeInstanceOf(ApiError);
    expect(withHeader).toMatchObject({ status: 429, code: 'AD_REWARD_RATE_LIMITED', retryAfterSeconds: 1800 });

    stubFetch(() => limited());
    expect(await ads.reportWebReward(KEY, input).catch((e: unknown) => e)).toMatchObject({ retryAfterSeconds: null });
    stubFetch(() => limited('Wed, 21 Oct 2026 07:28:00 GMT'));
    expect(await ads.reportWebReward(KEY, input).catch((e: unknown) => e)).toMatchObject({ retryAfterSeconds: null });
  });
});

describe('thống kê quảng cáo của quản trị hệ thống', () => {
  it('gắn token đăng nhập, gửi khoảng ngày; bỏ trống thì máy chủ dùng 30 ngày gần nhất', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    const admin = createAdminAdsApi(client);
    await admin.stats({ from: '2026-09-08', to: '2026-10-07' });
    await admin.stats();
    expect(calls.map((c) => c.path)).toEqual(['/admin/ads/stats?from=2026-09-08&to=2026-10-07', '/admin/ads/stats']);
    expect(calls.every((c) => c.authorization === 'Bearer access-dang-nhap')).toBe(true);
  });
});
