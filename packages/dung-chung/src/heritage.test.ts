import { describe, expect, it } from 'vitest';
import {
  composeReferenceTitle,
  formatEventDate,
  formatEventRange,
  formatTimelineRange,
  formatYear,
  parseReferenceTitle,
} from './heritage';

describe('tiêu đề nguồn theo mẫu của nhóm', () => {
  it('ghép "Tên — Cơ quan, truy cập dd/mm/yyyy" và bỏ phần trống', () => {
    expect(composeReferenceTitle({ name: ' Festival Huế ', agency: 'Bộ Văn hóa', accessedOn: '26/09/2026' })).toBe(
      'Festival Huế — Bộ Văn hóa, truy cập 26/09/2026',
    );
    expect(composeReferenceTitle({ name: 'Sách A', agency: 'Nhà xuất bản B', accessedOn: '' })).toBe('Sách A — Nhà xuất bản B');
    expect(composeReferenceTitle({ name: 'Trang A', agency: '', accessedOn: '01/01/2026' })).toBe('Trang A — truy cập 01/01/2026');
    expect(composeReferenceTitle({ name: 'Trang A', agency: '', accessedOn: '' })).toBe('Trang A');
  });

  it('tách ra rồi ghép lại đúng nguyên văn, kể cả tiêu đề không theo mẫu', () => {
    const titles = [
      'Quần thể di tích Cố đô Huế (Hộ sơ) — Cục Di sản văn hóa, truy cập 26/09/2026',
      'Tên — Cơ quan — Phụ, truy cập 5/9/2026',
      'Sách A — Nhà xuất bản B',
      'Trang A — truy cập 01/01/2026',
      'Complex of Hué Monuments (ID 678: ghi danh 1993)',
    ];
    for (const title of titles) expect(composeReferenceTitle(parseReferenceTitle(title))).toBe(title);
    expect(parseReferenceTitle(titles[0])).toEqual({
      name: 'Quần thể di tích Cố đô Huế (Hộ sơ)',
      agency: 'Cục Di sản văn hóa',
      accessedOn: '26/09/2026',
    });
    expect(parseReferenceTitle(null)).toEqual({ name: '', agency: '', accessedOn: '' });
  });
});

describe('hiển thị năm và ngày', () => {
  it('năm âm hiện dạng trước Công nguyên', () => {
    expect(formatYear(1802)).toBe('1802');
    expect(formatYear(-258)).toBe('258 TCN');
  });

  it('ngày của sự kiện theo mức chi tiết có', () => {
    expect(formatEventDate(1805, null, null)).toBe('1805');
    expect(formatEventDate(1805, 8, null)).toBe('08/1805');
    expect(formatEventDate(1993, 12, 11)).toBe('11/12/1993');
  });

  it('khoảng thời gian của sự kiện và của giai đoạn', () => {
    const base = { startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null };
    expect(formatEventRange({ ...base, startYear: 1833 })).toBe('1833');
    expect(formatEventRange({ ...base, startYear: 1805, endYear: 1832 })).toBe('1805 – 1832');
    expect(formatTimelineRange(1802, 1833)).toBe('1802 – 1833');
    expect(formatTimelineRange(1993, null)).toBe('Từ 1993');
    expect(formatTimelineRange(null, 1775)).toBe('Đến 1775');
    expect(formatTimelineRange(null, null)).toBe('');
  });
});
