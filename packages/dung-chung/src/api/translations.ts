import type { LanguageCode } from './discovery';
import type { Paged } from './types';

// Kiểu dữ liệu của luồng Đa ngôn ngữ phía quản trị hệ thống: bảng bản dịch và tóm tắt của một di sản (tab Bản dịch và tóm tắt),
// hàng chờ duyệt (màn hình Duyệt bản dịch và tóm tắt), nội dung hai cột để duyệt và sửa tại chỗ. Trạng thái viết HOA như CSDL.

/** Ngôn ngữ ngoài tiếng Việt: có bản dịch nội dung. Tiếng Việt chỉ có tóm tắt. */
export type TranslationLanguage = Exclude<LanguageCode, 'vi'>;

/** Bản dịch nội dung hay bản tóm tắt: hai đơn vị duyệt của mỗi (di sản, ngôn ngữ). */
export type TranslationKind = 'TRANSLATION' | 'SUMMARY';

/** Phạm vi một lần duyệt hoặc từ chối: bản dịch, tóm tắt, hoặc cả hai của cùng một ngôn ngữ. */
export type ReviewScope = TranslationKind | 'BOTH';

/** `MACHINE` bản dịch máy (hiện ngay, kèm nhãn); `PENDING` chờ duyệt (chưa hiện); `APPROVED` đã duyệt (hiện); `REJECTED` bị từ chối (không hiện). */
export type TranslationStatus = 'MACHINE' | 'PENDING' | 'APPROVED' | 'REJECTED';

/** Tình trạng bản dịch của cả di sản ở danh sách Quản lý di sản. */
export type TranslationState = 'NONE' | 'PENDING' | 'APPROVED' | 'OUTDATED';

/** Tab của màn hình Duyệt bản dịch và tóm tắt. */
export type QueueTab = 'PENDING' | 'APPROVED' | 'MACHINE' | 'REJECTED';

/** Một ô của bảng năm ngôn ngữ × hai đơn vị duyệt. `status` null là chưa có bản. */
export interface TranslationCell {
  kind: TranslationKind;
  language: LanguageCode;
  languageLabel: string;
  status: TranslationStatus | null;
  /** Nội dung tiếng Việt đã sửa sau lần dịch: bản cũ vẫn hiện tới khi dịch lại. */
  isOutdated: boolean;
  /** Nhãn hiển thị: Chưa có, Bản dịch máy, Chờ duyệt, Đã duyệt, Bị từ chối, Cần dịch lại. */
  label: string;
  createdAt: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
  reviewedByName: string | null;
}

export interface TranslationOverview {
  heritageId: number;
  name: string;
  /** Bấm được "Dịch và tóm tắt bằng AI" hay không; không thì `cannotGenerateReason` nói lý do. */
  canGenerate: boolean;
  cannotGenerateReason: string | null;
  outdatedCount: number;
  outdatedNotice: string | null;
  /** Bốn ô: en, ko, zh-Hans, ja. */
  translations: TranslationCell[];
  /** Năm ô: vi, en, ko, zh-Hans, ja. */
  summaries: TranslationCell[];
}

export interface TranslationCounts {
  pending: number;
  approved: number;
  machine: number;
  outdated: number;
}

export interface TranslationQueueItem {
  heritageId: number;
  heritageName: string;
  slug: string;
  kind: TranslationKind;
  language: LanguageCode;
  languageLabel: string;
  status: TranslationStatus;
  isOutdated: boolean;
  requestedAt: string | null;
  reviewedAt: string | null;
}

export interface TranslationQueueQuery {
  tab?: QueueTab;
  heritageId?: number;
  language?: LanguageCode;
  kind?: TranslationKind;
  page?: number;
  pageSize?: number;
}

export type TranslationQueuePage = Paged<TranslationQueueItem>;

export interface TimelineText {
  id: number;
  name: string | null;
  description: string | null;
}

export interface EventText {
  id: number;
  timelineId: number;
  name: string | null;
  description: string | null;
}

/** `eventId` có khi ảnh thuộc sự kiện, null khi ảnh thuộc di sản. */
export interface MediaText {
  id: number;
  eventId: number | null;
  caption: string | null;
}

/** Mọi phần chữ của một di sản ở một ngôn ngữ; dùng cho cả bản gốc tiếng Việt và bản dịch (phần chưa dịch là null). */
export interface TranslationText {
  name: string | null;
  shortDescription: string | null;
  content: string | null;
  address: string | null;
  timelines: TimelineText[];
  events: EventText[];
  media: MediaText[];
}

interface DetailBase {
  heritageId: number;
  heritageName: string;
  slug: string;
  language: LanguageCode;
  languageLabel: string;
  status: TranslationStatus;
  isOutdated: boolean;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

/** Hai cột để duyệt bản dịch: bản gốc tiếng Việt bên trái, bản dịch bên phải. */
export interface TranslationDetail extends DetailBase {
  original: TranslationText;
  translated: TranslationText;
}

export interface SummaryText {
  shortText: string;
  detailedText: string;
}

/** Tóm tắt để xem và duyệt: `original` là nội dung tiếng Việt của di sản, `viSummary` là tóm tắt tiếng Việt (null khi chính nó là tiếng Việt hoặc chưa có). */
export interface SummaryDetail extends DetailBase {
  original: TranslationText;
  viSummary: SummaryText | null;
  summary: SummaryText;
}

/** Sửa chữ bản dịch tiếng Anh tại chỗ: phần có trong yêu cầu thay giá trị cũ, phần bỏ trống giữ nguyên. */
export interface UpdateTranslationInput {
  name?: string | null;
  shortDescription?: string | null;
  content?: string | null;
  address?: string | null;
  timelines?: Array<{ id: number; name?: string | null; description?: string | null }>;
  events?: Array<{ id: number; timelineId: number; name?: string | null; description?: string | null }>;
  media?: Array<{ id: number; caption?: string | null }>;
}

export interface UpdateSummaryInput {
  shortText?: string | null;
  detailedText?: string | null;
}

/** Kết quả duyệt hoặc từ chối: tổng quan mới, và cờ cho biết bản Hàn, Trung, Nhật có được dịch lại từ bản tiếng Anh đã duyệt không (lỗi ở bước đó chỉ trả cảnh báo). */
export interface ReviewResult {
  overview: TranslationOverview;
  machineTranslationsRefreshed: boolean;
  warning: string | null;
}
