import type { GuestHistoryItem } from '@dsvhvn/dung-chung/api';
import { toEntry } from './HistoryProvider';

jest.mock('../state/AppProvider', () => ({ useApp: jest.fn() }));

const heritage = { slug: 'co-do-hue', name: 'Cố đô Huế', thumbnailUrl: null, heritageType: 'TANGIBLE', provinceName: 'Thừa Thiên Huế' } as unknown as GuestHistoryItem['heritage'];
const base = { id: 7, typeLabel: '', query: null, heritage: null, language: 'vi', createdAt: '2026-10-01T00:00:00Z' } as const;

describe('đổi mục lịch sử của máy chủ thành mục hiển thị', () => {
  it('từ khóa tìm, lượt xem, nghe và xem 3D', () => {
    expect(toEntry({ ...base, type: 'SEARCH', query: 'huế' })).toMatchObject({ id: 7, kind: 'search', key: 'huế' });
    expect(toEntry({ ...base, type: 'VIEW', heritage })).toMatchObject({ kind: 'view', key: 'co-do-hue', label: 'Cố đô Huế' });
    expect(toEntry({ ...base, type: 'LISTEN', heritage })?.kind).toBe('listen');
    expect(toEntry({ ...base, type: 'VIEW_3D', heritage })?.kind).toBe('model');
  });

  it('bỏ lượt đọc tóm tắt và mục thiếu di sản', () => {
    expect(toEntry({ ...base, type: 'READ_SUMMARY', heritage })).toBeNull();
    expect(toEntry({ ...base, type: 'VIEW' })).toBeNull();
  });
});
