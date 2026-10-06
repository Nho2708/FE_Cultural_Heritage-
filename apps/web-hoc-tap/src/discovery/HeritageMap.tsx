import type { HeritagePin } from '@dsvhvn/dung-chung/api';
import type * as Leaflet from 'leaflet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MAP_LABELS_VI, clusterIcon, createBaseMap, loadLeaflet, pinIcon, type LeafletLib, type MapLabels } from '@dsvhvn/dung-chung/map/base';
import { VIETNAM_BOUNDS } from '@dsvhvn/dung-chung/map/seas';

// Bản đồ di sản: nền OpenStreetMap, ghim theo tọa độ (gom nhóm khi gần nhau), popup của ghim đang chọn dựng bằng React
// (portal vào khung popup của Leaflet). Vị trí chọn nằm trên địa chỉ trang (`chon=<slug>`) nên phần tử cha là nguồn
// sự thật; component chỉ báo `onSelect`. Mặc định export để nạp bằng React.lazy (Leaflet không vào gói chính).

interface Engine {
  L: LeafletLib;
  map: Leaflet.Map;
  cluster: Leaflet.MarkerClusterGroup;
}

interface HeritageMapProps {
  pins: HeritagePin[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  /** Đổi giá trị này (mỗi lần dữ liệu ghim mới về) thì bản đồ căn lại khung nhìn. */
  fitKey: string;
  /** Đang lọc thì căn theo các ghim tìm được; không lọc thì hiện toàn cảnh cả nước và hai quần đảo. */
  fitToPins: boolean;
  renderPopup: (pin: HeritagePin) => ReactNode;
  /** Chữ trên bản đồ theo ngôn ngữ giao diện; đổi ngôn ngữ thì phần tử cha đổi `key` để dựng lại bản đồ. */
  labels?: MapLabels;
  /** Tên hộp đóng popup (đọc cho trình đọc màn hình). */
  closeLabel?: string;
  /** Vị trí của khách ("Gần bạn"): vẽ một chấm tại đó và đưa bản đồ tới đó. Chỉ nằm trong bộ nhớ của trang, không lưu. */
  userPosition?: { latitude: number; longitude: number } | null;
  /** Tên của chấm vị trí (đọc cho trình đọc màn hình). */
  userLabel?: string;
  /** Tên vùng bản đồ (đọc cho trình đọc màn hình). */
  mapLabel?: string;
}

export default function HeritageMap({
  pins,
  selectedSlug,
  onSelect,
  fitKey,
  fitToPins,
  renderPopup,
  labels = MAP_LABELS_VI,
  closeLabel = 'Đóng thẻ di sản',
  mapLabel = 'Bản đồ di sản',
  userPosition = null,
  userLabel = 'Vị trí của bạn',
}: HeritageMapProps) {
  const labelsRef = useRef(labels);
  const closeLabelRef = useRef(closeLabel);
  const containerRef = useRef<HTMLElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [popupNode, setPopupNode] = useState<HTMLElement | null>(null);
  const markers = useRef(new Map<string, Leaflet.Marker>());
  const shownSlug = useRef<string | null>(null);
  const popupRef = useRef<Leaflet.Popup | null>(null);
  const ignoreClose = useRef(false);
  const lastFitKey = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Dựng bản đồ một lần; dọn khi rời trang.
  useEffect(() => {
    const markerMap = markers.current;
    let cancelled = false;
    let created: Leaflet.Map | null = null;
    void loadLeaflet().then((L) => {
      const element = containerRef.current;
      if (cancelled || !element) return;
      const map = createBaseMap(L, element, { labels: labelsRef.current });
      created = map;
      map.fitBounds(VIETNAM_BOUNDS);
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 48,
        iconCreateFunction: (group) => clusterIcon(L, group.getChildCount()),
      });
      map.addLayer(cluster);
      map.on('popupclose', () => {
        if (!ignoreClose.current) onSelectRef.current(null);
      });
      setEngine({ L, map, cluster });
    });
    return () => {
      cancelled = true;
      created?.remove();
      markerMap.clear();
      shownSlug.current = null;
      lastFitKey.current = null;
      setEngine(null);
      setPopupNode(null);
    };
  }, []);

  // Ghim theo dữ liệu.
  useEffect(() => {
    if (!engine) return;
    const { L, cluster } = engine;
    cluster.clearLayers();
    markers.current.clear();
    for (const pin of pins) {
      const marker = L.marker([pin.latitude, pin.longitude], { icon: pinIcon(L, false), title: pin.name, keyboard: true });
      marker.on('add', () => marker.getElement()?.setAttribute('aria-label', pin.name));
      marker.on('click', () => onSelectRef.current(pin.slug));
      markers.current.set(pin.slug, marker);
    }
    cluster.addLayers([...markers.current.values()]);
    shownSlug.current = null; // ghim mới: lần chọn kế tiếp dựng lại popup
  }, [engine, pins]);

  // Vị trí của khách: một chấm xanh có viền trắng, rồi đưa bản đồ tới đó (phóng vừa đủ thấy vùng quanh bạn).
  useEffect(() => {
    if (!engine || !userPosition) return;
    const { L, map } = engine;
    const at: [number, number] = [userPosition.latitude, userPosition.longitude];
    const dot = L.circleMarker(at, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#1a56db', fillOpacity: 1 }).addTo(map);
    dot.bindTooltip(userLabel, { direction: 'top', offset: [0, -8] });
    dot.getElement()?.setAttribute('aria-label', userLabel);
    map.setView(at, 11);
    return () => {
      dot.remove();
    };
  }, [engine, userPosition, userLabel]);

  // Căn khung nhìn khi dữ liệu mới về (không đè lên ghim đang được chọn từ địa chỉ trang).
  useEffect(() => {
    if (!engine || lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    const { L, map } = engine;
    if (selectedSlug && pins.some((pin) => pin.slug === selectedSlug)) return;
    if (fitToPins && pins.length > 0) {
      map.fitBounds(L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])), { padding: [72, 72], maxZoom: 9 });
    } else {
      map.fitBounds(VIETNAM_BOUNDS);
    }
    // Chỉ theo fitKey: chọn ghim không được làm bản đồ nhảy lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, fitKey]);

  // Ghim đang chọn: đổi kiểu ghim và mở popup.
  useEffect(() => {
    if (!engine) return;
    const { L, map, cluster } = engine;
    for (const [slug, marker] of markers.current) marker.setIcon(pinIcon(L, slug === selectedSlug));

    const pin = selectedSlug ? pins.find((item) => item.slug === selectedSlug) : undefined;
    const marker = pin ? markers.current.get(pin.slug) : undefined;
    if (!pin || !marker) {
      ignoreClose.current = true;
      map.closePopup();
      ignoreClose.current = false;
      shownSlug.current = null;
      setPopupNode(null);
      return;
    }
    if (shownSlug.current === pin.slug) return;
    shownSlug.current = pin.slug;
    marker.setZIndexOffset(1000);

    const node = document.createElement('div');
    const width = Math.min(360, (containerRef.current?.clientWidth ?? 400) - 48);
    const open = () => {
      ignoreClose.current = true;
      const popup = L.popup({
        className: 'dsv-popup',
        minWidth: Math.min(300, width),
        maxWidth: width,
        offset: [0, -20],
        autoPanPaddingTopLeft: [24, window.innerWidth >= 841 ? 168 : 104],
        autoPanPaddingBottomRight: [24, window.innerWidth >= 841 ? 200 : 24],
      })
        .setLatLng([pin.latitude, pin.longitude])
        .setContent(node);
      popup.openOn(map);
      popupRef.current = popup;
      ignoreClose.current = false;
      popup.getElement()?.querySelector('.leaflet-popup-close-button')?.setAttribute('aria-label', closeLabelRef.current);
      setPopupNode(node);
    };
    // Ghim đang nằm trong nhóm thì phóng tới khi tách ra rồi mới mở popup.
    cluster.zoomToShowLayer(marker, open);
  }, [engine, pins, selectedSlug]);

  // Nội dung popup do React dựng sau khi Leaflet đã mở khung: đo lại kích thước và cuộn bản đồ cho vừa popup.
  useEffect(() => {
    if (popupNode) popupRef.current?.update();
  }, [popupNode]);

  const selected = selectedSlug ? pins.find((pin) => pin.slug === selectedSlug) : undefined;
  return (
    <>
      <section ref={containerRef} aria-label={mapLabel} className="size-full bg-surface-container-low" />
      {popupNode && selected && createPortal(renderPopup(selected), popupNode)}
    </>
  );
}
