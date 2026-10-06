import type { ContentStatus, HeritageDetail, HeritageInput, HeritageType, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import {
  HERITAGE_STATUS_LABEL,
  HERITAGE_TYPE_LABEL,
  parseDecimal,
  parseInteger,
  RECOGNITION_LEVEL_LABEL,
  trimToNull,
  type HeritageField,
  type HeritageValues,
} from '@dsvhvn/dung-chung';

// Giá trị các ô của tab Thông tin chung ⇄ dữ liệu gửi và nhận của API. Mọi ô là chuỗi; số được đổi khi gửi.

export const EMPTY_HERITAGE: HeritageValues = {
  name: '',
  slug: '',
  shortDescription: '',
  content: '',
  heritageType: '',
  recognitionLevel: '',
  recognizedYear: '',
  provinceId: '',
  address: '',
  latitude: '',
  longitude: '',
  placeId: '',
};

export const HERITAGE_FIELDS = Object.keys(EMPTY_HERITAGE) as HeritageField[];

const text = (value: string | number | null | undefined) => (value === null || value === undefined ? '' : String(value));

export function heritageValuesOf(detail: HeritageDetail): HeritageValues {
  return {
    name: text(detail.name),
    slug: text(detail.slug),
    shortDescription: text(detail.shortDescription),
    content: text(detail.content),
    heritageType: text(detail.heritageType),
    recognitionLevel: text(detail.recognitionLevel),
    recognizedYear: text(detail.recognizedYear),
    provinceId: text(detail.province?.id),
    address: text(detail.address),
    latitude: text(detail.latitude),
    longitude: text(detail.longitude),
    placeId: text(detail.placeId),
  };
}

const finite = (n: number | null): number | null => (n === null || Number.isNaN(n) ? null : n);

/** Nội dung không cắt khoảng trắng giữa các đoạn (Markdown), chỉ coi chuỗi toàn khoảng trắng là rỗng. */
const contentOrNull = (value: string) => (value.trim() === '' ? null : value.trim());

export function heritageBody(values: HeritageValues): HeritageInput {
  return {
    name: values.name.trim(),
    slug: trimToNull(values.slug),
    shortDescription: trimToNull(values.shortDescription),
    content: contentOrNull(values.content),
    heritageType: (trimToNull(values.heritageType) as HeritageType | null) ?? null,
    recognitionLevel: (trimToNull(values.recognitionLevel) as RecognitionLevel | null) ?? null,
    recognizedYear: finite(parseInteger(values.recognizedYear)),
    provinceId: finite(parseInteger(values.provinceId)),
    address: trimToNull(values.address),
    latitude: finite(parseDecimal(values.latitude)),
    longitude: finite(parseDecimal(values.longitude)),
    placeId: trimToNull(values.placeId),
  };
}

/** Hai bộ giá trị gửi lên như nhau thì không có thay đổi chưa lưu. */
export function sameHeritage(a: HeritageValues, b: HeritageValues): boolean {
  return JSON.stringify(heritageBody(a)) === JSON.stringify(heritageBody(b));
}

// ---------------------------------------------------------------------------------------------------------------
// Tab và điều kiện xuất bản

export type EditorTab = 'thong-tin' | 'anh' | 'dong-thoi-gian' | 'nguon' | 'ban-dich' | 'mo-hinh-3d';

export const EDITOR_TABS: ReadonlyArray<{ id: EditorTab; label: string }> = [
  { id: 'thong-tin', label: 'Thông tin chung' },
  { id: 'anh', label: 'Ảnh và media' },
  { id: 'dong-thoi-gian', label: 'Dòng thời gian' },
  { id: 'nguon', label: 'Nguồn tham chiếu' },
  { id: 'ban-dich', label: 'Bản dịch và tóm tắt' },
  { id: 'mo-hinh-3d', label: 'Mô hình 3D' },
];

export function readTab(value: string | null): EditorTab {
  return EDITOR_TABS.find((t) => t.id === value)?.id ?? 'thong-tin';
}

/** Tab chứa chỗ sửa điều kiện xuất bản còn thiếu (khóa trường của backend). */
export function tabOfMissing(field: string): EditorTab {
  return field === 'references' ? 'nguon' : 'thong-tin';
}

/** Khóa `errors` của backend (kể cả "coordinates") sang ô của biểu mẫu. */
export function formFieldOf(key: string): HeritageField | null {
  if (key === 'coordinates') return 'latitude';
  return (HERITAGE_FIELDS as string[]).includes(key) ? (key as HeritageField) : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Danh sách chọn

export const HERITAGE_TYPES = Object.keys(HERITAGE_TYPE_LABEL) as HeritageType[];
export const RECOGNITION_LEVELS = Object.keys(RECOGNITION_LEVEL_LABEL) as RecognitionLevel[];
export const CONTENT_STATUSES = Object.keys(HERITAGE_STATUS_LABEL) as ContentStatus[];

export const HERITAGE_TYPE_OPTIONS = HERITAGE_TYPES.map((value) => ({ value, label: HERITAGE_TYPE_LABEL[value] }));
export const RECOGNITION_LEVEL_OPTIONS = RECOGNITION_LEVELS.map((value) => ({
  value,
  label: RECOGNITION_LEVEL_LABEL[value],
}));
