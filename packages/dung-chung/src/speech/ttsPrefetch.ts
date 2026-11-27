// Giọng đọc tiếng Việt của máy chủ (cấp 1): quy tắc chung của web và app về chữ gửi đi. Máy chủ đặt tên tệp theo băm của chữ đã chuẩn hóa khoảng trắng,
// nên chữ gửi lên để nghe và chữ gửi lên để tạo trước phải qua cùng một bước chuẩn hóa thì mới trùng tệp đã có. Gom chữ tạo trước theo lô tối đa 40 chữ
// (mỗi chữ ≤ 1000 ký tự) và không gửi lại chữ đã gửi trong lần mở này.

/** Mỗi chữ gửi lên máy chủ tối đa bấy nhiêu ký tự. */
export const TTS_MAX_TEXT_LENGTH = 1000;

/** Mỗi lần gọi tạo trước tối đa bấy nhiêu chữ. */
export const TTS_PREFETCH_BATCH = 40;

/** Số chữ đã gửi được nhớ tối đa; quá thì quên bớt để bộ nhớ không phình mãi. */
const REMEMBERED_MAX = 2000;

/** Chữ đưa vào giọng đọc: gộp mọi khoảng trắng và xuống dòng thành một dấu cách, bỏ khoảng trắng đầu cuối. */
export function normalizeSpeechText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/gu, ' ').trim();
}

/** Chữ có đọc được bằng giọng máy chủ không: không rỗng và không quá dài. */
export function isSpeakableText(text: string): boolean {
  return text.length > 0 && text.length <= TTS_MAX_TEXT_LENGTH;
}

/** Danh sách chữ cần tạo trước, chia lô: chuẩn hóa, bỏ chữ rỗng, quá dài hoặc trùng. */
export function prefetchBatches(texts: readonly (string | null | undefined)[]): string[][] {
  const unique = [...new Set(texts.map(normalizeSpeechText).filter(isSpeakableText))];
  const batches: string[][] = [];
  for (let start = 0; start < unique.length; start += TTS_PREFETCH_BATCH) batches.push(unique.slice(start, start + TTS_PREFETCH_BATCH));
  return batches;
}

/**
 * Hàm tạo trước chữ: gọi `send` cho từng lô, chạy ngầm (lỗi bỏ qua). Chữ đã gửi (hoặc `isKnown` báo đã có tiếng) thì không gửi lại; lô gửi lỗi
 * (`send` ném lỗi hoặc trả `null`) thì quên đi để lần vào màn sau gửi lại.
 */
export function createSpeechPrefetcher(send: (texts: string[]) => Promise<unknown>, isKnown?: (text: string) => boolean): (texts: readonly (string | null | undefined)[]) => void {
  const sent = new Set<string>();
  return (texts) => {
    const fresh = texts.map(normalizeSpeechText).filter((text) => isSpeakableText(text) && !sent.has(text) && !isKnown?.(text));
    for (const batch of prefetchBatches(fresh)) {
      if (sent.size + batch.length > REMEMBERED_MAX) sent.clear();
      for (const text of batch) sent.add(text);
      const forget = () => {
        for (const text of batch) sent.delete(text);
      };
      void Promise.resolve()
        .then(() => send(batch))
        .then((result) => result === null && forget())
        .catch(forget);
    }
  };
}
