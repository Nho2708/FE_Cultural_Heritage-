import { markdownToPlainText } from './plainText';

// Tách chữ thành câu để đọc từng câu và tô sáng câu đang đọc. Dùng Intl.Segmenter của trình duyệt (hiểu dấu câu của cả năm ngôn ngữ, kể
// cả "。" của tiếng Trung, Nhật); trình duyệt cũ không có thì tách theo dấu kết câu. Chữ có ký hiệu Markdown (tóm tắt do AI viết, nội dung di sản) được đưa về văn bản thuần trước,
// nên giọng đọc không bao giờ đọc ra "##", "**" hay gạch đầu dòng; tiêu đề thành một câu riêng.

const FALLBACK_PATTERN = /[^.!?。！？…]+(?:[.!?。！？…]+["')\]”’」』]*)?\s*/gu;

/** Các câu của đoạn chữ, bỏ khoảng trắng thừa và câu rỗng. Chữ rỗng trả danh sách rỗng. */
export function splitSentences(text: string, locale: string): string[] {
  const clean = markdownToPlainText(text).replace(/\s+/g, ' ').trim();
  if (clean === '') return [];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
      const sentences = [...segmenter.segment(clean)].map((part) => part.segment.trim()).filter(Boolean);
      if (sentences.length > 0) return sentences;
    } catch {
      // Mã ngôn ngữ lạ: rơi xuống cách tách theo dấu câu.
    }
  }
  return (clean.match(FALLBACK_PATTERN) ?? [clean]).map((part) => part.trim()).filter(Boolean);
}

/** Tách bản tóm tắt chi tiết thành các đoạn (cách nhau dòng trống) để hiện ở tab Đọc; ký hiệu Markdown nếu có bị bỏ. */
export function splitParagraphs(text: string): string[] {
  return markdownToPlainText(text)
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Giọng đọc phù hợp nhất với mã giọng đọc (`ko-KR`): trùng cả vùng thì chọn, không thì giọng cùng ngôn ngữ; ưu tiên giọng Nữ và Natural; không có thì undefined. */
export function pickVoice<T extends { lang: string; name?: string }>(voices: readonly T[], speechTag: string): T | undefined {
  const normalize = (tag: string) => tag.replaceAll('_', '-').toLowerCase();
  const wanted = normalize(speechTag);
  const primary = wanted.split('-')[0];

  const matching = voices.filter((voice) => {
    const lang = normalize(voice.lang);
    return lang === wanted || lang.split('-')[0] === primary;
  });

  if (matching.length === 0) return undefined;

  // Nếu là tiếng Việt, ưu tiên giọng Nữ Natural (Hoài My), giọng Nữ, rồi giọng Natural khác
  if (primary === 'vi') {
    const femaleNatural = matching.find(
      (v) => /natural|neural/i.test(v.name ?? '') && /hoaimy|female|nữ|woman/i.test(v.name ?? ''),
    );
    if (femaleNatural) return femaleNatural;

    const female = matching.find((v) => /female|nữ|woman|hoaimy/i.test(v.name ?? ''));
    if (female) return female;

    const natural = matching.find((v) => /natural|neural/i.test(v.name ?? ''));
    if (natural) return natural;

    const nonAn = matching.find((v) => !/\ban\b/i.test(v.name ?? ''));
    if (nonAn) return nonAn;
  }

  return matching.find((voice) => normalize(voice.lang) === wanted) ?? matching[0];
}
