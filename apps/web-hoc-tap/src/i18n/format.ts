import type { HeritageCard, LanguageCode, PeriodOption } from '@dsvhvn/dung-chung/api';
import type { Strings } from './strings';

// Định dạng số, năm, tọa độ theo ngôn ngữ đang chọn. Máy chủ trả chữ ngày tháng viết sẵn bằng tiếng Việt ("179 TCN", "1962 – nay"):
// giao diện đổi các dấu hiệu "TCN" và "nay" sang ngôn ngữ đang chọn, phần còn lại giữ nguyên.

const LOCALE: Record<LanguageCode, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', 'zh-Hans': 'zh-CN', ja: 'ja-JP' };

export const localeOf = (language: LanguageCode) => LOCALE[language];

export function formatCount(value: number, language: LanguageCode): string {
  return value.toLocaleString(LOCALE[language]);
}

/** Tiếng Hàn viết "기원전 179", tiếng Trung và Nhật viết liền "公元前179", tiếng Anh và tiếng Việt viết sau năm ("179 BCE", "179 TCN"). */
function eraYear(year: string, t: Strings, language: LanguageCode): string {
  const era = t.detail.eraBefore;
  if (language === 'ko') return `${era} ${year}`;
  if (language === 'zh-Hans' || language === 'ja') return `${era}${year}`;
  return `${year} ${era}`;
}

/** Năm đứng riêng: số âm là trước Công nguyên. */
export function formatYearText(year: number, t: Strings, language: LanguageCode): string {
  return year < 0 ? eraYear(String(Math.abs(year)), t, language) : String(year);
}

/** Đổi "TCN" và "nay" trong chữ ngày tháng hay khoảng năm của máy chủ sang ngôn ngữ đang chọn. Tiếng Việt giữ nguyên. */
export function localizeDateText(text: string, t: Strings, language: LanguageCode): string {
  if (language === 'vi') return text;
  return text.replace(/(\d+)\s*TCN/g, (_match, year: string) => eraYear(year, t, language)).replace(/\bnay\b/g, t.detail.present);
}

/** Khoảng năm của thời kỳ: "179 TCN – 938", "đến 180 TCN", "từ 1945". */
export function periodRangeText(period: Pick<PeriodOption, 'fromYear' | 'toYear'>, t: Strings, language: LanguageCode): string {
  const { fromYear, toYear } = period;
  if (fromYear != null && toYear != null) return `${formatYearText(fromYear, t, language)} – ${formatYearText(toYear, t, language)}`;
  if (fromYear != null) return t.filters.from(formatYearText(fromYear, t, language));
  if (toYear != null) return t.filters.until(formatYearText(toYear, t, language));
  return '';
}

/** Tọa độ đọc được: "16,4694° B · 107,5778° Đ" (tiếng Việt), "16.4694° N · 107.5778° E" (ngôn ngữ khác). */
export function coordinatesText(latitude: number, longitude: number, t: Strings, language: LanguageCode): string {
  const format = (value: number) => Math.abs(value).toLocaleString(LOCALE[language], { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const d = t.detail;
  return `${format(latitude)}° ${latitude >= 0 ? d.north : d.south} · ${format(longitude)}° ${longitude >= 0 ? d.east : d.west}`;
}

/** Hai thẻ có cờ cho cả danh sách: có thẻ nào đang lùi về tiếng Việt, có thẻ nào là bản dịch máy. */
export function listFlags(cards: ReadonlyArray<Pick<HeritageCard, 'isFallback' | 'isMachineTranslated'>>) {
  return {
    fallback: cards.some((card) => card.isFallback === true),
    machine: cards.some((card) => card.isMachineTranslated === true),
  };
}
