import { describe, expect, it } from 'vitest';
import { pageWindow } from './pagination';

describe('dãy số trang', () => {
  it('ít trang thì hiện đủ', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('nhiều trang thì có đầu, cuối, trang đang xem cùng hai trang liền kề và dấu "…"', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 'gap', 20]);
    expect(pageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
    expect(pageWindow(20, 20)).toEqual([1, 'gap', 19, 20]);
    expect(pageWindow(3, 9)).toEqual([1, 2, 3, 4, 'gap', 9]);
  });
});
