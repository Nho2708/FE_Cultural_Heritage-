import { describe, expect, it } from 'vitest';
import { heritageDetailOf } from '../../test/fixtures';
import { EMPTY_HERITAGE, formFieldOf, heritageBody, heritageValuesOf, readTab, sameHeritage, tabOfMissing } from './heritageForm';

describe('giá trị ô nhập của thông tin chung', () => {
  it('chi tiết di sản sang ô nhập rồi ngược lại cho ra cùng dữ liệu', () => {
    const detail = heritageDetailOf({ recognizedYear: 1993 });
    const values = heritageValuesOf(detail);
    expect(values.provinceId).toBe('1');
    expect(values.latitude).toBe('16.4637');
    expect(heritageBody(values)).toMatchObject({
      name: 'Quần thể di tích Cố đô Huế',
      heritageType: 'TANGIBLE',
      recognitionLevel: 'UNESCO',
      recognizedYear: 1993,
      provinceId: 1,
      latitude: 16.4637,
      longitude: 107.5909,
      placeId: null,
    });
  });

  it('ô trống hoặc toàn khoảng trắng gửi lên là null, số sai dạng không thành số', () => {
    const body = heritageBody({ ...EMPTY_HERITAGE, name: ' Đền Hùng ', address: '   ', latitude: 'abc', recognizedYear: '1x' });
    expect(body).toEqual({
      name: 'Đền Hùng',
      slug: null,
      shortDescription: null,
      content: null,
      heritageType: null,
      recognitionLevel: null,
      recognizedYear: null,
      provinceId: null,
      address: null,
      latitude: null,
      longitude: null,
      placeId: null,
    });
  });

  it('dấu phẩy thập phân của tiếng Việt được đổi thành số', () => {
    expect(heritageBody({ ...EMPTY_HERITAGE, name: 'A', latitude: '16,4637', longitude: '107,5909' })).toMatchObject({
      latitude: 16.4637,
      longitude: 107.5909,
    });
  });

  it('khoảng trắng thừa không tính là thay đổi chưa lưu', () => {
    const saved = heritageValuesOf(heritageDetailOf());
    expect(sameHeritage(saved, { ...saved, name: `${saved.name} ` })).toBe(true);
    expect(sameHeritage(saved, { ...saved, name: 'Tên khác' })).toBe(false);
  });
});

describe('tab và điều kiện xuất bản', () => {
  it('tab lạ trên URL về Thông tin chung', () => {
    expect(readTab('nguon')).toBe('nguon');
    expect(readTab('khac')).toBe('thong-tin');
    expect(readTab(null)).toBe('thong-tin');
  });

  it('phần thiếu của nguồn mở tab Nguồn tham chiếu, còn lại mở Thông tin chung', () => {
    expect(tabOfMissing('references')).toBe('nguon');
    expect(tabOfMissing('content')).toBe('thong-tin');
    expect(tabOfMissing('thumbnailUrl')).toBe('thong-tin');
  });

  it('khóa lỗi của máy chủ khớp với ô nhập; tọa độ hiện ở ô Vĩ độ', () => {
    expect(formFieldOf('shortDescription')).toBe('shortDescription');
    expect(formFieldOf('coordinates')).toBe('latitude');
    expect(formFieldOf('references')).toBeNull();
  });
});
