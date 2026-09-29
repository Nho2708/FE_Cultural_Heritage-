import { useEffect, useRef } from 'react';
import { createBaseMap, loadLeaflet, pinIcon } from './leafletBase';

// Bản đồ nhỏ ở trang chi tiết di sản: nền OpenStreetMap, một ghim đang chọn và tên địa phương bên cạnh. Không cuộn chuột
// để phóng (không kẹt cuộn trang); trên màn hình cảm ứng tắt kéo bản đồ một ngón để trang vẫn cuộn được.
// Mặc định export để nạp bằng React.lazy.

interface LocationMapProps {
  latitude: number;
  longitude: number;
  /** Tên địa phương hiện cạnh ghim. */
  label: string | null;
}

export default function LocationMap({ latitude, longitude, label }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let created: { remove: () => void } | null = null;
    void loadLeaflet().then((L) => {
      const element = containerRef.current;
      if (cancelled || !element) return;
      const map = createBaseMap(L, element, { scrollWheelZoom: false });
      created = map;
      if (L.Browser.mobile) map.dragging.disable();
      map.setView([latitude, longitude], 7);
      const marker = L.marker([latitude, longitude], { icon: pinIcon(L, true), interactive: false, keyboard: false }).addTo(map);
      if (label) {
        const text = document.createElement('span');
        text.textContent = label; // đặt bằng textContent, không chèn HTML
        marker.bindTooltip(text, { permanent: true, direction: 'right', offset: [24, 0], className: 'dsv-map-tooltip' });
      }
    });
    return () => {
      cancelled = true;
      created?.remove();
    };
  }, [latitude, longitude, label]);

  return <div ref={containerRef} className="size-full bg-surface-container-low" />;
}
