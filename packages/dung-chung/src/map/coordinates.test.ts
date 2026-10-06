import { describe, expect, it } from 'vitest';
import { insideLimits, roundCoordinate, type CoordinateLimits } from './coordinates';

const LIMITS: CoordinateLimits = { minLatitude: 8, maxLatitude: 23.5, minLongitude: 102, maxLongitude: 117.5 };

describe('tọa độ của bản đồ chọn tọa độ', () => {
  it('làm tròn tới 6 chữ số thập phân', () => {
    expect(roundCoordinate(16.46940123456)).toBe(16.469401);
    expect(roundCoordinate(107)).toBe(107);
  });

  it('chỉ nhận tọa độ trong khoảng lãnh thổ Việt Nam, kể cả đúng biên', () => {
    expect(insideLimits(LIMITS, 16.4694, 107.5778)).toBe(true);
    expect(insideLimits(LIMITS, 8, 102)).toBe(true);
    expect(insideLimits(LIMITS, 23.5, 117.5)).toBe(true);
    expect(insideLimits(LIMITS, 7.99, 107)).toBe(false);
    expect(insideLimits(LIMITS, 16, 117.51)).toBe(false);
    expect(insideLimits(LIMITS, 40, 107)).toBe(false);
  });
});
