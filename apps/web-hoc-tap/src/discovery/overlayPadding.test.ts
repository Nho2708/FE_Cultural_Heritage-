import { describe, expect, it } from 'vitest';
import { overlayPadding } from './overlayPadding';

const AREA = { top: 64, bottom: 900 };

describe('đệm khung nhìn theo lớp nổi của trang Bản đồ', () => {
  it('màn hình rộng: thanh bộ lọc che mép trên, thẻ ghi chú nổi che mép dưới, cộng thêm khoảng cách', () => {
    expect(overlayPadding(AREA, { top: 88, bottom: 150 }, { top: 740, bottom: 876 })).toEqual({ top: 102, bottom: 176 });
  });

  it('khổ hẹp: thẻ ghi chú nằm dưới bản đồ (không giao) thì không đệm mép dưới', () => {
    expect(overlayPadding(AREA, { top: 76, bottom: 160 }, { top: 900, bottom: 1040 })).toEqual({ top: 112, bottom: 0 });
  });

  it('chưa có thẻ ghi chú hoặc thanh bộ lọc thì đệm bằng không', () => {
    expect(overlayPadding(AREA, null, null)).toEqual({ top: 0, bottom: 0 });
  });
});
