import { markdownToPlainText } from './plainText';
import { splitSentences } from './sentences';

// Đọc bài đọc cấp 2, 3 từng câu và tô sáng câu đang đọc, nhưng vẫn giữ nguyên các đoạn văn của bài. Các câu để đọc là đúng kết quả của `splitSentences`
// trên cả nội dung (cùng quy trình bỏ Markdown, chuẩn hóa khoảng trắng, tách câu mà máy chủ dùng khi tạo trước tiếng); phần chia đoạn chỉ để hiển thị.

/** Một mảnh chữ của một đoạn văn, thuộc về câu thứ `sentence`. Câu nằm vắt qua hai đoạn thì có mảnh ở cả hai đoạn, cùng chỉ số câu. */
export interface ReadAlongPiece {
  sentence: number;
  text: string;
}

export interface ReadAlongLayout {
  /** Các câu để đọc, đúng thứ tự. */
  sentences: string[];
  /** Các đoạn văn để hiển thị; mỗi đoạn là các mảnh chữ nối nhau bằng một dấu cách. */
  paragraphs: ReadAlongPiece[][];
}

/** Số câu đầu của nội dung chính xin máy chủ tạo trước khi mở bài (phần còn lại tạo lúc bấm nghe hoặc đã được tạo lúc xuất bản bài). */
export const READ_ALOUD_PREFETCH_COUNT = 10;

/** Chia nội dung thành câu để đọc và đoạn để hiển thị. Chữ rỗng trả về hai danh sách rỗng. */
export function readAlongLayout(text: string | null | undefined, locale: string): ReadAlongLayout {
  const sentences = splitSentences(text ?? '', locale);
  if (sentences.length === 0) return { sentences: [], paragraphs: [] };

  const paragraphs = markdownToPlainText(text)
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const flat = paragraphs.join(' ');

  // Vị trí của từng câu trong chữ đã gộp khoảng trắng.
  const spans: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const sentence of sentences) {
    const start = flat.indexOf(sentence, cursor);
    if (start < 0) break;
    spans.push({ start, end: start + sentence.length });
    cursor = start + sentence.length;
  }
  // Không dựng lại được vị trí thì hiện cả bài là một đoạn: vẫn đọc và tô sáng đúng câu.
  if (spans.length !== sentences.length) {
    return { sentences, paragraphs: [sentences.map((sentence, index) => ({ sentence: index, text: sentence }))] };
  }

  const layout: ReadAlongPiece[][] = [];
  let offset = 0;
  for (const paragraph of paragraphs) {
    const from = offset;
    const to = from + paragraph.length;
    offset = to + 1;
    const pieces: ReadAlongPiece[] = [];
    spans.forEach((span, index) => {
      const start = Math.max(span.start, from);
      const end = Math.min(span.end, to);
      if (start >= end) return;
      const piece = flat.slice(start, end).trim();
      if (piece !== '') pieces.push({ sentence: index, text: piece });
    });
    if (pieces.length > 0) layout.push(pieces);
  }
  return { sentences, paragraphs: layout };
}

// Chỉ một đoạn được đọc một lúc: đoạn mới bắt đầu thì đoạn đang đọc phải dừng (tiếng và tô sáng).
let stopCurrent: (() => void) | null = null;

/** Đoạn sắp đọc xin quyền: dừng đoạn đang đọc (nếu có) rồi ghi nhận `stop` của mình. */
export function claimReading(stop: () => void): void {
  if (stopCurrent && stopCurrent !== stop) stopCurrent();
  stopCurrent = stop;
}

/** Đoạn rời trang thì trả quyền (chỉ khi quyền còn là của mình). */
export function releaseReading(stop: () => void): void {
  if (stopCurrent === stop) stopCurrent = null;
}
