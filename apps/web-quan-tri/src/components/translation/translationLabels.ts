import type { LanguageCode, TranslationKind } from '@dsvhvn/dung-chung/api';

// Tên ngôn ngữ và nhãn dùng chung của tab Bản dịch và tóm tắt (Biên tập di sản) và màn hình Duyệt bản dịch và tóm tắt. Web quản trị chỉ có tiếng
// Việt; tên ngôn ngữ viết bằng chính ngôn ngữ đó như ở bộ chọn ngôn ngữ của web học tập.

export const LANGUAGE_NAME: Record<LanguageCode, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ko: '한국어',
  'zh-Hans': '简体中文',
  ja: '日本語',
};

/** Tên ngôn ngữ viết trong câu ("bản tiếng Anh"). */
export const LANGUAGE_IN_SENTENCE: Record<LanguageCode, string> = {
  vi: 'tiếng Việt',
  en: 'tiếng Anh',
  ko: 'tiếng Hàn',
  'zh-Hans': 'tiếng Trung',
  ja: 'tiếng Nhật',
};

export const LANGUAGE_CODES: readonly LanguageCode[] = ['vi', 'en', 'ko', 'zh-Hans', 'ja'];

export function isLanguage(value: string | null | undefined): value is LanguageCode {
  return LANGUAGE_CODES.some((code) => code === value);
}

/** Tên của "đơn vị duyệt" ở trong câu. */
export const KIND_NAME: Record<TranslationKind, string> = { TRANSLATION: 'bản dịch', SUMMARY: 'tóm tắt' };
