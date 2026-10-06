import type { HeritageCard, HeritageType, LanguageCode, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import { cardSubtitle, displayImageUrl, safeUrl } from '@dsvhvn/dung-chung/heritage-text';
import { HERITAGE_TYPE_NAME, RECOGNITION_LEVEL_NAME, REGION_NAME, provinceName, type RegionValue } from '@dsvhvn/dung-chung/i18n';
import { API_BASE_URL } from '../config/env';

// Chữ và địa chỉ ảnh hiển thị của phần khám phá. Phần xử lý chữ dùng chung với web học tập; ở đây chỉ gắn địa chỉ máy chủ API của app.

export { cardSubtitle };

/** Địa chỉ ảnh mở được từ điện thoại: chỉ http/https, đường dẫn `/files/...` ghép với máy chủ API, ảnh Wikimedia Commons thu nhỏ vừa đủ độ rộng. */
export function imageUrl(url: string | null | undefined, width = 500): string | null {
  return displayImageUrl(url, width, API_BASE_URL);
}

export function externalUrl(url: string | null | undefined): string | null {
  return safeUrl(url, API_BASE_URL);
}

export function typeName(type: HeritageType | null | undefined, language: LanguageCode): string | null {
  return type ? HERITAGE_TYPE_NAME[language][type] : null;
}

export function levelName(level: RecognitionLevel | null | undefined, language: LanguageCode): string | null {
  return level && level !== 'NONE' ? RECOGNITION_LEVEL_NAME[language][level] : null;
}

export function regionName(value: string, language: LanguageCode): string {
  return value === 'Bắc' || value === 'Trung' || value === 'Nam' ? REGION_NAME[language][value as RegionValue] : value;
}

export function cardLine(card: Pick<HeritageCard, 'provinceName' | 'recognitionLevel' | 'recognizedYear'>, language: LanguageCode): string {
  return cardSubtitle(card, language);
}

export { provinceName };
