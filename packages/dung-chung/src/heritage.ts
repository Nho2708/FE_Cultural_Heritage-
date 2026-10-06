import type { ContentStatus, HeritageType, MediaType, RecognitionLevel, ReferenceSourceType } from './api/heritage';
import type { TranslationKind, TranslationState, TranslationStatus } from './api/translations';

// Nhãn giao diện chỉ tiếng Việt cho các enum của kho di sản. CSDL và API giữ giá trị enum viết HOA.

export const HERITAGE_TYPE_LABEL: Record<HeritageType, string> = {
  TANGIBLE: 'Vật thể',
  INTANGIBLE: 'Phi vật thể',
  NATURAL: 'Thiên nhiên',
  MIXED: 'Hỗn hợp',
  DOCUMENTARY: 'Tư liệu',
};

export const RECOGNITION_LEVEL_LABEL: Record<RecognitionLevel, string> = {
  UNESCO: 'Di sản thế giới (UNESCO)',
  NATIONAL_SPECIAL: 'Quốc gia đặc biệt',
  NATIONAL: 'Quốc gia',
  PROVINCIAL: 'Cấp tỉnh',
  NONE: 'Chưa xếp hạng',
};

/** Nhãn trạng thái nội dung của di sản (bài học dùng chung enum nhưng gọi DRAFT/ARCHIVED là Nháp/Lưu trữ). */
export const HERITAGE_STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Đã ẩn',
};

/** Tình trạng bản dịch của cả di sản (cột và bộ lọc ở Quản lý di sản, dải nhắc sau khi xuất bản). */
export const TRANSLATION_STATE_LABEL: Record<TranslationState, string> = {
  NONE: 'Chưa dịch',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  OUTDATED: 'Cần dịch lại',
};

/** Trạng thái của một bản dịch hoặc tóm tắt. */
export const TRANSLATION_STATUS_LABEL: Record<TranslationStatus, string> = {
  MACHINE: 'Bản dịch máy',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
};

export const TRANSLATION_KIND_LABEL: Record<TranslationKind, string> = {
  TRANSLATION: 'Bản dịch',
  SUMMARY: 'Tóm tắt',
};

/** Phần nội dung của mỗi loại, hiện dưới nhãn loại ở hàng chờ duyệt. */
export const TRANSLATION_KIND_HINT: Record<TranslationKind, string> = {
  TRANSLATION: 'Mô tả ngắn, nội dung, giai đoạn, sự kiện, chú thích ảnh',
  SUMMARY: 'Bản ngắn và bản chi tiết',
};

export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  IMAGE: 'Ảnh',
  VIDEO: 'Video',
  AUDIO: 'Âm thanh',
};

export const REFERENCE_SOURCE_LABEL: Record<ReferenceSourceType, string> = {
  GOV_DOC: 'Văn bản nhà nước',
  WEBSITE: 'Website',
  BOOK: 'Sách',
};

/** Giấy phép ảnh được dùng, gợi ý trong ô nhập (người dùng vẫn gõ được số phiên bản khác). */
export const LICENSE_SUGGESTIONS = [
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'CC0 1.0',
  'Phạm vi công cộng',
  'Ảnh nhóm tự chụp',
] as const;

/**
 * Tiêu đề nguồn theo mẫu của nhóm: "Tên tài liệu — Cơ quan hoặc tác giả, truy cập dd/mm/yyyy". Cơ quan hoặc ngày
 * truy cập bỏ trống thì bỏ phần tương ứng. Backend chỉ lưu một chuỗi tiêu đề nên giao diện ghép và tách lại.
 */
export function composeReferenceTitle(parts: { name: string; agency: string; accessedOn: string }): string {
  const name = parts.name.trim();
  const agency = parts.agency.trim();
  const accessedOn = parts.accessedOn.trim();
  if (agency && accessedOn) return `${name} — ${agency}, truy cập ${accessedOn}`;
  if (agency) return `${name} — ${agency}`;
  if (accessedOn) return `${name} — truy cập ${accessedOn}`;
  return name;
}

/** Tách tiêu đề đã ghép; tiêu đề không theo mẫu thì đưa hết vào tên tài liệu. `composeReferenceTitle` ghép lại đúng nguyên văn. */
export function parseReferenceTitle(title: string | null | undefined): { name: string; agency: string; accessedOn: string } {
  const text = title ?? '';
  const full = text.match(/^(.*) — (.*), truy cập (\d{1,2}\/\d{1,2}\/\d{4})$/);
  if (full) return { name: full[1]!, agency: full[2]!, accessedOn: full[3]! };
  const dateOnly = text.match(/^(.*) — truy cập (\d{1,2}\/\d{1,2}\/\d{4})$/);
  if (dateOnly) return { name: dateOnly[1]!, agency: '', accessedOn: dateOnly[2]! };
  const agencyOnly = text.match(/^(.*) — (.*)$/);
  if (agencyOnly) return { name: agencyOnly[1]!, agency: agencyOnly[2]!, accessedOn: '' };
  return { name: text, agency: '', accessedOn: '' };
}

/** Năm của giai đoạn hoặc sự kiện: số âm là trước Công nguyên ("-258" hiện "258 TCN"). */
export function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} TCN` : String(year);
}

/** Ngày của sự kiện theo mức chi tiết có: "1805", "08/1805", "12/08/1805". */
export function formatEventDate(year: number, month: number | null, day: number | null): string {
  const y = formatYear(year);
  if (month == null) return y;
  const mm = String(month).padStart(2, '0');
  if (day == null) return `${mm}/${y}`;
  return `${String(day).padStart(2, '0')}/${mm}/${y}`;
}

/** Khoảng thời gian của sự kiện: "1805 – 1832"; chỉ có mốc bắt đầu thì hiện mốc đó. */
export function formatEventRange(event: {
  startYear: number;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
}): string {
  const start = formatEventDate(event.startYear, event.startMonth, event.startDay);
  if (event.endYear == null) return start;
  return `${start} – ${formatEventDate(event.endYear, event.endMonth, event.endDay)}`;
}

/** Khoảng năm của giai đoạn: "1802 – 1833", "Từ 1993", "Đến 1775"; không có năm nào thì chuỗi rỗng. */
export function formatTimelineRange(startYear: number | null, endYear: number | null): string {
  if (startYear != null && endYear != null) return `${formatYear(startYear)} – ${formatYear(endYear)}`;
  if (startYear != null) return `Từ ${formatYear(startYear)}`;
  if (endYear != null) return `Đến ${formatYear(endYear)}`;
  return '';
}
