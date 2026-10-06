import type { AttemptQuestion, QuestionSubmission } from '@dsvhvn/dung-chung/api';

// Chữ của phần xem lại bài: đổi câu trả lời của em và đáp án đúng (vị trí theo thứ tự đang hiện) thành các dòng đọc được. Hàm thuần để kiểm bằng test đơn vị.

export interface ReviewWords {
  yes: string;
  no: string;
  empty: string;
  imageN: (letter: string) => string;
}

const letter = (index: number) => String.fromCharCode(65 + (index % 26));

/** Các dòng mô tả một câu trả lời: mỗi mục một dòng ("A. Hà Nội", "Hình 1 → Chùa", "1. Mục đầu", "Mệnh đề a): Đúng"). */
export function answerLines(question: AttemptQuestion, answer: QuestionSubmission | null | undefined, words: ReviewWords): string[] {
  if (!answer) return [words.empty];
  switch (question.questionType) {
    case 'MATCHING': {
      const lines = question.leftItems.map((left, i) => {
        const right = answer.matches?.[i];
        const name = right === null || right === undefined ? words.empty : (question.rightItems[right] ?? words.empty);
        return `${left.content ?? words.imageN(String(i + 1))} → ${name}`;
      });
      return lines.length > 0 ? lines : [words.empty];
    }
    case 'ORDERING': {
      const order = answer.order ?? [];
      return order.length > 0 ? order.map((item, position) => `${position + 1}. ${question.items[item] ?? ''}`) : [words.empty];
    }
    case 'FILL_BLANK': {
      const blanks = answer.blanks ?? [];
      const filled = Array.from({ length: question.blankCount }, (_, i) => `${i + 1}. ${blanks[i]?.trim() || words.empty}`);
      return filled.length > 0 ? filled : [words.empty];
    }
    case 'MULTI_TRUE_FALSE': {
      const lines = question.statements.map((text, i) => {
        const value = answer.statements?.[i];
        return `${String.fromCharCode(97 + i)}) ${text}: ${value === true ? words.yes : value === false ? words.no : words.empty}`;
      });
      return lines.length > 0 ? lines : [words.empty];
    }
    default: {
      const selected = answer.selectedIndex;
      if (selected === null || selected === undefined) return [words.empty];
      const option = question.options[selected];
      return [`${letter(selected)}. ${option?.content ?? words.imageN(letter(selected))}`];
    }
  }
}
