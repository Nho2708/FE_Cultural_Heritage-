import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createApiClient } from './client';
import { createDiscoveryApi, createPreviewApi } from './discovery';

const api = createDiscoveryApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'access-dang-nhap' }));

describe('khám phá di sản công khai', () => {
  it('không gắn token dù đang đăng nhập, để khách và học sinh xem như nhau', async () => {
    const calls = mockApi(() => envelope(200, { data: { featured: [], totalHeritages: 0, byType: [], byRegion: [] } }));
    await api.home();
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/public/home', authorization: undefined });
  });

  it('tìm kiếm gửi từ khóa, từng bộ lọc và phân trang; bỏ qua giá trị trống', async () => {
    const calls = mockApi(() => envelope(200, { data: { items: [], page: 2, pageSize: 12, totalItems: 0, totalPages: 0 } }));
    await api.search(
      { keyword: 'thang long', provinceId: 1, region: 'Bắc', heritageType: 'TANGIBLE', recognitionLevel: 'UNESCO', period: 'INDEPENDENT_FEUDAL' },
      { page: 2, pageSize: 12 },
    );
    await api.search({}, {});
    const first = new URL(`http://x${calls[0]!.path}`);
    expect(first.pathname).toBe('/public/heritages');
    expect(Object.fromEntries(first.searchParams)).toEqual({
      keyword: 'thang long',
      provinceId: '1',
      region: 'Bắc',
      heritageType: 'TANGIBLE',
      recognitionLevel: 'UNESCO',
      period: 'INDEPENDENT_FEUDAL',
      page: '2',
      pageSize: '12',
    });
    expect(calls[1]!.path).toBe('/public/heritages');
  });

  it('bản đồ dùng cùng bộ lọc nhưng không phân trang', async () => {
    const calls = mockApi(() => envelope(200, { data: { pins: [], totalMatched: 0, withoutLocation: 0, isTruncated: false } }));
    await api.map({ keyword: 'hue', heritageType: 'NATURAL' });
    expect(calls[0]!.path).toBe('/public/heritages/map?keyword=hue&heritageType=NATURAL');
  });

  it('chỉ tóm tắt mang token của học sinh (máy chủ mở thẳng cổng quảng cáo cho học sinh); mọi API khám phá khác không mang token', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await api.summary('co-do-hue', { lang: 'en' });
    await api.detail('co-do-hue');
    await api.model('co-do-hue');
    expect(calls.map((c) => [c.path, c.authorization])).toEqual([
      ['/public/heritages/co-do-hue/summary?lang=en', 'Bearer access-dang-nhap'],
      ['/public/heritages/co-do-hue', undefined],
      ['/public/heritages/co-do-hue/model', undefined],
    ]);
  });

  it('chi tiết và timeline mã hóa slug trên đường dẫn', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await api.detail('quan-the/di tich');
    await api.timeline('co-do-hue');
    expect(calls.map((c) => c.path)).toEqual(['/public/heritages/quan-the%2Fdi%20tich', '/public/heritages/co-do-hue/timeline']);
  });

  it('danh mục bộ lọc', async () => {
    const calls = mockApi(() => envelope(200, { data: { provinces: [] } }));
    await api.filters();
    expect(calls[0]!.path).toBe('/public/filters');
  });

  it('mọi endpoint nội dung di sản gửi ngôn ngữ trong tham số lang; bỏ trống thì không gửi', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await api.home({ lang: 'ko' });
    await api.search({ keyword: 'hue' }, { page: 1 }, { lang: 'zh-Hans' });
    await api.map({}, { lang: 'ja' });
    await api.detail('co-do-hue', { lang: 'en' });
    await api.timeline('co-do-hue', { lang: 'en' });
    await api.summary('co-do-hue', { lang: 'vi' });
    await api.home();
    expect(calls.map((c) => c.path)).toEqual([
      '/public/home?lang=ko',
      '/public/heritages?keyword=hue&page=1&lang=zh-Hans',
      '/public/heritages/map?lang=ja',
      '/public/heritages/co-do-hue?lang=en',
      '/public/heritages/co-do-hue/timeline?lang=en',
      '/public/heritages/co-do-hue/summary?lang=vi',
      '/public/home',
    ]);
  });

  it('danh sách ngôn ngữ không gắn token; tóm tắt mã hóa slug và mang token của học sinh nếu có phiên', async () => {
    const calls = mockApi(() => envelope(200, { data: [] }));
    await api.languages();
    await api.summary('quan/ho');
    expect(calls.map((c) => c.path)).toEqual(['/public/languages', '/public/heritages/quan%2Fho/summary']);
    expect(calls.map((c) => c.authorization)).toEqual([undefined, 'Bearer access-dang-nhap']);
  });

  it('xem trước bản nháp cũng nhận lang', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    const preview = createPreviewApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'quan-tri' }));
    await preview.heritage('ma-xem-truoc', { lang: 'ko' });
    await preview.timeline('ma-xem-truoc');
    expect(calls.map((c) => c.path)).toEqual(['/preview/heritages/ma-xem-truoc?lang=ko', '/preview/heritages/ma-xem-truoc/timeline']);
  });
});

describe('ngôn ngữ mặc định của bộ API khám phá (web quản trị chỉ tiếng Việt)', () => {
  const vi = createDiscoveryApi(createApiClient({ baseUrl: 'http://api.test/api/v1', getAccessToken: () => 'access-dang-nhap' }), { lang: 'vi' });
  const langOf = (path: string) => new URL(`http://x${path}`).searchParams.get('lang');

  it('gửi kèm lang=vi ở mọi API có nội dung theo ngôn ngữ để máy chủ không chọn theo Accept-Language của trình duyệt', async () => {
    const calls = mockApi(() => envelope(200, { data: { items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0, pins: [], phases: [] } }));
    await vi.search({ keyword: 'hoi an' }, { page: 1, pageSize: 12 });
    await vi.map({});
    await vi.detail('do-thi-co-hoi-an');
    await vi.timeline('do-thi-co-hoi-an');
    await vi.home();
    expect(calls.map((c) => langOf(c.path))).toEqual(['vi', 'vi', 'vi', 'vi', 'vi']);
  });

  it('danh mục lọc không có nội dung theo ngôn ngữ nên không gửi lang; lời gọi chỉ rõ ngôn ngữ thì thắng mặc định', async () => {
    const calls = mockApi(() => envelope(200, { data: {} }));
    await vi.filters();
    await vi.detail('do-thi-co-hoi-an', { lang: 'en' });
    expect(calls[0]!.path).toBe('/public/filters');
    expect(langOf(calls[1]!.path)).toBe('en');
  });
});
