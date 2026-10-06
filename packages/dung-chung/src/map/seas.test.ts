import { describe, expect, it } from 'vitest';
import { EAST_SEA_LABEL, VIETNAM_ARCHIPELAGOS, VIETNAM_BOUNDS } from './seas';

describe('hai quần đảo thuộc Việt Nam trên bản đồ', () => {
  it('có đủ Hoàng Sa và Trường Sa, nhãn ghi rõ thuộc Việt Nam', () => {
    expect(VIETNAM_ARCHIPELAGOS.map((a) => a.label)).toEqual(['Quần đảo Hoàng Sa (Việt Nam)', 'Quần đảo Trường Sa (Việt Nam)']);
    expect(EAST_SEA_LABEL.text).toBe('BIỂN ĐÔNG');
  });

  it('các đảo chính nằm đúng khu vực và trong khung nhìn mặc định', () => {
    const [hoangSa, truongSa] = VIETNAM_ARCHIPELAGOS;
    expect(hoangSa!.islands.map((i) => i.name)).toContain('Đảo Phú Lâm');
    expect(truongSa!.islands.map((i) => i.name)).toContain('Đảo Song Tử Tây');
    for (const island of hoangSa!.islands) {
      expect(island.latitude).toBeGreaterThan(15.5);
      expect(island.latitude).toBeLessThan(17.5);
      expect(island.longitude).toBeGreaterThan(111);
      expect(island.longitude).toBeLessThan(113);
    }
    for (const island of truongSa!.islands) {
      expect(island.latitude).toBeGreaterThan(7);
      expect(island.latitude).toBeLessThan(12);
      expect(island.longitude).toBeGreaterThan(111);
      expect(island.longitude).toBeLessThan(115);
    }
    const [[south, west], [north, east]] = VIETNAM_BOUNDS;
    for (const archipelago of VIETNAM_ARCHIPELAGOS) {
      for (const point of [...archipelago.islands, { latitude: archipelago.labelAt[0], longitude: archipelago.labelAt[1] }]) {
        expect(point.latitude).toBeGreaterThan(south);
        expect(point.latitude).toBeLessThan(north);
        expect(point.longitude).toBeGreaterThan(west);
        expect(point.longitude).toBeLessThan(east);
      }
    }
  });
});
