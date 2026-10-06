import type { LanguageCode, LanguageOption } from '@dsvhvn/dung-chung/api';

// Năm ngôn ngữ của phần công khai (cùng danh mục với `GET /public/languages` của máy chủ). Danh mục này nằm sẵn ở máy khách để bộ chọn
// hiện được ngay cả khi chưa gọi API; mỗi ngôn ngữ viết bằng chính nó, không dùng cờ quốc gia.

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'vi', nativeName: 'Tiếng Việt', speechTag: 'vi-VN', isSource: true, isMachineOnly: false },
  { code: 'en', nativeName: 'English', speechTag: 'en-US', isSource: false, isMachineOnly: false },
  { code: 'ko', nativeName: '한국어', speechTag: 'ko-KR', isSource: false, isMachineOnly: true },
  { code: 'zh-Hans', nativeName: '简体中文', speechTag: 'zh-CN', isSource: false, isMachineOnly: true },
  { code: 'ja', nativeName: '日本語', speechTag: 'ja-JP', isSource: false, isMachineOnly: true },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function languageOption(code: LanguageCode): LanguageOption {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]!;
}

/**
 * Đọc mã ngôn ngữ của trình duyệt hoặc của người dùng chọn: nhận mã ngắn và dạng vùng (`en-US`, `ko-KR`, `zh`, `zh-CN`, `zh-SG`, `zh-Hans-SG`, `ja-JP`).
 * Tiếng Trung phồn thể (`zh-TW`, `zh-HK`, `zh-Hant`) và mọi ngôn ngữ khác không thuộc năm ngôn ngữ: trả undefined. Cùng quy tắc với máy chủ.
 */
export function parseLanguage(tag: string | null | undefined): LanguageCode | undefined {
  const parts = (tag ?? '').trim().replaceAll('_', '-').split('-').filter(Boolean);
  const primary = parts[0]?.toLowerCase();
  if (!primary) return undefined;
  if (primary === 'vi' || primary === 'en' || primary === 'ko' || primary === 'ja') return primary;
  if (primary !== 'zh') return undefined;
  const rest = parts.slice(1).map((part) => part.toLowerCase());
  if (rest.includes('hant') || rest.includes('tw') || rest.includes('hk') || rest.includes('mo')) return undefined;
  return 'zh-Hans';
}

/** Ngôn ngữ mặc định lần đầu mở: ngôn ngữ đầu tiên của trình duyệt thuộc năm ngôn ngữ, không có thì tiếng Anh. */
export function detectLanguage(preferred: readonly string[] | undefined): LanguageCode {
  for (const tag of preferred ?? []) {
    const found = parseLanguage(tag);
    if (found) return found;
  }
  return DEFAULT_LANGUAGE;
}

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
