// Đưa văn bản có cú pháp Markdown về văn bản thuần để hiển thị tóm tắt và đọc thành tiếng. Nội dung di sản soạn bằng Markdown (tiêu đề "## Giới thiệu",
// gạch đầu dòng, chữ đậm); giọng đọc của thiết bị đọc ra cả ký hiệu nên mọi chữ đưa vào giọng đọc phải qua hàm này. Quy tắc giống bản của máy chủ
// (Translations/PlainText): tiêu đề thành một câu riêng (thêm dấu chấm nếu chưa có dấu kết câu), bỏ ký hiệu đầu dòng, chữ đậm, nghiêng, liên kết, ảnh, mã, thẻ HTML;
// giữ cách ngắt dòng và đoạn; ký hiệu tiêu đề nằm giữa dòng (văn bản đã bị gộp thành một dòng) cũng bị bỏ.

const SENTENCE_ENDS = '.!?…。！？:;';

const FENCE = /^(```|~~~)/;
const RULE = /^([-*_]\s*){3,}$/;
const TABLE_SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;
const HEADING = /^#{1,6}\s+(.*?)(?:\s+#+)?$/;
const QUOTE = /^>\s?/;
const LIST_MARKER = /^(?:[-*+•]|\d{1,2}[.)])\s+/;
const HEADING_MARKER_IN_LINE = /(?:(?<=\s)|^)#{1,6}(?=\s)/g;
const ITALIC_STAR = /(?<![\p{L}\p{N}*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\p{L}\p{N}*])/gu;
const ITALIC_UNDERSCORE = /(?<![\p{L}\p{N}_])_(?=\S)([^_\n]+?)(?<=\S)_(?![\p{L}\p{N}_])/gu;

function endSentence(text: string): string {
  return SENTENCE_ENDS.includes(text.slice(-1)) ? text : `${text}.`;
}

function inlineToPlain(input: string): string {
  return input
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<https?:\/\/[^>\s]+>/g, '')
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(HEADING_MARKER_IN_LINE, ' ')
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, star: string | undefined, under: string | undefined) => star ?? under ?? '')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(ITALIC_STAR, '$1')
    .replace(ITALIC_UNDERSCORE, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
    .replace(/\*\*|__|~~/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function lineToPlain(input: string): string {
  const heading = HEADING.exec(input);
  if (heading) {
    const title = inlineToPlain(heading[1] ?? '');
    return title === '' ? '' : endSentence(title);
  }

  let line = input;
  while (QUOTE.test(line)) line = line.replace(QUOTE, '');
  let isItem = false;
  const item = LIST_MARKER.exec(line);
  if (item) {
    line = line.slice(item[0].length);
    isItem = true;
  }
  if (line.startsWith('|')) {
    line = line
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(', ');
  }

  const plain = inlineToPlain(line);
  if (plain === '') return '';
  return isItem ? endSentence(plain) : plain;
}

/** Văn bản thuần của `text`; rỗng, null, undefined trả chuỗi rỗng. Đoạn cách nhau một dòng trống, dòng trong đoạn cách nhau một ký tự xuống dòng. */
export function markdownToPlainText(text: string | null | undefined): string {
  if (!text || text.trim() === '') return '';

  let result = '';
  let inFence = false;
  let pendingBreak = false;
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = raw.trim();
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      if (line === '' || RULE.test(line) || TABLE_SEPARATOR.test(line)) {
        pendingBreak = result !== '';
        continue;
      }
      line = lineToPlain(line);
    }
    if (line === '') continue;

    if (result !== '') result += pendingBreak ? '\n\n' : '\n';
    pendingBreak = false;
    result += line;
  }
  return result;
}