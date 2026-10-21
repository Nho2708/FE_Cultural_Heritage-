import { beforeAll, describe, expect, it } from 'vitest';
import { LAND_MASK_PANE, isInsideVietnamLand, vietnamLandRings } from './landMask';
import { createBaseMap, loadLeaflet } from './leafletBase';
import { VIETNAM_ARCHIPELAGOS, VIETNAM_BOUNDS } from './seas';

describe('dữ liệu đất liền và đảo ven bờ của Việt Nam', () => {
  it('có đất liền và các đảo ven bờ lớn, nằm trong khung nhìn cả nước', () => {
    const rings = vietnamLandRings();
    expect(rings.length).toBeGreaterThan(10);
    expect(rings[0]!.length).toBeGreaterThan(1000); // vòng đầu là đất liền
    const [[south, west], [north, east]] = VIETNAM_BOUNDS;
    for (const ring of rings) {
      for (const [latitude, longitude] of ring) {
        expect(latitude).toBeGreaterThan(south);
        expect(latitude).toBeLessThan(north);
        expect(longitude).toBeGreaterThan(west);
        expect(longitude).toBeLessThan(east);
      }
    }
  });

  it('các thành phố, đảo của Việt Nam nằm trong; thủ đô nước láng giềng và Hải Khẩu nằm ngoài', () => {
    expect(isInsideVietnamLand(21.028, 105.854)).toBe(true); // Hà Nội
    expect(isInsideVietnamLand(10.776, 106.7)).toBe(true); // Thành phố Hồ Chí Minh
    expect(isInsideVietnamLand(22.396, 103.97)).toBe(true); // Sa Pa (Lào Cai, sát biên giới)
    expect(isInsideVietnamLand(10.595, 104.955)).toBe(true); // Hà Tiên (An Giang, sát biên giới)
    expect(isInsideVietnamLand(10.23, 103.97)).toBe(true); // Phú Quốc
    expect(isInsideVietnamLand(8.7, 106.6)).toBe(true); // Côn Đảo
    expect(isInsideVietnamLand(20.78, 107.01)).toBe(true); // Cát Bà
    expect(isInsideVietnamLand(10.51, 108.95)).toBe(true); // Phú Quý

    expect(isInsideVietnamLand(17.975, 102.633)).toBe(false); // Viêng Chăn
    expect(isInsideVietnamLand(11.556, 104.928)).toBe(false); // Phnôm Pênh
    expect(isInsideVietnamLand(20.044, 110.199)).toBe(false); // Hải Khẩu
    expect(isInsideVietnamLand(14.0, 113.2)).toBe(false); // giữa Biển Đông
  });

  it('không khoét lỗ ở Hoàng Sa, Trường Sa: hai quần đảo vẽ riêng bằng chấm và nhãn trên lớp che', () => {
    for (const archipelago of VIETNAM_ARCHIPELAGOS) {
      for (const island of archipelago.islands) expect(isInsideVietnamLand(island.latitude, island.longitude)).toBe(false);
    }
  });
});

describe('lớp che ngoài lãnh thổ trên nền bản đồ dùng chung', () => {
  beforeAll(() => {
    Object.defineProperty(SVGElement.prototype, 'createSVGRect', { value: () => ({}), configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 1440, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 900, configurable: true });
  });

  it('mặc định vẽ lớp che trên ô bản đồ, dưới ghim, không nhận chuột; không thu nhỏ quá khung nhìn cả nước', async () => {
    const L = await loadLeaflet();
    const element = document.createElement('div');
    document.body.append(element);
    const map = createBaseMap(L, element);
    map.fitBounds(VIETNAM_BOUNDS);

    const pane = map.getPane(LAND_MASK_PANE);
    // Ô bản đồ nền 200 và ghim 600 là giá trị trong CSS của Leaflet; lớp quần đảo đặt zIndex ngay trên phần tử.
    expect(pane?.style.zIndex).toBe('300');
    expect(pane?.style.pointerEvents).toBe('none');
    expect(Number(pane?.style.zIndex)).toBeLessThan(Number(map.getPane('vung-bien')?.style.zIndex));
    const path = element.querySelector('path.dsv-land-mask');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('fill-rule')).toBe('evenodd');
    expect(path?.classList.contains('leaflet-interactive')).toBe(false);
    // Chấm đảo của hai quần đảo vẫn vẽ trên lớp che.
    expect(element.querySelectorAll('.dsv-island').length).toBeGreaterThanOrEqual(12);
    // Khung 1440 x 900: cả nước vừa ở mức 6, cho thu nhỏ thêm một mức.
    expect(map.getZoom()).toBe(6);
    expect(map.getMinZoom()).toBe(5);
    map.remove();
  });

  it('tắt được lớp che khi nơi gọi cần', async () => {
    const L = await loadLeaflet();
    const element = document.createElement('div');
    document.body.append(element);
    const map = createBaseMap(L, element, { onlyVietnam: false });
    map.fitBounds(VIETNAM_BOUNDS);
    expect(element.querySelector('path.dsv-land-mask')).toBeNull();
    expect(map.getPane(LAND_MASK_PANE)).toBeUndefined();
    map.remove();
  });
});
