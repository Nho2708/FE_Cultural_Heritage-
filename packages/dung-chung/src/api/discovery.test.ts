import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../testing/api';
import { createApiClient } from './client';
import { createDiscoveryApi } from './discovery';

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
});
