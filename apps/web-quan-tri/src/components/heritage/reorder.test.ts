import { describe, expect, it } from 'vitest';
import { moveBefore, moveId } from './reorder';

// Đổi thứ tự: danh sách gửi lên là toàn bộ id theo thứ tự mới.
describe('đổi thứ tự', () => {
  it('phím mũi tên dời một vị trí, ở đầu hoặc cuối thì không đổi', () => {
    expect(moveId([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moveId([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    expect(moveId([1, 2, 3], 1, -1)).toBeNull();
    expect(moveId([1, 2, 3], 3, 1)).toBeNull();
    expect(moveId([1, 2, 3], 9, 1)).toBeNull();
  });

  it('kéo thả đặt phần tử vào vị trí của phần tử đích, cả kéo lên lẫn kéo xuống', () => {
    expect(moveBefore([1, 2, 3, 4], 4, 2)).toEqual([1, 4, 2, 3]);
    expect(moveBefore([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 1, 4]);
    expect(moveBefore([1, 2, 3], 2, 2)).toBeNull();
    expect(moveBefore([1, 2, 3], 2, 9)).toBeNull();
  });

  it('không sửa danh sách gốc', () => {
    const ids = [1, 2, 3];
    moveId(ids, 1, 1);
    expect(ids).toEqual([1, 2, 3]);
  });
});
