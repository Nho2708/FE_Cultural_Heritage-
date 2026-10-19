import type * as Leaflet from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { createBaseMap, loadLeaflet, pinIcon, type LeafletLib, type MapLabels } from '@dsvhvn/dung-chung/map/base';
import type { Route } from '@dsvhvn/dung-chung/map/route';
import { drawRoute } from '@dsvhvn/dung-chung/map/route-layer';

// Bản đồ nhỏ ở trang chi tiết di sản: nền OpenStreetMap, một ghim đang chọn và tên địa phương bên cạnh. Không cuộn chuột
// để phóng (không kẹt cuộn trang); trên màn hình cảm ứng tắt kéo bản đồ một ngón để trang vẫn cuộn được.
// Có tuyến đường (khách bấm "Chỉ đường") thì vẽ tuyến và chấm xuất phát, khớp khung nhìn theo tuyến và cho kéo, phóng để xem đường đi.
// Mặc định export để nạp bằng React.lazy.

interface LocationMapProps {
  latitude: number;
  longitude: number;
  /** Tên địa phương hiện cạnh ghim. */
  label: string | null;
  /** Chữ trên bản đồ theo ngôn ngữ giao diện; đổi ngôn ngữ thì phần tử cha đổi `key`. */
  labels?: MapLabels;
  /** Tuyến đường tới di sản (null khi chưa chỉ đường). */
  route?: Route | null;
  /** Tên chấm xuất phát của tuyến. */
  startLabel?: string;
}

interface Engine {
  L: LeafletLib;
  map: Leaflet.Map;
}

export default function LocationMap({ latitude, longitude, label, labels, route = null, startLabel = 'Vị trí của bạn' }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef(labels);
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: Leaflet.Map | null = null;
    void loadLeaflet().then((L) => {
      const element = containerRef.current;
      if (cancelled || !element) return;
      const map = createBaseMap(L, element, { scrollWheelZoom: false, labels: labelsRef.current });
      created = map;
      if (L.Browser.mobile) map.dragging.disable();
      map.setView([latitude, longitude], 7);
      const marker = L.marker([latitude, longitude], { icon: pinIcon(L, true), interactive: false, keyboard: false }).addTo(map);
      if (label) {
        const text = document.createElement('span');
        text.textContent = label; // đặt bằng textContent, không chèn HTML
        marker.bindTooltip(text, { permanent: true, direction: 'right', offset: [24, 0], className: 'dsv-map-tooltip' });
      }
      setEngine({ L, map });
    });
    return () => {
      cancelled = true;
      created?.remove();
      setEngine(null);
    };
  }, [latitude, longitude, label]);

  // Tuyến đường: vẽ lên lớp riêng, khớp khung theo tuyến, mở kéo và phóng; bỏ tuyến thì quay về khung quanh di sản.
  useEffect(() => {
    if (!engine || !route) return;
    const { L, map } = engine;
    map.invalidateSize(); // khung bản đồ cao hơn khi có tuyến; đo lại trước khi khớp khung
    const layer = drawRoute(L, map, route, { startLabel, padding: [56, 56] }); // đệm rộng để nhãn chấm xuất phát không bị cắt ở mép
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    return () => {
      layer.remove();
      map.scrollWheelZoom.disable();
      if (L.Browser.mobile) map.dragging.disable();
      map.setView([latitude, longitude], 7);
    };
  }, [engine, route, startLabel, latitude, longitude]);

  return <div ref={containerRef} className="size-full bg-surface-container-low" />;
}
