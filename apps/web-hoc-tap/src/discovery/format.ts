import { RECOGNITION_LEVEL_LABEL, formatYear, parseReferenceTitle, resolveFileUrl } from '@dsvhvn/dung-chung';
import type { HeritageCard, PeriodOption, PublicMedia, PublicReference, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import { API_BASE_URL } from '../config/env';

// Chữ hiển thị của trang khám phá, tách khỏi component để kiểm bằng test đơn vị.

/** Cấp xếp hạng kèm năm nếu có: "Di sản thế giới (UNESCO) 1993". Chưa xếp hạng thì trả null (không nhắc). */
export function recognitionText(level: RecognitionLevel | null, year: number | null): string | null {
  if (!level || level === 'NONE') return null;
  const label = RECOGNITION_LEVEL_LABEL[level];
  return year ? `${label} ${year}` : label;
}

/** Dòng phụ dưới tên di sản: "Thành phố Huế · Di sản thế giới (UNESCO) 1993". */
export function cardSubtitle(card: Pick<HeritageCard, 'provinceName' | 'recognitionLevel' | 'recognizedYear'>): string {
  return [card.provinceName, recognitionText(card.recognitionLevel, card.recognizedYear)].filter(Boolean).join(' · ');
}

/**
 * Dòng ghi công dưới ảnh: "Ảnh: Tác giả · Giấy phép · Nguồn". Thiếu phần nào bỏ phần đó; cả ba trống thì dùng chuỗi ghi
 * công gộp của máy chủ; không có gì thì trả null.
 */
export function creditLine(media: Pick<PublicMedia, 'author' | 'license' | 'source' | 'credit'>): string | null {
  const parts = [media.author, media.license, media.source].map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  if (parts.length > 0) return `Ảnh: ${parts.join(' · ')}`;
  const merged = media.credit?.trim();
  return merged ? `Ảnh: ${merged}` : null;
}

/** Tọa độ đọc được: "16,4694° B · 107,5778° Đ". */
export function coordinatesText(latitude: number, longitude: number): string {
  const format = (value: number) => Math.abs(value).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return `${format(latitude)}° ${latitude >= 0 ? 'B' : 'N'} · ${format(longitude)}° ${longitude >= 0 ? 'Đ' : 'T'}`;
}

export type ContentBlock =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

/**
 * Nội dung di sản là văn bản có tiêu đề "## Giới thiệu", đoạn cách nhau dòng trống và danh sách gạch đầu dòng. Tách
 * thành khối để dựng bằng phần tử React (không chèn HTML thô).
 */
export function parseContent(content: string | null | undefined): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: 'list', items: list });
    list = [];
  };
  for (const raw of (content ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (line === '') {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'heading', level: heading[1]!.length === 2 ? 2 : 3, text: heading[2]! });
    } else if (bullet) {
      flushParagraph();
      list.push(bullet[1]!);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

export interface InlineRun {
  text: string;
  bold: boolean;
}

/** Tách chữ đậm kiểu **chữ đậm** trong đoạn; dấu ** lẻ (không có cặp) giữ nguyên là chữ thường. */
export function parseInline(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const pattern = /\*\*([^*]+?)\*\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), bold: false });
    runs.push({ text: match[1]!, bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), bold: false });
  return runs;
}

export interface Citation {
  id: number;
  index: number;
  name: string;
  agency: string;
  accessedOn: string;
  url: string | null;
  sourceTypeLabel: string;
}

/** Nguồn tham khảo: tách tiêu đề theo mẫu "Tên tài liệu — Cơ quan, truy cập dd/mm/yyyy" của nhóm. */
export function citationsOf(references: PublicReference[]): Citation[] {
  return references.map((reference, i) => ({
    id: reference.id,
    index: i + 1,
    ...parseReferenceTitle(reference.title),
    url: reference.url,
    sourceTypeLabel: reference.sourceTypeLabel,
  }));
}

/** Dòng tóm tắt "Nguồn: Cục Di sản văn hóa; UNESCO World Heritage Centre." từ các cơ quan không trùng. */
export function sourceSummary(citations: Citation[]): string | null {
  const agencies = [...new Set(citations.map((c) => c.agency).filter(Boolean))];
  return agencies.length ? `Nguồn: ${agencies.join('; ')}.` : null;
}

/**
 * Địa chỉ chỉ nhận http/https để không chèn địa chỉ lạ vào thuộc tính src hoặc href. Ảnh tải lên kho tệp của nền tảng có thể
 * là đường dẫn tương đối `/files/...` (khi máy chủ không cấu hình địa chỉ công khai): ghép với máy chủ API.
 */
export function safeUrl(url: string | null | undefined): string | null {
  const full = resolveFileUrl(url, API_BASE_URL);
  if (!full) return null;
  try {
    const parsed = new URL(full);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Các độ rộng ảnh thu nhỏ mà Wikimedia Commons phục vụ sẵn; độ rộng khác bị chặn hoặc giới hạn tốc độ. */
const COMMONS_WIDTHS = [250, 330, 500, 960, 1280, 1920] as const;

const COMMONS_ORIGINAL = /^\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.(?:jpe?g|png))$/i;

/**
 * Ảnh di sản lưu đường dẫn tới tệp gốc trên Wikimedia Commons (thường vài MB). Hiển thị thì dùng bản thu nhỏ do chính
 * Commons phục vụ, độ rộng lấy bậc có sẵn nhỏ nhất không nhỏ hơn `width`; nhờ vậy trang nhẹ và không bị Commons giới hạn
 * tốc độ khi tải nhiều ảnh gốc cùng lúc. Địa chỉ khác Commons, hoặc định dạng khác jpg/png, giữ nguyên.
 */
export function displayImageUrl(url: string | null | undefined, width: number): string | null {
  const safe = safeUrl(url);
  if (!safe) return null;
  const parsed = new URL(safe);
  if (parsed.hostname !== 'upload.wikimedia.org') return safe;
  const match = COMMONS_ORIGINAL.exec(parsed.pathname);
  if (!match) return safe;
  const step = COMMONS_WIDTHS.find((w) => w >= width) ?? COMMONS_WIDTHS[COMMONS_WIDTHS.length - 1];
  return `${parsed.origin}/wikipedia/commons/thumb/${match[1]}/${match[2]}/${step}px-${match[2]}`;
}

/** Khoảng năm của thời kỳ: "179 TCN – 938", "đến 180 TCN", "từ 1945". */
export function periodRange(period: Pick<PeriodOption, 'fromYear' | 'toYear'>): string {
  const { fromYear, toYear } = period;
  if (fromYear != null && toYear != null) return `${formatYear(fromYear)} – ${formatYear(toYear)}`;
  if (fromYear != null) return `từ ${formatYear(fromYear)}`;
  if (toYear != null) return `đến ${formatYear(toYear)}`;
  return '';
}
