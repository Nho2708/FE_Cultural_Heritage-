import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import { insideLimits, roundCoordinate, type CoordinateLimits } from './coordinates';
import { createBaseMap, loadLeaflet, pinIcon, type LeafletLib } from './leafletBase';
import { VIETNAM_BOUNDS } from './seas';

// Bản đồ chọn tọa độ ở biên tập di sản: nền OpenStreetMap dùng chung với bản đồ của web học tập (kèm hai quần đảo thuộc
// Việt Nam). Bấm lên bản đồ để đặt ghim, kéo ghim để chỉnh; ô nhập số bên ngoài vẫn là nơi nhập chính xác và là cách
// dùng bằng bàn phím. Tọa độ nằm ngoài khoảng cho phép thì không nhận và báo qua `onOutOfRange`.
// Mặc định export để nạp bằng React.lazy.

interface CoordinatePickerProps {
  /** Tọa độ đang có; null khi chưa chọn (hoặc ô nhập chưa hợp lệ). */
  latitude: number | null;
  longitude: number | null;
  limits: CoordinateLimits;
  onChange: (latitude: number, longitude: number) => void;
  /** Bấm hoặc thả ghim ra ngoài khoảng cho phép. */
  onOutOfRange?: () => void;
  disabled?: boolean;
  /** Tên đọc được của bản đồ cho trình đọc màn hình. */
  label?: string;
}

interface Pin {
  latitude: number;
  longitude: number;
  disabled: boolean;
}

export default function CoordinatePicker({
  latitude,
  longitude,
  limits,
  onChange,
  onOutOfRange,
  disabled = false,
  label = 'Bản đồ chọn tọa độ',
}: CoordinatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<((pin: Pin | null) => void) | null>(null);
  // Giá trị mới nhất cho các trình xử lý của Leaflet (đăng ký một lần lúc dựng bản đồ).
  const latest = useRef({ latitude, longitude, limits, onChange, onOutOfRange, disabled });
  useEffect(() => {
    latest.current = { latitude, longitude, limits, onChange, onOutOfRange, disabled };
  });

  const hasPoint = latitude !== null && longitude !== null && insideLimits(limits, latitude, longitude);
  const pin: Pin | null = hasPoint ? { latitude, longitude, disabled } : null;

  // Dựng bản đồ một lần.
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let marker: Leaflet.Marker | null = null;
    let lib: LeafletLib | null = null;

    /** Đưa ghim về đúng chỗ (tạo, di chuyển hoặc bỏ), khóa hoặc mở việc kéo ghim, và dời bản đồ nếu ghim ra ngoài khung. */
    const sync = (target: Pin | null) => {
      if (!lib || !map) return;
      if (!target) {
        marker?.remove();
        marker = null;
        return;
      }
      const at: [number, number] = [target.latitude, target.longitude];
      if (marker) {
        marker.setLatLng(at);
      } else {
        const created = lib.marker(at, { icon: pinIcon(lib, true), draggable: true, keyboard: false, title: 'Vị trí di sản' }).addTo(map);
        created.on('dragend', () => {
          const { limits: range, onChange: change, onOutOfRange: reject, latitude: oldLat, longitude: oldLng } = latest.current;
          const dropped = created.getLatLng();
          const nextLat = roundCoordinate(dropped.lat);
          const nextLng = roundCoordinate(dropped.wrap().lng);
          if (!insideLimits(range, nextLat, nextLng)) {
            if (oldLat !== null && oldLng !== null) created.setLatLng([oldLat, oldLng]);
            return reject?.();
          }
          change(nextLat, nextLng);
        });
        marker = created;
      }
      if (target.disabled) marker.dragging?.disable();
      else marker.dragging?.enable();
      if (!map.getBounds().contains(at)) map.panTo(at);
    };

    void loadLeaflet().then((L) => {
      const element = containerRef.current;
      if (cancelled || !element) return;
      lib = L;
      map = createBaseMap(L, element, { scrollWheelZoom: false });
      const first = latest.current;
      if (first.latitude !== null && first.longitude !== null && insideLimits(first.limits, first.latitude, first.longitude)) {
        map.setView([first.latitude, first.longitude], 12);
      } else {
        map.fitBounds(VIETNAM_BOUNDS);
      }

      map.on('click', (event: Leaflet.LeafletMouseEvent) => {
        const { disabled: off, limits: range, onChange: change, onOutOfRange: reject } = latest.current;
        if (off) return;
        const lat = roundCoordinate(event.latlng.lat);
        const lng = roundCoordinate(event.latlng.wrap().lng);
        if (!insideLimits(range, lat, lng)) return reject?.();
        change(lat, lng);
      });

      syncRef.current = sync;
      const current = latest.current;
      sync(
        current.latitude !== null && current.longitude !== null && insideLimits(current.limits, current.latitude, current.longitude)
          ? { latitude: current.latitude, longitude: current.longitude, disabled: current.disabled }
          : null,
      );
    });

    return () => {
      cancelled = true;
      syncRef.current = null;
      map?.remove();
    };
  }, []);

  // Ô nhập đổi tọa độ (hoặc khóa, mở biểu mẫu): cập nhật ghim. Chạy trước khi bản đồ sẵn sàng thì bỏ qua, lúc dựng xong tự đồng bộ.
  const pinLatitude = pin?.latitude ?? null;
  const pinLongitude = pin?.longitude ?? null;
  const pinDisabled = pin?.disabled ?? false;
  useEffect(() => {
    syncRef.current?.(pinLatitude === null || pinLongitude === null ? null : { latitude: pinLatitude, longitude: pinLongitude, disabled: pinDisabled });
  }, [pinLatitude, pinLongitude, pinDisabled]);

  return (
    <section
      ref={containerRef}
      aria-label={label}
      className="size-full bg-surface-container-low"
      style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
    />
  );
}
