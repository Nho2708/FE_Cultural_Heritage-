import { ATTEMPT_ENDPOINTS, type SchoolLevel, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { homeOf, questionOf, resultOf, reviewOf } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Kết quả bài làm: ba bản trình bày theo cấp, phần xem lại đáp án (chỉ khi bài cho xem), phân tích của cấp 3.

function open(level: SchoolLevel, result: StudentAttemptResult, state?: unknown) {
  const student = studentOf(level === 1 ? 4 : level === 3 ? 11 : 7);
  signInAs(student);
  mockApi(
    (call) => (call.path === ATTEMPT_ENDPOINTS.result(31) ? envelope(200, { data: result }) : undefined),
    (call) =>
      call.path === ATTEMPT_ENDPOINTS.home
        ? envelope(200, { data: homeOf(level, { myLessons: [{ lessonId: 5, title: 'Ngọ Môn', accessCode: 'BH7F3K2Q', quizzesDone: 1, quizzesPublished: 2, lastAttemptAt: null }] }) })
        : undefined,
    studentServer(student),
  );
  return renderApp('/ket-qua/31', state);
}

const single = questionOf({ questionId: 11, answer: { selectedIndex: 1 }, answered: true });
const ordering = questionOf({ questionId: 12, questionType: 'ORDERING', typeName: 'Sắp xếp', content: 'Xếp các sự kiện.', options: [], items: ['Khởi công', 'Hoàn thành', 'UNESCO'], answer: { order: [1, 0, 2] }, answered: true });

describe('Kết quả bài làm — cấp 1 (sao, không điểm)', () => {
  it('sao, lời khen, huy hiệu, đáp án đúng không có dấu sai, không có điểm hay phần trăm', async () => {
    const result = resultOf(1, {
      badges: [{ code: 'ON_TIME', name: 'Nộp đúng hạn', description: 'Em tự nộp bài trước khi hết giờ.' }],
      answersShown: true,
      questions: [reviewOf(single, { selectedIndex: 0 }, { isCorrect: null, partsCorrect: null, partsTotal: null, pointEarned: null })],
    });
    open(1, result);

    expect(await screen.findByRole('heading', { level: 1, name: 'Kiểm tra 15 phút: Kinh thành Huế' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(screen.getByText('3 trên 3 sao')).toBeInTheDocument();
    expect(screen.getByText('Giỏi quá! Em được 3 sao, em thật xuất sắc!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Em nhận huy hiệu mới!' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cùng xem đáp án nhé' })).toBeInTheDocument();
    expect(screen.getByText('Đáp án đúng')).toBeInTheDocument();
    expect(screen.queryByText(/chưa đúng/)).not.toBeInTheDocument();
    expect(screen.queryByText(/điểm/i)).not.toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Xem lại bài học' })).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q');
    expect(screen.getByRole('link', { name: 'Xem sao của em' })).toHaveAttribute('href', '/tien-do');
  });

  it('bài không cho xem đáp án thì không có phần xem lại', async () => {
    open(1, resultOf(1, { stars: 1, praise: 'Em đã hoàn thành bài rồi!' }));
    expect(await screen.findByText('Em đã hoàn thành bài rồi!')).toBeInTheDocument();
    expect(screen.getByText('1 trên 3 sao')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cùng xem đáp án nhé' })).not.toBeInTheDocument();
  });
});

describe('Kết quả bài làm — cấp 2 (điểm và đáp án)', () => {
  it('điểm, câu đúng, câu sai, bỏ trống, thời gian làm; xem lại từng câu đúng hoặc sai kèm giải thích', async () => {
    const result = resultOf(2, {
      answersShown: true,
      badges: [{ code: 'ON_TIME', name: 'Nộp đúng hạn', description: 'Em tự nộp bài trước khi hết giờ.' }],
      questions: [
        reviewOf(single, { selectedIndex: 0 }, { isCorrect: false, pointEarned: 0 }),
        reviewOf(ordering, { order: [0, 1, 2] }, { isCorrect: false, partsCorrect: 1, partsTotal: 3, pointEarned: 0.33, explanation: 'Thứ tự đúng: khởi công, hoàn thành, UNESCO.' }),
      ],
    });
    open(2, result);

    expect(await screen.findByRole('heading', { level: 1, name: /Kiểm tra 15 phút: Kinh thành Huế/ })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-2');
    expect(screen.getByText('Em đạt 8/10 điểm (8/10 câu đúng) trong 12 phút 30 giây.')).toBeInTheDocument();
    for (const label of ['Điểm', 'Câu đúng', 'Câu sai', 'Bỏ trống']) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();

    const first = screen.getByRole('article', { name: 'Câu 1 của phần xem lại' });
    expect(within(first).getByText('Sai')).toBeInTheDocument();
    expect(within(first).getByText('Em đã chọn – chưa đúng')).toBeInTheDocument();
    expect(within(first).getByText('Đáp án đúng')).toBeInTheDocument();
    expect(within(first).getByText('Vua Gia Long cho khởi công Kinh thành năm 1805.')).toBeInTheDocument();
    const second = screen.getByRole('article', { name: 'Câu 2 của phần xem lại' });
    expect(within(second).getByText('Đúng 1 / 3 ý')).toBeInTheDocument();
    expect(within(second).getByText('Em đã xếp: Hoàn thành → Khởi công → UNESCO')).toBeInTheDocument();
    expect(within(second).getByRole('list', { name: 'Thứ tự đúng' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Huy hiệu của lượt này' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Phân tích theo chủ đề' })).not.toBeInTheDocument();
  });

  it('chỉ hiện năm câu đầu; nút "Xem … câu còn lại" mở nốt', async () => {
    const reviews = Array.from({ length: 7 }, (_, i) => reviewOf(questionOf({ questionId: 20 + i, content: `Câu số ${i + 1}?`, answer: { selectedIndex: 0 } }), { selectedIndex: 0 }));
    open(2, resultOf(2, { answersShown: true, questions: reviews, totalQuestions: 7 }));
    const user = userEvent.setup();
    expect(await screen.findAllByRole('article', { name: /của phần xem lại$/ })).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: 'Xem 2 câu còn lại' }));
    expect(screen.getAllByRole('article', { name: /của phần xem lại$/ })).toHaveLength(7);
  });

  it('lượt tự nộp khi hết giờ: câu thông báo hết giờ', async () => {
    open(2, resultOf(2, { status: 'EXPIRED', statusLabel: 'Hết giờ, tự nộp' }), { automatic: true });
    expect(await screen.findByText(/Đã hết thời gian làm bài\. Bài của em đã được nộp tự động/)).toBeInTheDocument();
  });
});

describe('Kết quả bài làm — cấp 3 (phân tích)', () => {
  it('thêm bảng phân tích theo di sản và dạng câu, đánh dấu chủ đề dưới 50% cần ôn', async () => {
    const result = resultOf(3, {
      analysis: {
        byHeritage: [
          { heritageId: 1, questionType: null, name: 'Quần thể di tích Cố đô Huế', answered: 6, correct: 5, ratePercent: 83.3 },
          { heritageId: 2, questionType: null, name: 'Nhã nhạc', answered: 4, correct: 1, ratePercent: 25 },
        ],
        byQuestionType: [{ heritageId: null, questionType: 'SINGLE_CHOICE', name: 'Một đáp án đúng', answered: 5, correct: 4, ratePercent: 80 }],
        heritagesToReview: [{ heritageId: 2, questionType: null, name: 'Nhã nhạc', answered: 4, correct: 1, ratePercent: 25 }],
        partsCorrect: 7,
        partsTotal: 10,
      },
    });
    open(3, result);

    expect(await screen.findByRole('heading', { name: 'Phân tích theo chủ đề' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-3');
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    const hue = rows.find((r) => within(r).queryByText('Quần thể di tích Cố đô Huế'))!;
    expect(within(hue).getByText('5 / 6')).toBeInTheDocument();
    expect(within(hue).getByText('83,3%')).toBeInTheDocument();
    expect(within(hue).getByText('Ổn')).toBeInTheDocument();
    const nhac = rows.find((r) => within(r).queryByText('Nhã nhạc'))!;
    expect(within(nhac).getByText('Cần ôn')).toBeInTheDocument();
    expect(screen.getByText('Gợi ý ôn tương ứng')).toBeInTheDocument();
    expect(screen.getByText(/Em đúng 7 \/ 10 ý của các câu nhiều phần/)).toBeInTheDocument();
  });
});

describe('Kết quả bài làm — lỗi', () => {
  it('lượt của em khác hoặc không có: hiện câu của máy chủ, không lộ dữ liệu', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(studentServer(student), (call) => (call.path === ATTEMPT_ENDPOINTS.result(31) ? envelope(404, { errorCode: 'BLOCKED', message: 'Không tìm thấy bài làm.' }) : undefined));
    renderApp('/ket-qua/31');
    expect(await screen.findByText('Không tìm thấy bài làm.')).toBeInTheDocument();
  });
});
