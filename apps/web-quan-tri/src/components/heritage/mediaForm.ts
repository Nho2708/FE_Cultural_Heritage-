import type { HeritageMedia, MediaInput, MediaType } from '@dsvhvn/dung-chung/api';
import { parseInteger, trimToNull, type MediaField, type MediaUploadField, type MediaValues } from '@dsvhvn/dung-chung';

// Giá trị các ô của biểu mẫu ảnh, video, âm thanh (ghi công đủ ba phần: tác giả, giấy phép, nguồn).

export const EMPTY_MEDIA: MediaValues = {
  mediaType: 'IMAGE',
  url: '',
  caption: '',
  author: '',
  license: '',
  source: '',
  sortOrder: '',
};

export const MEDIA_FIELDS = Object.keys(EMPTY_MEDIA) as MediaField[];

/** Các khóa lỗi của biểu mẫu tải ảnh lên: ghi công, chú thích, thứ tự và tệp (khóa `file` của backend). */
export const MEDIA_UPLOAD_FIELDS: readonly MediaUploadField[] = ['caption', 'author', 'license', 'source', 'sortOrder', 'file'];

export function mediaValuesOf(media: HeritageMedia): MediaValues {
  return {
    mediaType: media.mediaType ?? 'IMAGE',
    url: media.url ?? '',
    caption: media.caption ?? '',
    author: media.author ?? '',
    license: media.license ?? '',
    source: media.source ?? '',
    sortOrder: media.sortOrder === null ? '' : String(media.sortOrder),
  };
}

/** `setAsThumbnail` bỏ qua thì không đổi ảnh đại diện. */
export function mediaBody(values: MediaValues, setAsThumbnail?: boolean): MediaInput {
  const order = parseInteger(values.sortOrder);
  return {
    mediaType: values.mediaType.trim() as MediaType,
    url: values.url.trim(),
    caption: trimToNull(values.caption),
    author: values.author.trim(),
    license: values.license.trim(),
    source: values.source.trim(),
    sortOrder: order === null || Number.isNaN(order) ? null : order,
    ...(setAsThumbnail === undefined ? {} : { setAsThumbnail }),
  };
}

/**
 * Nội dung multipart của biểu mẫu tải ảnh lên: tệp cùng ghi công và chú thích. Loại luôn là ảnh và đường dẫn do hệ thống
 * sinh nên không gửi hai thứ đó. `setAsThumbnail` bỏ qua thì không đổi ảnh đại diện.
 */
export function mediaUploadBody(values: MediaValues, file: File, setAsThumbnail?: boolean): FormData {
  const form = new FormData();
  form.set('file', file);
  form.set('author', values.author.trim());
  form.set('license', values.license.trim());
  form.set('source', values.source.trim());
  const caption = trimToNull(values.caption);
  if (caption !== null) form.set('caption', caption);
  const order = parseInteger(values.sortOrder);
  if (order !== null && !Number.isNaN(order)) form.set('sortOrder', String(order));
  if (setAsThumbnail !== undefined) form.set('setAsThumbnail', String(setAsThumbnail));
  return form;
}
