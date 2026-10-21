import { pathOf } from '../access/screens';
import { FILTER_PARAM } from './filters';

// Đường dẫn tới một di sản cụ thể trên web học tập (slug được mã hóa để ký tự lạ không phá đường dẫn).

export const heritagePath = (slug: string) => `${pathOf('search')}/${encodeURIComponent(slug)}`;

export const timelinePath = (slug: string) => `${pathOf('timeline')}/${encodeURIComponent(slug)}`;

/** Bản đồ mở sẵn thẻ của di sản này. */
export const mapPathOf = (slug: string) => `${pathOf('map')}?${FILTER_PARAM.select}=${encodeURIComponent(slug)}`;

/** Tham số trên địa chỉ trang chi tiết để mở sẵn phần chỉ đường và cuộn tới đó. */
export const DIRECTIONS_PARAM = 'chi-duong';

/** Trang chi tiết với phần chỉ đường mở sẵn (từ thẻ di sản trên bản đồ). */
export const directionsPathOf = (slug: string) => `${heritagePath(slug)}?${DIRECTIONS_PARAM}=1`;
