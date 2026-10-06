import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { parseLanguage, detectLanguage } from '@dsvhvn/dung-chung/i18n';

export { DEFAULT_LANGUAGE, LANGUAGES, detectLanguage, languageOption, parseLanguage } from '@dsvhvn/dung-chung/i18n';

export const LANGUAGE_STORAGE_KEY = 'dsvhvn.hoc-tap.ngon-ngu';

export function readStoredLanguage(): LanguageCode | undefined {
  try {
    return parseLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

export function storeLanguage(code: LanguageCode): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Trình duyệt chặn lưu trữ: lựa chọn chỉ có tác dụng trong phiên này.
  }
}

/** Ngôn ngữ ban đầu: lựa chọn đã nhớ trên máy, nếu chưa có thì theo trình duyệt. */
export function initialLanguage(): LanguageCode {
  const stored = readStoredLanguage();
  if (stored) return stored;
  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return detectLanguage(preferred);
}
