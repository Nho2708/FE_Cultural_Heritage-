// Quần đảo Hoàng Sa và quần đảo Trường Sa thuộc Việt Nam: luôn vẽ đè lên mọi bản đồ nền của web học tập (bản đồ di sản
// và bản đồ nhỏ ở trang chi tiết), có nhãn "(Việt Nam)" và các đảo chính, bất kể bản đồ nền tự vẽ gì ở khu vực này.
// Tọa độ các đảo làm tròn tới phần trăm độ, đủ để chấm vị trí ở mức thu phóng của bản đồ cả nước.

export interface Island {
  name: string;
  latitude: number;
  longitude: number;
}

export interface Archipelago {
  key: 'hoang-sa' | 'truong-sa';
  /** Nhãn hiển thị trên bản đồ. */
  label: string;
  /** Vị trí đặt nhãn (nằm cạnh cụm đảo, không đè lên đảo). */
  labelAt: [latitude: number, longitude: number];
  islands: Island[];
}

export const VIETNAM_ARCHIPELAGOS: readonly Archipelago[] = [
  {
    key: 'hoang-sa',
    label: 'Quần đảo Hoàng Sa (Việt Nam)',
    labelAt: [17.35, 112.0],
    islands: [
      { name: 'Đảo Hoàng Sa', latitude: 16.53, longitude: 111.61 },
      { name: 'Đảo Quang Ảnh', latitude: 16.45, longitude: 111.52 },
      { name: 'Đảo Quang Hòa', latitude: 16.47, longitude: 111.7 },
      { name: 'Đảo Cây', latitude: 16.98, longitude: 112.26 },
      { name: 'Đảo Phú Lâm', latitude: 16.83, longitude: 112.34 },
      { name: 'Đảo Linh Côn', latitude: 16.67, longitude: 112.73 },
    ],
  },
  {
    key: 'truong-sa',
    label: 'Quần đảo Trường Sa (Việt Nam)',
    labelAt: [12.15, 114.35],
    islands: [
      { name: 'Đảo Song Tử Tây', latitude: 11.43, longitude: 114.33 },
      { name: 'Đảo Sơn Ca', latitude: 10.38, longitude: 114.48 },
      { name: 'Đảo Nam Yết', latitude: 10.18, longitude: 114.37 },
      { name: 'Đảo Sinh Tồn', latitude: 9.89, longitude: 114.33 },
      { name: 'Đảo Trường Sa', latitude: 8.64, longitude: 111.92 },
      { name: 'Đảo An Bang', latitude: 7.88, longitude: 112.92 },
    ],
  },
];

/** Nhãn vùng biển, đặt giữa hai quần đảo. */
export const EAST_SEA_LABEL = { text: 'BIỂN ĐÔNG', at: [14.0, 113.2] as [number, number] };

/** Khung nhìn mặc định của bản đồ cả nước: đủ phần đất liền và cả hai quần đảo. */
export const VIETNAM_BOUNDS: [[number, number], [number, number]] = [
  [6.6, 102.0],
  [23.8, 116.6],
];
