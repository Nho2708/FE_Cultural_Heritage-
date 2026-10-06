import type {
  LanguageCode,
  Paged,
  ReviewResult,
  SummaryDetail,
  TranslationCell,
  TranslationDetail,
  TranslationKind,
  TranslationOverview,
  TranslationQueueItem,
  TranslationStatus,
  TranslationText,
} from '@dsvhvn/dung-chung/api';

// Dữ liệu mẫu của luồng Đa ngôn ngữ phía quản trị hệ thống, cùng khuôn với phản hồi của backend (/api/v1/admin/translations).

const LABEL: Record<TranslationStatus, string> = { MACHINE: 'Bản dịch máy', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' };
const LANGUAGE_LABEL: Record<LanguageCode, string> = { vi: 'Tiếng Việt', en: 'English', ko: '한국어', 'zh-Hans': '简体中文', ja: '日本語' };

export function cellOf(kind: TranslationKind, language: LanguageCode, status: TranslationStatus | null, overrides: Partial<TranslationCell> = {}): TranslationCell {
  return {
    kind,
    language,
    languageLabel: LANGUAGE_LABEL[language],
    status,
    isOutdated: false,
    label: status ? LABEL[status] : 'Chưa có',
    createdAt: status ? '2026-10-04T14:40:00Z' : null,
    updatedAt: status ? '2026-10-04T14:40:00Z' : null,
    reviewedAt: status === 'APPROVED' ? '2026-10-02T03:00:00Z' : null,
    reviewedBy: status === 'APPROVED' ? 1 : null,
    reviewedByName: status === 'APPROVED' ? 'Lê Thu Hà' : null,
    ...overrides,
  };
}

/** Tổng quan mặc định: chưa có gì. */
export function overviewOf(overrides: Partial<TranslationOverview> = {}): TranslationOverview {
  return {
    heritageId: 1,
    name: 'Quần thể di tích Cố đô Huế',
    canGenerate: true,
    cannotGenerateReason: null,
    outdatedCount: 0,
    outdatedNotice: null,
    translations: (['en', 'ko', 'zh-Hans', 'ja'] as const).map((language) => cellOf('TRANSLATION', language, null)),
    summaries: (['vi', 'en', 'ko', 'zh-Hans', 'ja'] as const).map((language) => cellOf('SUMMARY', language, null)),
    ...overrides,
  };
}

/** Tổng quan sau khi dịch xong: tiếng Anh và tóm tắt tiếng Việt chờ duyệt, bản Hàn, Trung, Nhật là bản dịch máy. */
export function generatedOverview(overrides: Partial<TranslationOverview> = {}): TranslationOverview {
  return overviewOf({
    translations: [
      cellOf('TRANSLATION', 'en', 'PENDING'),
      cellOf('TRANSLATION', 'ko', 'MACHINE'),
      cellOf('TRANSLATION', 'zh-Hans', 'MACHINE'),
      cellOf('TRANSLATION', 'ja', 'MACHINE'),
    ],
    summaries: [
      cellOf('SUMMARY', 'vi', 'PENDING'),
      cellOf('SUMMARY', 'en', 'PENDING'),
      cellOf('SUMMARY', 'ko', 'MACHINE'),
      cellOf('SUMMARY', 'zh-Hans', 'MACHINE'),
      cellOf('SUMMARY', 'ja', 'MACHINE'),
    ],
    ...overrides,
  });
}

export const ORIGINAL: TranslationText = {
  name: 'Quần thể di tích Cố đô Huế',
  shortDescription: 'Hệ thống thành quách, cung điện và lăng tẩm của kinh đô triều Nguyễn.',
  content: 'Kinh thành khởi công năm 1805.',
  address: 'Phường Phú Xuân',
  timelines: [{ id: 11, name: 'Kinh đô triều Nguyễn', description: 'Huế giữ vai trò trung tâm gần 400 năm.' }],
  events: [{ id: 21, timelineId: 11, name: 'Xây Kinh thành', description: 'Khởi công năm 1805.' }],
  media: [{ id: 31, eventId: null, caption: 'Ngọ Môn' }],
};

export const TRANSLATED: TranslationText = {
  name: 'Complex of Hue Monuments',
  shortDescription: 'The citadels, palaces and tombs of the Nguyen capital.',
  content: 'The Citadel was begun in 1805.',
  address: null,
  timelines: [{ id: 11, name: 'Nguyen capital', description: 'Hue was the centre for almost 400 years.' }],
  events: [{ id: 21, timelineId: 11, name: 'Citadel built', description: 'Begun in 1805.' }],
  media: [{ id: 31, eventId: null, caption: 'Meridian Gate' }],
};

export function translationDetailOf(overrides: Partial<TranslationDetail> = {}): TranslationDetail {
  return {
    heritageId: 1,
    heritageName: 'Quần thể di tích Cố đô Huế',
    slug: 'quan-the-di-tich-co-do-hue',
    language: 'en',
    languageLabel: 'English',
    status: 'PENDING',
    isOutdated: false,
    reviewedAt: null,
    reviewedByName: null,
    original: ORIGINAL,
    translated: TRANSLATED,
    ...overrides,
  };
}

export function summaryDetailOf(overrides: Partial<SummaryDetail> = {}): SummaryDetail {
  return {
    heritageId: 1,
    heritageName: 'Quần thể di tích Cố đô Huế',
    slug: 'quan-the-di-tich-co-do-hue',
    language: 'en',
    languageLabel: 'English',
    status: 'PENDING',
    isOutdated: false,
    reviewedAt: null,
    reviewedByName: null,
    original: ORIGINAL,
    viSummary: { shortText: 'Tóm tắt ngắn tiếng Việt.', detailedText: 'Tóm tắt chi tiết tiếng Việt.' },
    summary: { shortText: 'Short English summary.', detailedText: 'Detailed English summary.' },
    ...overrides,
  };
}

export function queueItemOf(kind: TranslationKind, language: LanguageCode, overrides: Partial<TranslationQueueItem> = {}): TranslationQueueItem {
  return {
    heritageId: 1,
    heritageName: 'Quần thể di tích Cố đô Huế',
    slug: 'quan-the-di-tich-co-do-hue',
    kind,
    language,
    languageLabel: LANGUAGE_LABEL[language],
    status: 'PENDING',
    isOutdated: false,
    requestedAt: '2026-10-04T14:40:00Z',
    reviewedAt: null,
    ...overrides,
  };
}

export function queuePage(items: TranslationQueueItem[], overrides: Partial<Paged<TranslationQueueItem>> = {}): Paged<TranslationQueueItem> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length > 0 ? 1 : 0, ...overrides };
}

export function reviewResultOf(overview: TranslationOverview = generatedOverview(), overrides: Partial<ReviewResult> = {}): ReviewResult {
  return { overview, machineTranslationsRefreshed: false, warning: null, ...overrides };
}
