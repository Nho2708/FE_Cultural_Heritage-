import { ATTEMPT_ENDPOINTS, type SchoolLevel, type StudentAttemptRow, type StudentProgress } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { progressOf, rowOf } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Tiến độ của em: cấp 1 là "Sao của em"; cấp 2 và 3 có bốn tab (Lịch sử bài làm, Tiến độ, Thành thạo, Huy hiệu).

function open(level: SchoolLevel, progress: StudentProgress, rows: StudentAttemptRow[], path = '/tien-do') {
  const student = studentOf(level === 1 ? 4 : level === 3 ? 11 : 7);
  signInAs(student);
  mockApi(
    (call) => (call.path === ATTEMPT_ENDPOINTS.progress ? envelope(200, { data: progress }) : undefined),
    (call) =>
      call.path.startsWith(ATTEMPT_ENDPOINTS.history)
        ? envelope(200, { data: { items: rows, page: 1, pageSize: 100, totalItems: rows.length, totalPages: 1 } })
        : undefined,
    studentServer(student),
  );
  return renderApp(path);
}

describe('Tiến độ của em — cấp 2 và 3', () => {
  const rows = [
    rowOf(3, { quizName: 'Kiểm tra 15 phút: Kinh thành Huế', score: 8, totalPoint: 10, percent: 80, submittedAt: '2026-09-29T01:12:00Z' }),
    rowOf(2, { quizName: 'Kiểm tra 10 phút: Văn Miếu', score: 5, totalPoint: 8, percent: 62.5, status: 'EXPIRED', statusLabel: 'Hết giờ, tự nộp', submittedAt: '2026-09-27T02:40:00Z' }),
    rowOf(1, { quizName: 'Ôn tập: Hoàng thành Thăng Long', score: 9, totalPoint: 10, percent: 90, submittedAt: '2026-09-25T07:05:00Z' }),
  ];

  it('tab Tiến độ mặc định: số bài đã làm, bài học hoàn thành, điểm trung bình và biểu đồ điểm theo thời gian', async () => {
    open(2, progressOf(2), rows);
    expect(await screen.findByRole('heading', { level: 1, name: 'Tiến độ của em' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-2');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Lịch sử bài làm', 'Tiến độ', 'Thành thạo', 'Huy hiệu']);
    expect(screen.getByRole('tab', { name: 'Tiến độ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    // (80 + 62,5 + 90) / 3 = 77,5
    expect(screen.getByText('77,5%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Điểm theo thời gian' })).toBeInTheDocument();
    expect(document.querySelector('svg title')?.textContent).toContain('Kiểm tra 10 phút: Văn Miếu: 62,5%');
    expect(document.querySelector('#scoreAreaGradient')).toBeInTheDocument();
  });

  it('tab Lịch sử bài làm: bảng bài, điểm, ngày nộp, trạng thái, liên kết xem kết quả', async () => {
    const user = userEvent.setup();
    open(2, progressOf(2), rows);
    await user.click(await screen.findByRole('tab', { name: 'Lịch sử bài làm' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    const expired = within(table).getAllByRole('row').find((r) => within(r).queryByText('Kiểm tra 10 phút: Văn Miếu'))!;
    expect(within(expired).getByText('5/8')).toBeInTheDocument();
    expect(within(expired).getByText('Hết giờ, tự nộp')).toBeInTheDocument();
    expect(within(expired).getByRole('link', { name: /Xem kết quả/ })).toHaveAttribute('href', '/ket-qua/2');
  });

  it('tab Thành thạo: tỉ lệ đúng theo di sản kèm nhãn mức thành thạo', async () => {
    const progress = progressOf(3, {
      mastery: [
        { heritageId: 1, name: 'Quần thể di tích Cố đô Huế', answered: 9, correct: 7, percent: 77.8, level: 'FAIR', label: 'Khá', stars: 2 },
        { heritageId: 2, name: 'Nhã nhạc', answered: 4, correct: 1, percent: 25, level: 'NEEDS_REVIEW', label: 'Cần ôn', stars: 1 },
      ],
    });
    open(3, progress, rows, '/tien-do?tab=thanh-thao');
    expect(await screen.findByRole('heading', { name: 'Tỉ lệ đúng theo di sản' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-3');
    expect(screen.getByText('Khá')).toBeInTheDocument();
    expect(screen.getByText('Cần ôn')).toBeInTheDocument();
    expect(screen.getByText('25% · 1/4 câu')).toBeInTheDocument();
  });

  it('tab Huy hiệu: huy hiệu đã đạt có ngày, huy hiệu chưa đạt có khóa và điều kiện', async () => {
    const progress = progressOf(2, {
      finishedAttempts: 3,
      badges: [{ code: 'EXCELLENT', name: 'Xuất sắc', description: 'Em đạt từ 90% số điểm của bài kiểm tra.', count: 1, lastEarnedAt: '2026-09-25T07:05:00Z', lastAttemptId: 1 }],
    });
    open(2, progress, rows, '/tien-do?tab=huy-hieu');
    expect(await screen.findByText(/^Đạt ngày/)).toBeInTheDocument();
    expect(screen.getByText('Chưa đạt · Nộp từ 5 bài kiểm tra')).toBeInTheDocument();
    expect(screen.getByText('Em đã nộp 3 / 5 lượt.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('chưa có bài làm nào: câu nhắc nhập mã và nút Nhập mã bài học', async () => {
    const user = userEvent.setup();
    open(2, progressOf(2, { quizzesSubmitted: 0, quizzesPublished: 0, lessonsCompleted: 0, lessonsWithQuiz: 0, finishedAttempts: 0 }), []);
    expect(await screen.findByText('Em chưa có bài làm nào. Em hãy nhập mã bài học thầy cô đưa để bắt đầu học.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nhập mã bài học' })).toHaveAttribute('href', '/nhap-ma');
    await user.click(screen.getByRole('tab', { name: 'Lịch sử bài làm' }));
    expect(screen.getByRole('link', { name: 'Nhập mã bài học' })).toBeInTheDocument();
  });
});

describe('Sao của em — cấp 1', () => {
  it('tổng số sao, bài gần nhất, sao từng bài, huy hiệu; không có điểm hay phần trăm; tab Bài đã học', async () => {
    const user = userEvent.setup();
    const rows = [
      rowOf(3, { quizName: 'Đố vui: Văn Miếu', stars: 3, score: null, totalPoint: null, percent: null }),
      rowOf(2, { quizName: 'Ghép hình: Cố đô Huế', stars: 2, score: null, totalPoint: null, percent: null }),
    ];
    const progress = progressOf(1, {
      totalStars: 24,
      finishedAttempts: 9,
      badges: [{ code: 'ON_TIME', name: 'Nộp đúng hạn', description: 'Em tự nộp bài trước khi hết giờ.', count: 1, lastEarnedAt: null, lastAttemptId: 3 }],
    });
    open(1, progress, rows);

    expect(await screen.findByRole('heading', { level: 1, name: 'Sao của em' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(screen.getByText('24 sao')).toBeInTheDocument();
    expect(screen.getByText('Em đã hoàn thành 9 bài')).toBeInTheDocument();
    expect(screen.getByText('Bài gần nhất: Đố vui: Văn Miếu')).toBeInTheDocument();
    expect(screen.getByText('Em được 3 sao!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sao của từng bài' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Huy hiệu của em' })).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Bài đã học' }));
    expect(screen.getAllByRole('link', { name: 'Xem kết quả ⭐' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Xem kết quả ⭐' })[0]).toHaveAttribute('href', '/ket-qua/3');
  });
});
