import { describe, expect, it } from 'vitest';
import { overlayPadding } from './overlayPadding';

const AREA = { top: 64, bottom: 900, left: 0, right: 1440 };
const BAR = { top: 88, bottom: 150, left: 80, right: 1360 };

describe('đệm khung nhìn theo lớp nổi của trang Bản đồ', () => {
  it('màn hình rộng: thanh bộ lọc che mép trên, thẻ ghi chú nổi che góc dưới trái (mép dưới và cạnh trái), cộng khoảng cách', () => {
    expect(overlayPadding(AREA, BAR, { top: 740, bottom: 876, left: 80, right: 640 })).toEqual({ top: 102, bottom: 176, left: 656 });
  });

  it('khổ hẹp: thẻ ghi chú nằm dưới bản đồ (không giao) thì không đệm mép dưới và cạnh trái', () => {
    expect(overlayPadding(AREA, { ...BAR, bottom: 160 }, { top: 900, bottom: 1040, left: 0, right: 393 })).toEqual({ top: 112, bottom: 0, left: 0 });
  });

  it('chưa có thẻ ghi chú hoặc thanh bộ lọc thì đệm bằng không', () => {
    expect(overlayPadding(AREA, null, null)).toEqual({ top: 0, bottom: 0, left: 0 });
  });
});
