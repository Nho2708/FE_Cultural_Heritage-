import type { LanguageCode, QueueTab, TranslationKind, TranslationStatus } from '@dsvhvn/dung-chung/api';
import { pathOf } from '../../access/screens';
import { isLanguage } from './translationLabels';

// Địa chỉ của màn hình Duyệt bản dịch và tóm tắt: tab, bộ lọc và mục đang mở nằm trên URL (chia sẻ được, nút Back đúng). Chữ trên URL là
// chữ Việt không dấu như mọi route của web quản trị.

export const REVIEW_TABS: ReadonlyArray<{ slug: string; tab: QueueTab; label: string }> = [
  { slug: 'cho-duyet', tab: 'PENDING', label: 'Chờ duyệt' },
  { slug: 'da-duyet', tab: 'APPROVED', label: 'Đã duyệt' },
  { slug: 'ban-dich-may', tab: 'MACHINE', label: 'Bản dịch máy' },
  { slug: 'bi-tu-choi', tab: 'REJECTED', label: 'Bị từ chối' },
];

export const KIND_SLUG: Record<TranslationKind, string> = { TRANSLATION: 'ban-dich', SUMMARY: 'tom-tat' };

export function readReviewTab(slug: string | null): (typeof REVIEW_TABS)[number] {
  return REVIEW_TABS.find((tab) => tab.slug === slug) ?? REVIEW_TABS[0]!;
}

export function readKind(slug: string | null): TranslationKind | '' {
  return slug === KIND_SLUG.TRANSLATION ? 'TRANSLATION' : slug === KIND_SLUG.SUMMARY ? 'SUMMARY' : '';
}

/** Mục đang mở ở khung hai cột: `?muc=<mã di sản>.<ban-dich|tom-tat>.<mã ngôn ngữ>`. */
export interface ReviewItemRef {
  heritageId: number;
  kind: TranslationKind;
  language: LanguageCode;
}

export function itemParam(item: ReviewItemRef): string {
  return `${item.heritageId}.${KIND_SLUG[item.kind]}.${item.language}`;
}

export function readItem(value: string | null): ReviewItemRef | null {
  const [id, kindSlug, language] = (value ?? '').split('.');
  const heritageId = Number(id);
  const kind = readKind(kindSlug ?? null);
  if (!Number.isSafeInteger(heritageId) || heritageId <= 0 || kind === '' || !isLanguage(language)) return null;
  return { heritageId, kind, language };
}

/** Tab của màn hình duyệt chứa một bản có trạng thái này. */
export function tabOfStatus(status: TranslationStatus): (typeof REVIEW_TABS)[number] {
  const tab: QueueTab = status;
  return REVIEW_TABS.find((item) => item.tab === tab) ?? REVIEW_TABS[0]!;
}

/** Liên kết "Duyệt" từ tab Bản dịch và tóm tắt sang màn hình duyệt, mở sẵn đúng mục. */
export function reviewPath(item: ReviewItemRef, status: TranslationStatus): string {
  const params = new URLSearchParams({ tab: tabOfStatus(status).slug, muc: itemParam(item) });
  return `${pathOf('translationReview')}?${params.toString()}`;
}
