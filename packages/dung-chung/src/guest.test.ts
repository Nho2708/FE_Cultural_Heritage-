import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDeviceKey, formatDistance, isDeviceKey } from './guest';

describe('mã thiết bị của khách', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chỉ nhận UUID phiên bản 4', () => {
    expect(isDeviceKey('3f1c2a4e-5b6d-4c8e-9a1b-2c3d4e5f6a7b')).toBe(true);
    expect(isDeviceKey('3F1C2A4E-5B6D-4C8E-9A1B-2C3D4E5F6A7B')).toBe(true);
    expect(isDeviceKey('3f1c2a4e-5b6d-1c8e-9a1b-2c3d4e5f6a7b')).toBe(false);
    expect(isDeviceKey('3f1c2a4e-5b6d-4c8e-1a1b-2c3d4e5f6a7b')).toBe(false);
    expect(isDeviceKey('khong-phai-ma')).toBe(false);
    expect(isDeviceKey(null)).toBe(false);
  });

  it('sinh mã đúng định dạng và không trùng nhau', () => {
    const keys = new Set(Array.from({ length: 50 }, createDeviceKey));
    expect(keys.size).toBe(50);
    for (const key of keys) expect(isDeviceKey(key)).toBe(true);
  });

  it('môi trường không có randomUUID thì dựng từ bộ sinh số ngẫu nhiên mật mã', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(255) });
    const key = createDeviceKey();
    expect(isDeviceKey(key)).toBe(true);
    expect(key).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('không có bộ sinh ngẫu nhiên an toàn thì báo lỗi, không dùng Math.random', () => {
    vi.stubGlobal('crypto', {});
    expect(() => createDeviceKey()).toThrow(/bộ sinh số ngẫu nhiên an toàn/);
  });
});

describe('khoảng cách "Gần bạn"', () => {
  it('dưới 1000 m hiện mét, từ 1000 m hiện km làm tròn một chữ số', () => {
    expect(formatDistance(350, 'vi-VN')).toBe('350 m');
    expect(formatDistance(999.4, 'en-US')).toBe('999 m');
    expect(formatDistance(1000, 'en-US')).toBe('1 km');
    expect(formatDistance(1234, 'vi-VN')).toBe('1,2 km');
    expect(formatDistance(1234, 'en-US')).toBe('1.2 km');
    expect(formatDistance(15249, 'ja-JP')).toBe('15.2 km');
  });
});
