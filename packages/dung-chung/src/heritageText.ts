import type { HeritageCard, LanguageCode, PublicMedia, PublicReference, RecognitionLevel } from './api';
import { resolveFileUrl } from './files';
import { provinceName, RECOGNITION_LEVEL_NAME } from './i18n/taxonomy';
import { parseReferenceTitle } from './heritage';

// Chữ hiển thị của trang khám phá, tách khỏi component để kiểm bằng test đơn vị.

/** Cấp xếp hạng kèm năm nếu có: "Di sản thế giới (UNESCO) 1993". Chưa xếp hạng thì trả null (không nhắc). */
export function recognitionText(level: RecognitionLevel | null, year: number | null, language: LanguageCode = 'vi'): string | null {
  if (!level || level === 'NONE') return null;
  const label = RECOGNITION_LEVEL_NAME[language][level];
  return year ? `${label} ${year}` : label;
}

/** Dòng phụ dưới tên di sản: "Thành phố Huế · Di sản thế giới (UNESCO) 1993". */
export function cardSubtitle(card: Pick<HeritageCard, 'provinceName' | 'recognitionLevel' | 'recognizedYear'>, language: LanguageCode = 'vi'): string {
  return [provinceName(card.provinceName, language), recognitionText(card.recognitionLevel, card.recognizedYear, language)].filter(Boolean).join(' · ');
}

/**
 * Dòng ghi công dưới ảnh: "Ảnh: Tác giả · Giấy phép · Nguồn" (`prefix` là chữ "Ảnh" ở ngôn ngữ đang chọn). Thiếu phần nào bỏ phần đó; cả ba
 * trống thì dùng chuỗi ghi công gộp của máy chủ; không có gì thì trả null. Tên tác giả, giấy phép, nguồn không dịch.
 */
export function creditLine(media: Pick<PublicMedia, 'author' | 'license' | 'source' | 'credit'>, prefix = 'Ảnh'): string | null {
  const parts = [media.author, media.license, media.source].map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  if (parts.length > 0) return `${prefix}: ${parts.join(' · ')}`;
  const merged = media.credit?.trim();
  return merged ? `${prefix}: ${merged}` : null;
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

/** Dòng tóm tắt "Nguồn: Cục Di sản văn hóa; UNESCO World Heritage Centre." từ các cơ quan không trùng (`prefix` là chữ "Nguồn" ở ngôn ngữ đang chọn). */
export function sourceSummary(citations: Citation[], prefix = 'Nguồn'): string | null {
  const agencies = [...new Set(citations.map((c) => c.agency).filter(Boolean))];
  return agencies.length ? `${prefix}: ${agencies.join('; ')}.` : null;
}

/**
 * Địa chỉ chỉ nhận http/https để không chèn địa chỉ lạ vào thuộc tính src hoặc href. Ảnh tải lên kho tệp của nền tảng có thể
 * là đường dẫn tương đối `/files/...` (khi máy chủ không cấu hình địa chỉ công khai): ghép với máy chủ API.
 */
export function safeUrl(url: string | null | undefined, apiBaseUrl: string): string | null {
  const full = resolveFileUrl(url, apiBaseUrl);
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
export function displayImageUrl(url: string | null | undefined, width: number, apiBaseUrl: string): string | null {
  const safe = safeUrl(url, apiBaseUrl);
  if (!safe) return null;
  const parsed = new URL(safe);
  if (parsed.hostname !== 'upload.wikimedia.org') return safe;
  const match = COMMONS_ORIGINAL.exec(parsed.pathname);
  if (!match) return safe;
  const step = COMMONS_WIDTHS.find((w) => w >= width) ?? COMMONS_WIDTHS[COMMONS_WIDTHS.length - 1];
  return `${parsed.origin}/wikipedia/commons/thumb/${match[1]}/${match[2]}/${step}px-${match[2]}`;
}
