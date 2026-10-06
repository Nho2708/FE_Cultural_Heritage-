import type { AttemptQuestion } from '@dsvhvn/dung-chung/api';

/** Chữ đọc to của một câu (cấp 1): lời câu rồi các phương án. */
export function speechOf(question: AttemptQuestion): string {
  const parts = [question.content.replace(/_{3,}/gu, 'chỗ trống')];
  if (question.questionType === 'MULTI_TRUE_FALSE') parts.push(...question.statements);
  else if (question.options.length > 0) parts.push(...question.options.map((o, i) => `Đáp án ${String.fromCharCode(65 + i)}: ${o.content ?? 'hình'}`));
  return parts.join('. ');
}
