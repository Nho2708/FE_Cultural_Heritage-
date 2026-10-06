import type { HeritageModel, HeritageModelInput, UpdateHeritageModelInput } from '@dsvhvn/dung-chung/api';
import { trimToNull, type ModelField, type ModelValues } from '@dsvhvn/dung-chung';

// Giá trị các ô của biểu mẫu mô hình 3D ⇄ dữ liệu gửi và nhận của API. Mọi ô là chuỗi. Dung lượng không bao giờ gửi: máy chủ tự đo.

export const EMPTY_MODEL: ModelValues = {
  title: '',
  fileUrl: '',
  posterUrl: '',
  author: '',
  license: '',
  licenseUrl: '',
  sourceUrl: '',
};

/** Các khóa lỗi của biểu mẫu mô hình (trùng tên trường của request, thêm `file` của tệp tải lên). */
export const MODEL_FIELDS: readonly ModelField[] = ['title', 'file', 'fileUrl', 'posterUrl', 'author', 'license', 'licenseUrl', 'sourceUrl'];

/** Khi sửa: đường dẫn tệp để trống nghĩa là giữ tệp hiện tại. */
export function modelValuesOf(model: HeritageModel): ModelValues {
  return {
    title: model.title ?? '',
    fileUrl: '',
    posterUrl: model.posterUrl ?? '',
    author: model.author,
    license: model.license,
    licenseUrl: model.licenseUrl ?? '',
    sourceUrl: model.sourceUrl ?? '',
  };
}

const info = (values: ModelValues) => ({
  title: trimToNull(values.title),
  posterUrl: trimToNull(values.posterUrl),
  author: values.author.trim(),
  license: values.license.trim(),
  licenseUrl: trimToNull(values.licenseUrl),
  sourceUrl: trimToNull(values.sourceUrl),
  sortOrder: null,
});

/** Khai báo bằng đường dẫn tệp đã có trong kho. */
export function modelPathBody(values: ModelValues, show: boolean): HeritageModelInput {
  return { ...info(values), fileUrl: values.fileUrl.trim(), show };
}

/** Sửa thông tin và ghi công; `fileUrl` null là giữ tệp. */
export function modelUpdateBody(values: ModelValues): UpdateHeritageModelInput {
  return { ...info(values), fileUrl: trimToNull(values.fileUrl) };
}

/** Nội dung multipart khi tải tệp lên và khai báo luôn: tệp cùng ghi công; chỉ gửi ô có giá trị. */
export function modelUploadBody(values: ModelValues, file: File, show: boolean): FormData {
  const form = new FormData();
  form.set('file', file);
  for (const [key, value] of Object.entries({
    title: trimToNull(values.title),
    posterUrl: trimToNull(values.posterUrl),
    author: values.author.trim(),
    license: values.license.trim(),
    licenseUrl: trimToNull(values.licenseUrl),
    sourceUrl: trimToNull(values.sourceUrl),
  })) {
    if (value !== null) form.set(key, value);
  }
  form.set('show', String(show));
  return form;
}

/** Nội dung multipart khi chỉ thay tệp. */
export function modelFileBody(file: File): FormData {
  const form = new FormData();
  form.set('file', file);
  return form;
}
