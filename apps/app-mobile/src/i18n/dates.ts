import type { LanguageCode } from '@dsvhvn/dung-chung/api';

// Máy chủ trả chữ ngày tháng viết sẵn bằng tiếng Việt ("179 TCN", "1962 – nay"): đổi dấu hiệu "TCN" và "nay" sang ngôn ngữ đang chọn,
// phần còn lại giữ nguyên. Tiếng Hàn viết "기원전 179", tiếng Trung và Nhật viết liền "公元前179", tiếng Anh viết sau năm ("179 BCE").

export interface DateWords {
  eraBefore: string;
  present: string;
}

function eraYear(year: string, words: DateWords, language: LanguageCode): string {
  if (language === 'ko') return `${words.eraBefore} ${year}`;
  if (language === 'zh-Hans' || language === 'ja') return `${words.eraBefore}${year}`;
  return `${year} ${words.eraBefore}`;
}

export function localizeDateText(text: string, words: DateWords, language: LanguageCode): string {
  if (language === 'vi') return text;
  return text.replace(/(\d+)\s*TCN/g, (_match, year: string) => eraYear(year, words, language)).replace(/\bnay\b/g, words.present);
}

const LOCALE: Record<LanguageCode, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', 'zh-Hans': 'zh-CN', ja: 'ja-JP' };

export const localeOf = (language: LanguageCode) => LOCALE[language];

/** Khoảng cách đọc được: "850 m", "12,4 km". */
export function formatDistance(meters: number, language: LanguageCode): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString(LOCALE[language], { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}
