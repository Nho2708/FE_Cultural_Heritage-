import type { HeritageMedia, MediaInput, MediaType } from '@dsvhvn/dung-chung/api';
import { parseInteger, trimToNull, type MediaField, type MediaValues } from '@dsvhvn/dung-chung';

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
