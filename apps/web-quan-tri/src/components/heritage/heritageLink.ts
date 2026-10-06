import { LEARNING_WEB_URL } from '../../config/env';

/** Trang chi tiết di sản đã xuất bản trên web học tập (công khai). */
export const heritagePublicLink = (slug: string) => `${LEARNING_WEB_URL}/di-san/${encodeURIComponent(slug)}`;

/** Trang xem trước bản nháp trên web học tập: `path` là đường dẫn máy chủ trả kèm mã xem trước. */
export const heritagePreviewLink = (path: string) => `${LEARNING_WEB_URL}${path}`;
