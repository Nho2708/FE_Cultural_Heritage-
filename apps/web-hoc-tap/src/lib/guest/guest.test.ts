import { isDeviceKey } from '@dsvhvn/dung-chung';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '../auth/session';
import { sessionOf } from '../../test/fixtures';
import { DEVICE_KEY_STORAGE_KEY, getDeviceKey } from './deviceKey';
import { guestHeaders, isEmbedPath, isGuestTracking } from './tracking';

// Mã thiết bị ẩn danh của khách và khi nào yêu cầu công khai mang mã.

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

describe('mã thiết bị của trình duyệt', () => {
  it('sinh một lần, lưu lại và trả đúng mã đó ở các lần sau', () => {
    const first = getDeviceKey();
    expect(isDeviceKey(first)).toBe(true);
    expect(window.localStorage.getItem(DEVICE_KEY_STORAGE_KEY)).toBe(first);
    expect(getDeviceKey()).toBe(first);
  });

  it('mã lưu sai định dạng hoặc không phải phiên bản 4 thì thay bằng mã mới', () => {
    for (const bad of ['', 'abc', '3f1c2a4e-5b6d-1c8e-9a1b-2c3d4e5f6a7b']) {
      window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, bad);
      const key = getDeviceKey();
      expect(isDeviceKey(key)).toBe(true);
      expect(key).not.toBe(bad);
    }
  });

  it('mã chữ hoa được đưa về chữ thường như máy chủ', () => {
    window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, '3F1C2A4E-5B6D-4C8E-9A1B-2C3D4E5F6A7B');
    expect(getDeviceKey()).toBe('3f1c2a4e-5b6d-4c8e-9a1b-2c3d4e5f6a7b');
  });

  it('trình duyệt chặn lưu trữ thì mã chỉ sống trong bộ nhớ và vẫn ổn định trong phiên', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const key = getDeviceKey();
    expect(isDeviceKey(key)).toBe(true);
    expect(getDeviceKey()).toBe(key);
  });
});

describe('khi nào yêu cầu công khai mang mã thiết bị', () => {
  it('khách: mang mã và nền tảng WEB', () => {
    const headers = guestHeaders();
    expect(isDeviceKey(headers['X-Device-Key'])).toBe(true);
    expect(headers['X-Client-Platform']).toBe('WEB');
    expect(isGuestTracking()).toBe(true);
  });

  it('học sinh đã đăng nhập: không mang gì', () => {
    sessionStore.setSession(sessionOf());
    expect(guestHeaders()).toEqual({});
    expect(isGuestTracking()).toBe(false);
  });

  it('trang nhúng cho app: không mang gì', () => {
    expect(isEmbedPath('/nhung/ban-do')).toBe(true);
    expect(isEmbedPath('/nhung/3d/co-do-hue')).toBe(true);
    expect(isEmbedPath('/di-san/nhung-nhung')).toBe(false);
    window.history.pushState({}, '', '/nhung/ban-do');
    expect(guestHeaders()).toEqual({});
  });
});
