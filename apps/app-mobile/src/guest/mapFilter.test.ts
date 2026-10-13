import { embedMapUrl } from '@dsvhvn/dung-chung/embed';
import { extraFilterCount, hasMapFilter, toEmbedFilter } from './mapFilter';

describe('map filter', () => {
  it('keeps only the fields that are chosen', () => {
    expect(toEmbedFilter({})).toEqual({});
    expect(toEmbedFilter({ heritageType: undefined, region: 'Trung', provinceId: 29, recognitionLevel: 'UNESCO', period: 'MODERN' })).toEqual({
      region: 'Trung',
      provinceId: 29,
      recognitionLevel: 'UNESCO',
      period: 'MODERN',
    });
    expect(Object.keys(toEmbedFilter({ heritageType: undefined }))).toEqual([]);
  });

  it('counts the filters inside the more-filters panel, not the chips', () => {
    expect(extraFilterCount({ heritageType: 'NATURAL', region: 'Bắc' })).toBe(0);
    expect(extraFilterCount({ provinceId: 1, period: 'MODERN' })).toBe(2);
    expect(extraFilterCount({ provinceId: 1, recognitionLevel: 'NATIONAL', period: 'MODERN' })).toBe(3);
  });

  it('tells whether any filter is on', () => {
    expect(hasMapFilter({})).toBe(false);
    expect(hasMapFilter({ period: 'MODERN' })).toBe(true);
  });

  it('builds the embedded map address with every chosen filter and the language', () => {
    const url = embedMapUrl('http://web.test', toEmbedFilter({ heritageType: 'TANGIBLE', provinceId: 29, recognitionLevel: 'UNESCO', period: 'MODERN' }), 'ja', 'hue');
    const params = new URL(url).searchParams;
    expect(params.get('lang')).toBe('ja');
    expect(params.get('loai')).toBe('TANGIBLE');
    expect(params.get('tinh')).toBe('29');
    expect(params.get('cap')).toBe('UNESCO');
    expect(params.get('thoi-ky')).toBe('MODERN');
    expect(params.get('chon')).toBe('hue');
  });
});
