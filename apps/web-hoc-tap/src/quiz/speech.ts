import { levelOneInstruction } from '@dsvhvn/dung-chung';
import type { AttemptQuestion } from '@dsvhvn/dung-chung/api';

/** Chữ đọc to của một câu (cấp 1): lời câu rồi các phương án. */
export function speechOf(question: AttemptQuestion): string {
  const parts = [question.content.replace(/_{3,}/gu, 'chỗ trống')];
  if (question.questionType === 'MULTI_TRUE_FALSE') parts.push(...question.statements);
  else if (question.options.length > 0) parts.push(...question.options.map((o, i) => `Đáp án ${String.fromCharCode(65 + i)}: ${o.content ?? 'hình'}`));
  return parts.join('. ');
}

/**
 * Lời đọc của một câu trong bài chơi cấp 1: lời câu, các phương án chữ (em nhỏ chưa đọc nhanh), rồi lời hướng dẫn. Câu Đúng/Sai và chọn
 * hình không đọc phương án (hai nút Đúng, Sai và các hình đã tự nói lên).
 */
export function levelOneSpeech(question: AttemptQuestion): string {
  const parts = [question.content.replace(/_{3,}/gu, 'chỗ trống').trim()];
  if (question.questionType === 'SINGLE_CHOICE' || question.questionType === 'SOURCE_READING') {
    parts.push(...question.options.map((o, i) => `${String.fromCharCode(65 + i)}: ${o.content ?? 'hình'}`));
  }
  if (question.questionType === 'MATCHING') parts.push(...question.rightItems);
  if (question.questionType === 'ORDERING') parts.push(...question.items);
  parts.push(levelOneInstruction(question.questionType));
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (/[.!?…:]$/u.test(part) ? part : `${part}.`))
    .join(' ');
}
