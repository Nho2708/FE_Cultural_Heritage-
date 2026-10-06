import { ERROR_CODES } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { readPosition } from '../lessons/recent';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { heritageCardOf, quizOf, studentLessonOf, studentSectionOf } from '../test/lessonFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Trang bài học: ba bố cục riêng theo cấp của lớp em. Nội dung đã lọc theo khung của cấp, học sinh không chọn bố cục.

function open(grade: number, lesson: ReturnType<typeof studentLessonOf>) {
  const student = studentOf(grade);
  signInAs(student);
  mockApi(studentServer(student), (call) => (call.path === '/student/lessons/BH7F3K2Q' ? envelope(200, { data: lesson }) : undefined));
  return { student, ...renderApp('/bai-hoc/BH7F3K2Q') };
}

const story = (n: number) =>
  studentSectionOf({ type: 'STORY', title: `Câu ngắn ${n}`, body: `Đoạn truyện số ${n}.`, imageUrl: `https://anh.test/${n}.jpg`, sortOrder: n });

describe('Bài học — cấp 1 (kể chuyện từng bước)', () => {
  const lesson = studentLessonOf(1, {
    sections: [story(1), story(2), story(3), studentSectionOf({ type: 'IMAGE', body: 'Ngọ Môn nhìn từ phía nam.', imageUrl: 'https://anh.test/i.jpg', sortOrder: 4 })],
    quizzes: [quizOf(1, { name: 'Chơi cùng bạn Na' })],
  });

  it('bố cục cấp 1: luồng Nghe chuyện, Xem hình, Chơi, Nhận sao; mỗi lần một đoạn có hình lớn; nút Tiếp nhé', async () => {
    const { student } = open(4, lesson);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Ngọ Môn và Kinh thành Huế' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    const steps = screen.getByRole('list', { name: 'Các bước của bài' });
    expect(within(steps).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Nghe chuyện', 'Xem hình', 'Chơi', 'Nhận sao']);
    expect(screen.getByText('Đoạn 1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Đoạn truyện số 1.')).toBeInTheDocument();
    expect(screen.queryByText('Đoạn truyện số 2.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByText('Đoạn 2 / 3')).toBeInTheDocument();
    expect(screen.getByText('Đoạn truyện số 2.')).toBeInTheDocument();
    expect(readPosition(student.id, 'BH7F3K2Q')).toEqual({ step: 0, part: 1 });
  });

  it('đi hết câu chuyện sang Xem hình, Chơi (bài kiểm tra kèm trạng thái) rồi Nhận sao; ra giữa chừng thì lần sau mở đúng bước', async () => {
    const { student, unmount } = open(4, lesson);
    const user = userEvent.setup();
    await screen.findByText('Đoạn 1 / 3');
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByText('Ngọ Môn nhìn từ phía nam.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByRole('heading', { name: 'Bài chơi của em' })).toBeInTheDocument();
    expect(screen.getByText('Chơi cùng bạn Na')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Làm bài/ })).toBeInTheDocument();
    expect(readPosition(student.id, 'BH7F3K2Q').step).toBe(2);

    unmount();
    mockApi(studentServer(student), (call) => (call.path === '/student/lessons/BH7F3K2Q' ? envelope(200, { data: lesson }) : undefined));
    renderApp('/bai-hoc/BH7F3K2Q');
    expect(await screen.findByRole('heading', { name: 'Bài chơi của em' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByRole('heading', { name: 'Em học xong rồi! Giỏi quá!' })).toBeInTheDocument();
    expect(screen.getByText('Ngọ Môn là cổng chính.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang học' })).toHaveAttribute('href', '/hoc');
  });
});

describe('Bài học — cấp 2 (bài đọc và dòng thời gian)', () => {
  const lesson = studentLessonOf(2, {
    sections: [
      studentSectionOf({ type: 'IMAGE', body: 'Ngọ Môn nhìn từ phía nam.', imageUrl: 'https://anh.test/ngo-mon.jpg', image: { caption: null, credit: 'Quần thể di tích Cố đô Huế', author: null, license: 'CC BY-SA', source: null }, sortOrder: 1 }),
      studentSectionOf({ type: 'MILESTONE', body: 'Khởi công xây Kinh thành.', milestoneYear: 1805, milestoneLabel: '1805', sortOrder: 2 }),
      studentSectionOf({ type: 'MILESTONE', body: 'Hoàn thành Kinh thành.', milestoneYear: 1832, milestoneLabel: '1832', sortOrder: 3 }),
    ],
    quizzes: [
      quizOf(1, { name: 'Kiểm tra 15 phút', state: 'OPEN', stateLabel: 'Đang mở' }),
      quizOf(2, { name: 'Kiểm tra nhanh', state: 'IN_PROGRESS', stateLabel: 'Em đang làm' }),
      quizOf(3, { name: 'Ôn tập', state: 'CLOSED', stateLabel: 'Đã đóng' }),
    ],
  });

  it('bố cục cấp 2: ba tab chuyển tự do, bài đọc có hình và ghi công, ý chính đánh số, thẻ di sản, bài kiểm tra bên phải', async () => {
    open(7, lesson);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Ngọ Môn và Kinh thành Huế' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-2');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Đọc bài', 'Dòng thời gian của bài', 'Bài kiểm tra']);
    expect(screen.getByText('Kinh thành Huế được xây dựng từ năm 1805.')).toBeInTheDocument();
    expect(screen.getByText(/CC BY-SA/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ý chính' })).toBeInTheDocument();
    const aside = screen.getByRole('complementary');
    expect(within(aside).getByRole('button', { name: /^Làm bài/ })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /^Làm tiếp/ })).toBeInTheDocument();
    expect(within(aside).getByText('Đã đóng')).toBeInTheDocument();
    expect(within(aside).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute('href', '/di-san/quan-the-co-do-hue');

    await user.click(screen.getByRole('tab', { name: 'Dòng thời gian của bài' }));
    const items = screen.getAllByRole('listitem').filter((li) => /Khởi công|Hoàn thành/.test(li.textContent ?? ''));
    expect(items.map((li) => li.textContent)).toEqual(['1805Khởi công xây Kinh thành.', '1832Hoàn thành Kinh thành.']);

    await user.click(screen.getByRole('tab', { name: 'Bài kiểm tra' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByText('Kiểm tra 15 phút')).toBeInTheDocument();
  });
});

describe('Bài học — cấp 3 (tài liệu)', () => {
  const lesson = studentLessonOf(3, {
    sections: [
      studentSectionOf({ type: 'READING', title: 'Bối cảnh', body: 'Năm 1010, vua Lý dời đô.', sortOrder: 1 }),
      studentSectionOf({ type: 'READING', title: 'Ý nghĩa', body: 'UNESCO ghi danh năm 2010.', sortOrder: 2 }),
      studentSectionOf({ type: 'SOURCE_EXCERPT', body: 'Đóng đô ở Đại La, trung tâm trời đất.', sourceCitation: 'Lý Công Uẩn, Chiếu dời đô', sortOrder: 3 }),
      studentSectionOf({ type: 'MILESTONE', body: 'Dời đô.', milestoneYear: 1010, milestoneLabel: '1010', sortOrder: 4 }),
      studentSectionOf({ type: 'REFLECTION', body: 'Vì sao dời đô?', sortOrder: 5 }),
    ],
    heritages: [heritageCardOf(), heritageCardOf({ id: 12, slug: 'nha-nhac', name: 'Nhã nhạc cung đình Huế', latitude: null, longitude: null, hasTimeline: false })],
    quizzes: [quizOf(1, { name: 'Kiểm tra 45 phút', timeLimitMinutes: 45 }), quizOf(2, { name: 'Ôn tập', state: 'SUBMITTED', stateLabel: 'Em đã làm' })],
  });

  it('bố cục cấp 3: mục lục theo các phần của bài, đề mục, đoạn trích có nguồn, câu hỏi không chấm điểm, liên kết và bài kiểm tra dạng dòng', async () => {
    open(11, lesson);

    expect(await screen.findByRole('heading', { level: 1, name: 'Ngọ Môn và Kinh thành Huế' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-3');
    const toc = screen.getByRole('navigation', { name: 'Mục lục' });
    expect(within(toc).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Nội dung chính',
      'Bối cảnh',
      'Ý nghĩa',
      'Các mốc thời gian',
      'Tư liệu gốc',
      'Câu hỏi gợi suy nghĩ',
      'Ý chính',
      'Liên kết',
      'Bài kiểm tra của bài',
    ]);
    expect(within(toc).getByRole('link', { name: 'Bối cảnh' })).toHaveAttribute('href', '#phan-1');
    expect(screen.getByRole('heading', { name: 'Bối cảnh' })).toBeInTheDocument();
    expect(screen.getByText(/Đóng đô ở Đại La/)).toBeInTheDocument();
    expect(screen.getByText('Nguồn: Lý Công Uẩn, Chiếu dời đô')).toBeInTheDocument();
    expect(screen.getByText(/không chấm điểm và không lưu câu trả lời/)).toBeInTheDocument();
    expect(screen.getByText('Vì sao dời đô?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chi tiết di sản: Quần thể di tích Cố đô Huế/ })).toHaveAttribute('href', '/di-san/quan-the-co-do-hue');
    expect(screen.getByText(/đồng hồ đếm ngược/)).toBeInTheDocument();
    expect(screen.getByText('Kiểm tra 45 phút')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Làm bài/ })).toBeInTheDocument();
    expect(screen.getByText('Em đã làm')).toBeInTheDocument();
    expect(document.querySelector('figure[data-bo-hinh]')).toBeNull();
  });
});

describe('Bài học — lỗi mở bài', () => {
  it('mã đúng dạng nhưng sai / chưa xuất bản / lớp khác: cùng một câu và lối nhập mã khác', async () => {
    const student = studentOf(7);
    signInAs(student);
    const wrong = 'Mã bài học chưa đúng hoặc không dành cho lớp của em. Em hãy kiểm tra lại mã thầy cô đã đưa.';
    mockApi(studentServer(student), (call) => (call.path.startsWith('/student/lessons/') ? envelope(404, { errorCode: ERROR_CODES.blocked, message: wrong }) : undefined));
    renderApp('/bai-hoc/BH7F3K2Q');

    expect(await screen.findByText(wrong)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nhập mã khác' })).toHaveAttribute('href', '/nhap-ma');
  });

  it('mã sai dạng trên đường dẫn: báo ngay, không gọi máy chủ', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student));
    renderApp('/bai-hoc/ABC');
    expect(await screen.findByText(/Mã bài học gồm 8 ký tự, bắt đầu bằng BH/)).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.path.startsWith('/student/lessons/'))).toBe(false));
  });

  it('nhập sai quá nhiều lần: hiện câu chặn của máy chủ', async () => {
    const student = studentOf(7);
    signInAs(student);
    const blocked = 'Em đã nhập sai mã quá nhiều lần. Em hãy thử lại sau 10 phút.';
    mockApi(studentServer(student), (call) => (call.path.startsWith('/student/lessons/') ? envelope(429, { errorCode: ERROR_CODES.blocked, message: blocked }) : undefined));
    renderApp('/bai-hoc/BH7F3K2Q');
    expect(await screen.findByText(blocked)).toBeInTheDocument();
  });
});
