import { describe, expect, it } from 'vitest';
import { embedMapUrl, embedModelUrl, originOf, parseEmbedCommand, parseEmbedMessage, readEmbedMapParams, serializeEmbedMessage } from './index';

describe('hợp đồng thông điệp với trang nhúng', () => {
  it('đọc các thông điệp đúng khuôn từ chuỗi JSON hoặc đối tượng', () => {
    expect(parseEmbedMessage('{"type":"ready","version":1}')).toEqual({ type: 'ready', version: 1 });
    expect(parseEmbedMessage({ type: 'pin-selected', version: 1, slug: 'hoang-thanh' })).toEqual({ type: 'pin-selected', version: 1, slug: 'hoang-thanh' });
    expect(parseEmbedMessage({ type: 'model-error', version: 1, reason: 'webgl' })).toEqual({ type: 'model-error', version: 1, reason: 'webgl' });
    expect(parseEmbedMessage({ type: 'model-loaded', version: 1 })).toEqual({ type: 'model-loaded', version: 1 });
  });

  it('cắt tiến trình vào khoảng 0 đến 1', () => {
    expect(parseEmbedMessage({ type: 'model-progress', version: 1, fraction: 1.7 })).toEqual({ type: 'model-progress', version: 1, fraction: 1 });
    expect(parseEmbedMessage({ type: 'model-progress', version: 1, fraction: -2 })).toEqual({ type: 'model-progress', version: 1, fraction: 0 });
  });

  it('bỏ thông điệp lạ, sai phiên bản hoặc thiếu trường', () => {
    for (const raw of [null, 'không phải JSON', '[]', { type: 'ready' }, { type: 'ready', version: 2 }, { type: 'pin-selected', version: 1 }, { type: 'pin-selected', version: 1, slug: '' }, { type: 'model-error', version: 1, reason: 'khác' }, { type: 'lạ', version: 1 }, { type: 'model-progress', version: 1, fraction: Number.NaN }]) {
      expect(parseEmbedMessage(raw)).toBeNull();
    }
  });

  it('lệnh từ app: đọc đúng khuôn và bỏ phần còn lại', () => {
    expect(parseEmbedCommand(serializeEmbedMessage({ type: 'focus', version: 1, slug: 'hue' }))).toEqual({ type: 'focus', version: 1, slug: 'hue' });
    expect(parseEmbedCommand({ type: 'set-filter', version: 1, filter: { keyword: 'huế', region: 'Trung' } })).toEqual({
      type: 'set-filter',
      version: 1,
      filter: { keyword: 'huế', region: 'Trung', heritageType: undefined },
    });
    expect(parseEmbedCommand({ type: 'focus', version: 1 })).toBeNull();
    expect(parseEmbedCommand({ type: 'focus', version: 3, slug: 'x' })).toBeNull();
  });

  it('dựng và đọc lại địa chỉ trang bản đồ nhúng', () => {
    const url = embedMapUrl('http://web.test:5174/', { keyword: 'chùa', region: 'Bắc', heritageType: 'TANGIBLE' }, 'ko', 'chua-mot-cot');
    expect(url.startsWith('http://web.test:5174/nhung/ban-do?')).toBe(true);
    const parsed = readEmbedMapParams(new URL(url).searchParams);
    expect(parsed).toEqual({ filter: { keyword: 'chùa', region: 'Bắc', heritageType: 'TANGIBLE' }, language: 'ko', select: 'chua-mot-cot' });
  });

  it('tham số lạ trên địa chỉ bị bỏ, ngôn ngữ lạ về tiếng Việt', () => {
    const parsed = readEmbedMapParams(new URLSearchParams('lang=fr&vung=Tây&loai=KHAC&tu-khoa=%20%20'));
    expect(parsed).toEqual({ filter: {}, language: 'vi', select: null });
  });

  it('địa chỉ trang 3D mã hóa mã di sản và so được origin', () => {
    expect(embedModelUrl('http://web.test:5174', 'a b')).toBe('http://web.test:5174/nhung/3d/a%20b');
    expect(originOf('http://web.test:5174/nhung/ban-do?x=1')).toBe('http://web.test:5174');
    expect(originOf('không phải địa chỉ')).toBeNull();
  });
});
