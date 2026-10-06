import { ATTEMPT_ENDPOINTS, RECOMMENDATION_ENDPOINTS, type RecommendedHeritage, type SchoolLevel, type StudentRecommendations } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { homeOf, recommendationsOf, resultOf } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// "Gợi ý cho em": năm phần ở Trang học và ở Kết quả bài làm, ba cách trình bày theo cấp, không lộ mã bài học mới, cấp 1 không số hay phần trăm.

const heritage = (id: number, name: string, reason: string, slug = `di-san-${id}`): RecommendedHeritage => ({
  heritageId: id,
  slug,
  name,
  thumbnailUrl: null,
  shortDescription: null,
  provinceName: 'Thành phố Huế',
  typeName: 'Vật thể',
  reason,
});

function full(level: SchoolLevel): StudentRecommendations {
  const exact = level !== 1;
  return recommendationsOf(level, {
    nextQuizzes: [
      { quizId: 9, name: 'Kiểm tra 15 phút: Kinh thành Huế', lessonId: 5, lessonTitle: 'Ngọ Môn', closeAt: '2026-10-30T10:00:00Z', difficultyLevel: 'MEDIUM', difficultyName: 'Trung bình', needsLessonCode: false, label: null, reason: exact ? 'Em đang làm dở, đóng lúc 17:00 08/10/2026' : 'Em còn bài đang làm dở' },
      { quizId: 12, name: 'Kiểm tra 30 phút: Hội An', lessonId: 8, lessonTitle: 'Đô thị cổ Hội An', closeAt: null, difficultyLevel: 'EASY', difficultyName: 'Dễ', needsLessonCode: true, label: 'Cần mã bài học', reason: 'Bài mới của lớp' },
    ],
    lessonsToReview: [{ lessonId: 5, title: 'Ngọ Môn và Kinh thành Huế', accessCode: 'BH7F3K2Q', hint: null, reason: exact ? 'Lượt gần nhất em đúng 6 / 10 câu' : 'Em ôn lại bài này nhé' }],
    heritagesToReview: [heritage(11, 'Văn Miếu – Quốc Tử Giám', exact ? 'Tỉ lệ đúng 40% ở di sản này' : 'Em xem lại di sản này nhé', 'van-mieu')],
    relatedHeritages: [heritage(21, 'Nhã nhạc – Âm nhạc cung đình Việt Nam', 'Cùng Thành phố Huế với bài em học')],
    newLessons: [{ lessonId: 8, title: 'Đô thị cổ Hội An', accessCode: null, hint: 'Nhờ thầy cô đưa mã bài học', reason: 'Bài mới của lớp em' }],
  });
}

function open(level: SchoolLevel, recommendations: StudentRecommendations, path = '/hoc') {
  const student = studentOf(level === 1 ? 4 : level === 3 ? 11 : 7);
  signInAs(student);
  const calls = mockApi(
    (call) => (call.path === RECOMMENDATION_ENDPOINTS.student ? envelope(200, { data: recommendations }) : undefined),
    (call) => (call.path === RECOMMENDATION_ENDPOINTS.attempt(31) ? envelope(200, { data: { ...recommendations, attemptId: 31 } }) : undefined),
    (call) => (call.path === ATTEMPT_ENDPOINTS.result(31) ? envelope(200, { data: resultOf(level) }) : undefined),
    (call) =>
      call.path === ATTEMPT_ENDPOINTS.home
        ? envelope(200, { data: homeOf(level, { myLessons: [{ lessonId: 5, title: 'Ngọ Môn', accessCode: 'BH7F3K2Q', quizzesDone: 1, quizzesPublished: 2, lastAttemptAt: null }] }) })
        : undefined,
    studentServer(student),
  );
  return { calls, view: renderApp(path) };
}

