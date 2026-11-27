import type { DuplicateLessonResult } from '@dsvhvn/dung-chung/api';

/** Các câu lưu ý sau khi dùng bài mẫu: số di sản bị bỏ, lời nhắc khác cấp, số bài kiểm tra đã chép và số câu bị bỏ. Hiện ở trang Soạn bài học của bài mới. */
export function sampleNoticeOf(result: DuplicateLessonResult): string[] {
  const notice: string[] = [];
  if (result.skippedHeritages > 0) notice.push(`Đã bỏ ${result.skippedHeritages} di sản đang ẩn của bài mẫu.`);
  if (result.levelNotice) notice.push(result.levelNotice);
  if (result.copiedQuizzes > 0) notice.push(`Đã chép ${result.copiedQuizzes} bài kiểm tra thành bản nháp.`);
  if (result.skippedQuestions > 0) notice.push(`Đã bỏ ${result.skippedQuestions} câu hỏi không dùng được cho lớp này.`);
  return notice;
}
