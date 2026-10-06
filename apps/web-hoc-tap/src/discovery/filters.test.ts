import { describe, expect, it } from 'vitest';
import { filterFromParams, hasActiveFilter, keywordInvalid, pageFromParams, paramsFromFilter, selectFilterCount, toSearch } from './filters';

describe('bộ lọc khám phá trên địa chỉ trang', () => {
  it('đọc từ khóa và từng bộ lọc hợp lệ', () => {
    const params = new URLSearchParams('tu-khoa= thang long &tinh=3&vung=Bắc&loai=INTANGIBLE&cap=UNESCO&thoi-ky=MODERN&trang=2');
    expect(filterFromParams(params)).toEqual({
      keyword: 'thang long',
      provinceId: 3,
      region: 'Bắc',
      heritageType: 'INTANGIBLE',
      recognitionLevel: 'UNESCO',
      period: 'MODERN',
    });
    expect(pageFromParams(params)).toBe(2);
  });

  it('bỏ qua giá trị lạ thay vì gửi lên máy chủ', () => {
    const params = new URLSearchParams('tinh=abc&vung=Tây&loai=CASTLE&cap=&thoi-ky=FUTURE&trang=-4');
    expect(filterFromParams(params)).toEqual({});
    expect(pageFromParams(params)).toBe(1);
    expect(hasActiveFilter({})).toBe(false);
  });

  it('ghi lại đúng tham số; trang 1 không ghi', () => {
    const params = paramsFromFilter({ keyword: 'hue', heritageType: 'TANGIBLE', provinceId: 20 }, { page: 1, select: 'co-do-hue' });
    expect(toSearch(params)).toBe('?tu-khoa=hue&tinh=20&loai=TANGIBLE&chon=co-do-hue');
    expect(toSearch(paramsFromFilter({}, { page: 3 }))).toBe('?trang=3');
    expect(toSearch(new URLSearchParams())).toBe('');
  });

  it('đếm ô lọc đang chọn, không kể từ khóa', () => {
    expect(selectFilterCount({ keyword: 'hue', region: 'Nam', period: 'MODERN' })).toBe(2);
    expect(hasActiveFilter({ keyword: 'hue' })).toBe(true);
  });

  it('từ khóa ngoài 2-100 ký tự là không hợp lệ; để trống thì không lỗi', () => {
    expect(keywordInvalid('a')).toBe(true);
    expect(keywordInvalid('x'.repeat(101))).toBe(true);
    expect(keywordInvalid('hu')).toBe(false);
    expect(keywordInvalid('x'.repeat(100))).toBe(false);
    expect(keywordInvalid('   ')).toBe(false);
    expect(keywordInvalid(undefined)).toBe(false);
  });
});
