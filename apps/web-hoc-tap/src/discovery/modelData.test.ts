import { describe, expect, it } from 'vitest';
import { formatModelSize, HEAVY_MODEL_BYTES, shouldWarnBeforeLoad } from './modelData';

const MB = 1024 * 1024;

describe('cảnh báo trước khi tải mô hình 3D nặng', () => {
  it('mô hình nhẹ thì tải luôn dù đang dùng mạng di động', () => {
    expect(shouldWarnBeforeLoad(HEAVY_MODEL_BYTES - 1, { type: 'cellular' })).toBe(false);
  });

  it('mô hình nặng trên mạng di động, tiết kiệm dữ liệu hoặc mạng chậm thì hỏi trước', () => {
    expect(shouldWarnBeforeLoad(8 * MB, { type: 'cellular' })).toBe(true);
    expect(shouldWarnBeforeLoad(8 * MB, { saveData: true })).toBe(true);
    for (const effectiveType of ['slow-2g', '2g', '3g']) expect(shouldWarnBeforeLoad(HEAVY_MODEL_BYTES, { effectiveType })).toBe(true);
  });

  it('mạng tốt hoặc không biết tình trạng mạng thì tải luôn', () => {
    expect(shouldWarnBeforeLoad(15 * MB, { type: 'wifi', effectiveType: '4g' })).toBe(false);
    expect(shouldWarnBeforeLoad(15 * MB, { effectiveType: '4g', saveData: false })).toBe(false);
    expect(shouldWarnBeforeLoad(15 * MB, undefined)).toBe(false);
  });
});

describe('dung lượng mô hình theo ngôn ngữ', () => {
  it('dấu thập phân theo ngôn ngữ; dưới 1 MB tính bằng KB', () => {
    expect(formatModelSize(4.4 * MB, 'vi')).toBe('4,4 MB');
    expect(formatModelSize(4.4 * MB, 'en')).toBe('4.4 MB');
    expect(formatModelSize(15 * MB, 'ja')).toBe('15.0 MB');
    expect(formatModelSize(512 * 1024, 'ko')).toBe('512 KB');
    expect(formatModelSize(10, 'vi')).toBe('1 KB');
  });
});
