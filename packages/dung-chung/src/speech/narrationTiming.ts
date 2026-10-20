// Thuyết minh tạo sẵn: tệp âm thanh đọc cả bản tóm tắt ngắn kèm mốc bắt đầu, kết thúc của từng câu. Web và app tô sáng câu đang đọc
// bằng cách so thời điểm phát với các mốc này; phần tính thuần đặt ở đây để hai bên dùng chung và kiểm bằng test đơn vị.

export interface TimedSentence {
  startMs: number;
  endMs: number;
}

/**
 * Chỉ số câu đang đọc tại thời điểm `positionMs` của tệp: câu cuối cùng đã bắt đầu (mốc bắt đầu ≤ thời điểm). Chưa tới câu đầu
 * (khoảng lặng đầu tệp) thì là câu đầu; trong khoảng lặng giữa hai câu thì vẫn là câu vừa đọc xong, không nhấp nháy. Không có câu nào
 * hoặc thời điểm không hợp lệ thì -1. Mốc bắt đầu không giảm nên tìm nhị phân.
 */
export function sentenceIndexAt(sentences: readonly TimedSentence[], positionMs: number): number {
  if (sentences.length === 0 || !Number.isFinite(positionMs)) return -1;
  let low = 0;
  let high = sentences.length - 1;
  let found = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((sentences[middle]?.startMs ?? 0) <= positionMs) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/** Thời điểm (mili giây) để nhảy tới đầu một câu; chỉ số ngoài danh sách thì về đầu tệp. */
export function sentenceStartMs(sentences: readonly TimedSentence[], index: number): number {
  return Math.max(0, sentences[index]?.startMs ?? 0);
}
