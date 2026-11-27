import { ERROR_CODES, STUDENT_ENDPOINTS, type LessonCompletion, type StudentRecall } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { readPosition } from '../lessons/recent';
import { envelope, mockApi, studentOf, studentServer, type FetchCall } from '../test/fixtures';
import { albumCardOf } from '../test/quizFixtures';
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
  const completion: LessonCompletion = {
    lessonId: 5,
    firstTime: true,
    cards: [albumCardOf(11, { name: 'Quần thể di tích Cố đô Huế' })],
    albumCollected: 5,
    albumTotal: 12,
    takeHome: 'Nhà mình đã từng đi thăm Quần thể di tích Cố đô Huế hay một di tích nào gần nhà chưa?',
  };
  const server = (recall: StudentRecall) => (call: FetchCall) => {
    if (call.path === STUDENT_ENDPOINTS.lessonRecall('BH7F3K2Q')) return envelope(200, { data: recall });
    if (call.path === STUDENT_ENDPOINTS.lessonComplete('BH7F3K2Q') && call.method === 'POST') return envelope(200, { data: completion });
    return undefined;
  };
  const openLevelOne = (recall: StudentRecall = { questions: [] }) => {
    const student = studentOf(4);
    signInAs(student);
    const calls = mockApi(studentServer(student), server(recall), (call) => (call.path === '/student/lessons/BH7F3K2Q' ? envelope(200, { data: lesson }) : undefined));
    return { student, calls, ...renderApp('/bai-hoc/BH7F3K2Q') };
  };

  it('chưa có câu ôn: bỏ bước Nhớ lại; bốn bước, mỗi lần một đoạn có hình lớn, chấm tròn cho các đoạn, nút Tiếp nhé', async () => {
    const { student } = openLevelOne();
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { level: 1, name: 'Ngọ Môn và Kinh thành Huế' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(await screen.findByText('· bước 1 trên 4')).toBeInTheDocument();
    const steps = screen.getByRole('navigation', { name: 'Các bước của bài' });
    expect(within(steps).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Nghe chuyện, đang học', 'Xem hình', 'Chơi', 'Nhận thẻ']);
    expect(screen.getByRole('link', { name: 'Về trang học' })).toHaveAttribute('href', '/hoc');
    expect(screen.getByText('Đoạn 1 trên 3')).toBeInTheDocument();
    expect(screen.getByText('Đoạn truyện số 1.')).toBeInTheDocument();
    expect(screen.queryByText('Đoạn truyện số 2.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Em ra ngoài giữa chừng/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByText('Đoạn 2 trên 3')).toBeInTheDocument();
    expect(screen.getByText('Đoạn truyện số 2.')).toBeInTheDocument();
    expect(readPosition(student.id, 'BH7F3K2Q')).toEqual({ step: 1, part: 1 });
  });

  it('có câu ôn của bài trước: bắt đầu bằng Nhớ lại, chạm là biết ngay rồi sang Nghe chuyện', async () => {
    const recall: StudentRecall = {
      questions: [
        {
          questionId: 70,
          questionType: 'TRUE_FALSE',
          content: 'Bánh chưng có hình vuông.',
          imageUrl: null,
          options: [
            { content: 'Đúng', imageUrl: null },
            { content: 'Sai', imageUrl: null },
          ],
          correctIndex: 0,
          explanation: 'Bánh chưng hình vuông, gói bằng lá dong.',
          heritageName: 'Bánh chưng',
          lessonTitle: 'Bánh chưng ngày Tết',
        },
      ],
    };
    const { calls } = openLevelOne(recall);
    const user = userEvent.setup();
    expect(await screen.findByText('Bánh chưng có hình vuông.')).toBeInTheDocument();
    expect(calls.some((c) => c.path === STUDENT_ENDPOINTS.lessonRecall('BH7F3K2Q'))).toBe(true);
    expect(screen.getByText('· bước 1 trên 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đúng' }));
    expect(screen.getByText('Đúng rồi!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nghe chuyện mới' }));
    expect(screen.getByText('Đoạn truyện số 1.')).toBeInTheDocument();
    expect(screen.getByText('· bước 2 trên 5')).toBeInTheDocument();
  });

  it('đi hết câu chuyện sang Xem hình, Chơi rồi Nhận thẻ; ra giữa chừng thì lần sau mở đúng bước; nhận thẻ ghi bài đã học xong một lần', async () => {
    const { student, unmount } = openLevelOne();
    const user = userEvent.setup();
    await screen.findByText('Đoạn 1 trên 3');
    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByText('Ngọ Môn nhìn từ phía nam.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByRole('heading', { name: 'Bài chơi của em' })).toBeInTheDocument();
    expect(screen.getByText('Chơi cùng bạn Na')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Bắt đầu chơi/ })).toBeInTheDocument();
    expect(readPosition(student.id, 'BH7F3K2Q').step).toBe(3);

    unmount();
    const { calls } = openLevelOne();
    expect(await screen.findByRole('heading', { name: 'Bài chơi của em' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(screen.getByRole('heading', { name: 'Em học xong bài rồi!' })).toBeInTheDocument();
    expect(await screen.findByText('Thẻ mới vào album')).toBeInTheDocument();
    expect(screen.getByText('Album của em có 5 thẻ')).toBeInTheDocument();
    expect(screen.getByText(completion.takeHome!)).toBeInTheDocument();
    expect(screen.getByText('Ngọ Môn là cổng chính.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về con đường' })).toHaveAttribute('href', '/hoc');
    expect(screen.getByRole('link', { name: 'Xem album' })).toHaveAttribute('href', '/hoc/album');
    expect(calls.filter((c) => c.path === STUDENT_ENDPOINTS.lessonComplete('BH7F3K2Q'))).toHaveLength(1);

    // Còn bài chơi làm được thì có lối quay về bài chơi.
    await user.click(screen.getByRole('button', { name: 'Chơi ngay' }));
    expect(screen.getByRole('heading', { name: 'Bài chơi của em' })).toBeInTheDocument();
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

  it('đường dẫn mang mã bài kiểm tra: chuyển thẳng tới bài kiểm tra', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(studentServer(student), (call) =>
      call.path === '/student/lessons/KT4M9P2R' ? envelope(200, { data: { ...studentLessonOf(2), accessCode: 'BH7F3K2Q', focusQuizId: 31 } }) : undefined,
    );
    const { router } = renderApp('/bai-hoc/KT4M9P2R');
    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH7F3K2Q/kiem-tra/31'));
  });

  it('mã sai dạng trên đường dẫn: báo ngay, không gọi máy chủ', async () => {
    const student = studentOf(7);
    signInAs(student);
    const calls = mockApi(studentServer(student));
    renderApp('/bai-hoc/ABC');
    expect(await screen.findByText(/Mã gồm 8 ký tự, bắt đầu bằng BH/)).toBeInTheDocument();
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
