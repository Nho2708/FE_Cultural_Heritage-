import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { questionOf, reviewOf } from '../test/quizFixtures';
import { QuestionReview } from './QuestionReview';

// Xem lại một câu sau khi nộp: nhãn đúng, sai, bỏ trống ở cấp 2 và 3; cấp 1 không có nhãn đúng sai.

afterEach(cleanup);

const blankReview = () =>
  reviewOf(questionOf({ answer: null, answered: false, point: 2 }), { selectedIndex: 0 }, { isCorrect: false, partsCorrect: 0, pointEarned: 0 });

describe('nhãn của câu trong phần xem lại', () => {
  it('câu em bỏ trống ghi "Bỏ trống" (khớp ô tổng kết) chứ không ghi "Sai", vẫn hiện 0 điểm', () => {
    render(<QuestionReview review={blankReview()} index={0} total={4} level={2} />);

    expect(screen.getByText('Bỏ trống')).toBeInTheDocument();
    expect(screen.queryByText('Sai')).not.toBeInTheDocument();
    expect(screen.getByText('0 / 2 điểm')).toBeInTheDocument();
  });

  it('câu em chọn sai vẫn ghi "Sai"; câu đúng ghi "Đúng"', () => {
    const wrong = reviewOf(questionOf({ answer: { selectedIndex: 2 }, answered: true }), { selectedIndex: 0 }, { isCorrect: false, partsCorrect: 0, pointEarned: 0 });
    const { unmount } = render(<QuestionReview review={wrong} index={0} total={4} level={3} />);
    expect(screen.getByText('Sai')).toBeInTheDocument();
    expect(screen.queryByText('Bỏ trống')).not.toBeInTheDocument();
    unmount();

    const right = reviewOf(questionOf({ answer: { selectedIndex: 0 }, answered: true }), { selectedIndex: 0 });
    render(<QuestionReview review={right} index={1} total={4} level={2} />);
    expect(screen.getByText('Đúng')).toBeInTheDocument();
  });

  it('cấp 1 không có nhãn đúng sai hay bỏ trống', () => {
    render(<QuestionReview review={{ ...blankReview(), isCorrect: null, partsCorrect: null, partsTotal: null, pointEarned: null }} index={0} total={4} level={1} />);

    expect(screen.queryByText('Bỏ trống')).not.toBeInTheDocument();
    expect(screen.queryByText('Sai')).not.toBeInTheDocument();
  });
});
