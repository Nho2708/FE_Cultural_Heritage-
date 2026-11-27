import { LEVEL_ONE_FIXED_PHRASES } from '@dsvhvn/dung-chung';
import { ATTEMPT_ENDPOINTS, type StudentHome } from '@dsvhvn/dung-chung/api';
import { resetSpeechNotice, setTtsAccessTokenProvider } from '@dsvhvn/dung-chung/lesson';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { classLessonOf, homeOf } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Trang học cấp 1: bài thầy cô đã xuất bản hiện thẳng trên con đường (không phải gõ mã), thẻ "Bài thầy cô giao", lượt đang dở thành
// "Chơi tiếp", cuối đường là album di sản, nhập mã chỉ là lối phụ; hai ô số là sao và "Ngày đã học", không emoji.

function open(home: StudentHome) {
  const student = studentOf(2, { fullName: 'Lê Minh An' });
  signInAs(student);
  mockApi((call) => (call.path === ATTEMPT_ENDPOINTS.home ? envelope(200, { data: home }) : undefined), studentServer(student));
  return renderApp('/hoc');
}

const lessons = [
  classLessonOf(1, { title: 'Bánh chưng ngày Tết', accessCode: 'BH111111', completed: true, stars: 3, quizzesDone: 1 }),
  classLessonOf(2, { title: 'Chùa Một Cột', accessCode: 'BH222222', thumbnailUrl: 'https://anh.test/chua.jpg' }),
  classLessonOf(3, { title: 'Đèn ông sao', accessCode: 'BH333333' }),
];

const EMOJI = /\p{Extended_Pictographic}/u;