describe('Gợi ý cho em — Trang học cấp 2', () => {
  it('thẻ có nhãn phần, tiêu đề, lý do và liên kết đúng; bài của bài học chưa mở có nhãn Cần mã bài học và dẫn về ô nhập mã', async () => {
    open(2, full(2));
    const section = await screen.findByRole('region', { name: 'Gợi ý cho em' });
    const list = await within(section).findByRole('list', { name: 'Gợi ý cho em' });

    const quiz = within(list).getByRole('heading', { name: 'Kiểm tra 15 phút: Kinh thành Huế' }).closest('li')!;
    expect(within(quiz).getByText('Bài kiểm tra nên làm tiếp')).toBeInTheDocument();
    expect(within(quiz).getByText('Em đang làm dở, đóng lúc 17:00 08/10/2026')).toBeInTheDocument();
    expect(within(quiz).getByRole('link', { name: /Làm bài/ })).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q/kiem-tra/9');

    const locked = within(list).getByRole('heading', { name: 'Kiểm tra 30 phút: Hội An' }).closest('li')!;
    expect(within(locked).getByText('Cần mã bài học')).toBeInTheDocument();
    expect(within(locked).getByRole('link', { name: /Nhập mã bài học/ })).toHaveAttribute('href', '/nhap-ma');

    const lesson = within(list).getByRole('heading', { name: 'Ngọ Môn và Kinh thành Huế' }).closest('li')!;
    expect(within(lesson).getByRole('link', { name: /Xem lại bài học/ })).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q');

    const weak = within(list).getByRole('heading', { name: 'Văn Miếu – Quốc Tử Giám' }).closest('li')!;
    expect(within(weak).getByText('Tỉ lệ đúng 40% ở di sản này')).toBeInTheDocument();
    expect(within(weak).getByRole('link', { name: /Xem chi tiết/ })).toHaveAttribute('href', '/di-san/van-mieu');
    expect(within(list).getByText('Di sản liên quan')).toBeInTheDocument();
  });

  it('bài học mới chỉ có tiêu đề và câu nhờ thầy cô, không có liên kết và không lộ mã', async () => {
    open(2, full(2));
    const list = await screen.findByRole('list', { name: 'Gợi ý cho em' });
    const fresh = within(list).getByRole('heading', { name: 'Đô thị cổ Hội An' }).closest('li')!;
    expect(within(fresh).getByText('Nhờ thầy cô đưa mã bài học')).toBeInTheDocument();
    expect(within(fresh).queryByRole('link')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/BH[A-Z0-9]{6}.*Đô thị cổ/);
  });

  it('làm đúng hết: phần di sản nên ôn thay bằng lời khen', async () => {
    open(2, recommendationsOf(2, { reviewPraise: 'Em làm đúng hết! Hãy khám phá thêm di sản mới.', relatedHeritages: [heritage(21, 'Nhã nhạc', 'Cùng tỉnh')] }));
    expect(await screen.findByText('Em làm đúng hết! Hãy khám phá thêm di sản mới.')).toBeInTheDocument();
    expect(screen.queryByText('Di sản nên ôn')).not.toBeInTheDocument();
  });

  it('chưa có lượt nào: lời mời nhập mã bài học; không có gợi ý gì và không có lời mời thì không hiện khối', async () => {
    const first = open(2, recommendationsOf(2, { message: 'Hãy nhập mã bài học thầy cô đưa để nhận gợi ý.' }));
    expect(await screen.findByText('Hãy nhập mã bài học thầy cô đưa để nhận gợi ý.')).toBeInTheDocument();
    first.view.unmount();

    open(2, recommendationsOf(2));
    await screen.findByRole('heading', { level: 1, name: 'Trang học của em' });
    expect(screen.queryByRole('region', { name: 'Gợi ý cho em' })).not.toBeInTheDocument();
  });

  it('không tải được: báo lỗi có nút Thử lại ngay trong khối gợi ý, các khối khác vẫn hiện', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(
      (call) => (call.path === RECOMMENDATION_ENDPOINTS.student ? envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Hệ thống đang gặp sự cố.' }) : undefined),
      studentServer(student),
    );
    renderApp('/hoc');
    const section = await screen.findByRole('region', { name: 'Gợi ý cho em' }, { timeout: 5000 });
    expect(await within(section).findByRole('button', { name: 'Thử lại' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Lớp của em' })).toBeInTheDocument();
  });
});

describe('Gợi ý cho em — Trang học cấp 1', () => {
  it('thẻ hình với nhãn ngắn, không có số hay phần trăm, bài mới chỉ có câu nhờ thầy cô', async () => {
    open(1, full(1));
    const list = await screen.findByRole('list', { name: 'Gợi ý cho em' });
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(within(list).getAllByText('Chơi tiếp')).toHaveLength(2);
    expect(within(list).getByText('Ôn lại bài')).toBeInTheDocument();
    expect(within(list).getByText('Di sản giống bài em học')).toBeInTheDocument();
    expect(within(list).getByText('Bài mới')).toBeInTheDocument();
    expect(within(list).getByText('Nhờ thầy cô đưa mã bài học')).toBeInTheDocument();
    expect(list).not.toHaveTextContent(/%|\d+\s*\/\s*\d+/);
    expect(within(list).getByRole('link', { name: 'Văn Miếu – Quốc Tử Giám' })).toHaveAttribute('href', '/di-san/van-mieu');
  });
});

describe('Gợi ý cho em — Trang học cấp 3', () => {
  it('danh sách dạng dòng theo nhóm, mỗi dòng có "Lý do:"; mục lục có Gợi ý', async () => {
    open(3, full(3));
    const group = await screen.findByRole('region', { name: 'Di sản nên ôn' });
    expect(within(group).getByText('Lý do: Tỉ lệ đúng 40% ở di sản này')).toBeInTheDocument();
    expect(within(group).getByRole('link', { name: /Xem chi tiết/ })).toHaveAttribute('href', '/di-san/van-mieu');
    expect(screen.getByRole('region', { name: 'Bài học mới nên học' })).toHaveTextContent('Lý do: Bài mới của lớp em');
    expect(screen.getByRole('region', { name: 'Bài học mới nên học' })).toHaveTextContent('Nhờ thầy cô đưa mã bài học');
    expect(within(screen.getByRole('navigation', { name: 'Mục lục' })).getByRole('link', { name: 'Gợi ý' })).toHaveAttribute('href', '#goi-y');
  });
});

describe('Gợi ý cho em — Kết quả bài làm', () => {
  it('gọi gợi ý theo lượt đang xem và hiện ở cấp 2', async () => {
    const { calls } = open(2, full(2), '/ket-qua/31');
    expect(await screen.findByRole('region', { name: 'Gợi ý cho em' })).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Gợi ý cho em' });
    expect(calls.some((c) => c.path === RECOMMENDATION_ENDPOINTS.attempt(31))).toBe(true);
    expect(calls.some((c) => c.path === RECOMMENDATION_ENDPOINTS.student)).toBe(false);
  });

  it('cấp 1: kết quả vẫn không có điểm hay phần trăm khi có gợi ý', async () => {
    open(1, full(1), '/ket-qua/31');
    const list = await screen.findByRole('list', { name: 'Gợi ý cho em' });
    expect(list).not.toHaveTextContent('%');
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });
});