describe('Trang học — cấp 1', () => {
  it('lời chào, lời cổ vũ, sao và ngày đã học; thẻ bài thầy cô giao mở bài nên học bằng mã có sẵn', async () => {
    open(homeOf(1, { classLessons: lessons, totalStars: 12, streakDays: 4, cheer: 'Hôm nay mình học bài “Chùa Một Cột” nhé!', albumCollected: 1, albumTotal: 5 }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Chào An!' })).toBeInTheDocument();
    expect(await screen.findByText('Hôm nay mình học bài “Chùa Một Cột” nhé!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '12 sao' })).toHaveAttribute('href', '/tien-do');
    expect(screen.getByRole('link', { name: '4 ngày đã học' })).toBeInTheDocument();
    expect(screen.queryByText(/Chăm chỉ/)).not.toBeInTheDocument();

    const today = screen.getByRole('region', { name: 'Chùa Một Cột' });
    expect(within(today).getByText('Bài Trần Văn Bình giao')).toBeInTheDocument();
    expect(within(today).getByRole('link', { name: 'Học bài này' })).toHaveAttribute('href', '/bai-hoc/BH222222');
    expect(document.querySelector('[data-bo-cuc="cap-1"]')?.textContent).not.toMatch(EMOJI);
  });

  it('con đường: trạm đã xong có sao, trạm nên học có "Học tiếp", trạm sau vẫn mở; cuối đường là album', async () => {
    open(homeOf(1, { classLessons: lessons, albumCollected: 1, albumTotal: 5 }));

    const path = await screen.findByRole('region', { name: 'Con đường bài học' });
    expect(within(path).getByRole('link', { name: 'Bánh chưng ngày Tết, đã học xong, 3 sao' })).toHaveAttribute('href', '/bai-hoc/BH111111');
    const current = within(path).getByRole('link', { name: 'Chùa Một Cột, học tiếp bài này' });
    expect(current).toHaveAttribute('href', '/bai-hoc/BH222222');
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(within(current).getByText('Học tiếp')).toBeInTheDocument();
    expect(within(path).getByRole('link', { name: 'Đèn ông sao' })).toHaveAttribute('href', '/bai-hoc/BH333333');
    expect(within(path).getByRole('link', { name: 'Album di sản, em có 1 thẻ' })).toHaveAttribute('href', '/hoc/album');
    expect(within(path).getByText('Album di sản · 1 thẻ')).toBeInTheDocument();
  });

  it('có lượt đang dở: thẻ thành "Em đang chơi dở" và nút Chơi tiếp vào thẳng bài chơi', async () => {
    const { router } = open(
      homeOf(1, {
        classLessons: lessons,
        inProgress: [{ attemptId: 31, quizId: 9, quizName: 'Đố vui Chùa Một Cột', lessonId: 2, lessonTitle: 'Chùa Một Cột', startedAt: '2026-10-25T01:00:00Z', deadline: null, remainingSeconds: null }],
      }),
    );
    const today = await screen.findByRole('region', { name: 'Đố vui Chùa Một Cột' });
    expect(within(today).getByText('Em đang chơi dở')).toBeInTheDocument();
    const link = within(today).getByRole('link', { name: 'Chơi tiếp' });
    expect(link).toHaveAttribute('href', '/bai-hoc/BH222222/kiem-tra/9');
    await userEvent.setup().click(link);
    await waitFor(() => expect(router.state.location.pathname).toBe('/bai-hoc/BH222222/kiem-tra/9'));
    expect(router.state.location.state).toEqual({ confirmed: true });
  });

  it('học hết các bài: lời khen và nút Xem album', async () => {
    open(homeOf(1, { classLessons: lessons.map((l) => ({ ...l, completed: true })) }));
    const done = await screen.findByRole('region', { name: 'Em học hết các bài rồi!' });
    expect(within(done).getByRole('link', { name: 'Xem album' })).toHaveAttribute('href', '/hoc/album');
  });

  it('lớp chưa có bài: không có con đường; nhập mã là lối phụ; thẻ Lớp của em gọn, có mã học sinh; không khối gợi ý và danh sách cũ', async () => {
    open(homeOf(1, { cheer: 'Thầy cô chưa giao bài nào. Em quay lại sau nhé!' }));
    expect(await screen.findByText('Thầy cô chưa giao bài nào. Em quay lại sau nhé!')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Con đường bài học' })).not.toBeInTheDocument();
    const code = screen.getByRole('region', { name: 'Thầy cô đưa mã bài?' });
    expect(within(code).getByRole('link', { name: 'Nhập mã' })).toHaveAttribute('href', '/nhap-ma');
    const classBlock = screen.getByRole('region', { name: 'Lớp của em' });
    expect(within(classBlock).getByText('2A1')).toBeInTheDocument();
    expect(within(classBlock).getByText('HS8K2QX7')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Bài chơi đang chờ em' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Gợi ý cho em' })).not.toBeInTheDocument();
  });

  it('dữ liệu máy chủ không có classLessons (API phiên bản cũ): không làm hỏng trang, vẫn hiện thông tin em và lớp', async () => {
    const rawHome = homeOf(1, { cheer: 'Chào em!' });
    // @ts-expect-error Mô phỏng backend chưa có thuộc tính classLessons
    delete rawHome.classLessons;
    open(rawHome);

    expect(await screen.findByRole('heading', { level: 1, name: 'Chào An!' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Con đường bài học' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Thầy cô đưa mã bài?' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Lớp của em' })).toBeInTheDocument();
  });

  describe('giọng đọc của máy chủ', () => {
    afterEach(() => {
      setTtsAccessTokenProvider(() => null);
      resetSpeechNotice();
    });

    function openSigned(home: StudentHome) {
      setTtsAccessTokenProvider(() => 'token-hoc-sinh');
      const student = studentOf(2, { fullName: 'Lê Minh An' });
      signInAs(student);
      return {
        calls: mockApi(
          (call) => {
            if (call.path === ATTEMPT_ENDPOINTS.home) return envelope(200, { data: home });
            if (call.path === '/tts/prefetch') return envelope(202, { data: { queued: 1 } });
            if (call.path === '/tts') return envelope(200, { data: { audioUrl: null } });
            return undefined;
          },
          studentServer(student),
        ),
        view: renderApp('/hoc'),
      };
    }

    const cheer = 'Hôm nay mình học bài “Chùa Một Cột” nhé!';

    it('vào trang học thì nhờ máy chủ tạo trước tiếng lời chào không tên, lời cổ vũ và các câu cố định của cấp 1', async () => {
      const { calls } = openSigned(homeOf(1, { classLessons: lessons, cheer }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Chào An!' })).toBeInTheDocument();

      const prefetched = () => calls.filter((c) => c.path === '/tts/prefetch').flatMap((c) => (c.body as { texts: string[] }).texts);
      await waitFor(() => expect(prefetched()).toContain(`Chào em! ${cheer}`));
      await waitFor(() => expect(prefetched()).toEqual(expect.arrayContaining([...LEVEL_ONE_FIXED_PHRASES])));
      expect(prefetched().join(' ')).not.toMatch(/Minh|An/u);
    });

    it('nút nghe lời chào gửi lời chào không có tên em; máy không có giọng tiếng Việt thì báo một câu ngắn', async () => {
      const { calls } = openSigned(homeOf(1, { classLessons: lessons, cheer }));
      await userEvent.setup().click(await screen.findByRole('button', { name: 'Nghe lời chào' }));

      await waitFor(() => expect(calls.some((c) => c.path === '/tts' && (c.body as { text: string }).text === `Chào em! ${cheer}`)).toBe(true));
      expect(calls.filter((c) => c.path === '/tts').map((c) => (c.body as { text: string }).text)).toEqual([`Chào em! ${cheer}`]);
      expect(await screen.findByText('Máy này chưa đọc được tiếng Việt')).toBeInTheDocument();
    });
  });
});
