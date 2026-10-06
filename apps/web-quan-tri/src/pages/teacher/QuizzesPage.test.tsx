import { ERROR_CODES, type QuizRow } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { lessonRowOf, quotaOf } from '../../test/lessonFixtures';
import { pageOf } from '../../test/questionFixtures';
import { publishedQuizOf, quizOf, quizRowOf } from '../../test/quizFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Bài kiểm tra của tôi: bảng, lọc trên URL, đóng (hỏi xác nhận), nhân bản, xóa bài nháp, khóa theo gói, tạo bài kiểm tra từ một bài học.

const classPage = { items: [classOf(1, { name: '7A1' }), classOf(2, { name: '9A3', grade: 9 })], page: 1, pageSize: 100, totalItems: 2, totalPages: 1 };
const lessonPage = pageOf([
  lessonRowOf(5, { title: 'Ngọ Môn và Kinh thành Huế', status: 'PUBLISHED', accessCode: 'BH7F3K2Q' }),
  lessonRowOf(6, { title: 'Vịnh Hạ Long', status: 'DRAFT', className: '9A3', classId: 2 }),
  lessonRowOf(7, { title: 'Bài đã lưu trữ', status: 'ARCHIVED' }),
]);

function api(rows: QuizRow[], extra?: (call: FetchCall) => Response | undefined, quota = quotaOf()) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path.startsWith('/teacher/quizzes?')) return envelope(200, { data: pageOf(rows) });
      if (call.path.startsWith('/teacher/lessons?')) return envelope(200, { data: lessonPage });
      if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quota });
      if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: classPage });
      return undefined;
    },
  );
}

const PUBLISHED = quizRowOf(1, {
  name: 'Kiểm tra 15 phút: Kinh thành Huế',
  status: 'PUBLISHED',
  statusLabel: 'Đang phát hành',
  openState: 'OPEN',
  openAt: '2026-09-29T00:00:00Z',
  closeAt: '2026-09-30T10:00:00Z',
  timeLimitMinutes: 15,
  questionCount: 10,
  submittedCount: 18,
});
const CLOSED = quizRowOf(2, { name: 'Kiểm tra cuối bài', status: 'CLOSED', statusLabel: 'Đã đóng', openState: 'ENDED', questionCount: 12, timeLimitMinutes: 20, submittedCount: 31 });
const DRAFT = quizRowOf(3, { name: 'Khu đền tháp Mỹ Sơn', lessonTitle: 'Khu đền tháp Mỹ Sơn', className: '9A3', classId: 2, questionCount: 10 });

describe('Bài kiểm tra của tôi', () => {
  it('bảng: tên kèm số câu và thời gian, bài học, lớp, trạng thái, giờ mở đóng, đã nộp trên sĩ số', async () => {
    signInAs('TEACHER');
    api([PUBLISHED, CLOSED, DRAFT]);
    renderApp('/giao-vien/kiem-tra');

    const table = await screen.findByRole('table', { name: 'Bài kiểm tra của tôi' });
    const published = within(table).getByRole('row', { name: /Kiểm tra 15 phút/ });
    expect(within(published).getByText('Đang phát hành')).toBeInTheDocument();
    expect(within(published).getByText('10 câu · 15 phút')).toBeInTheDocument();
    expect(within(published).getByText('Mở 07:00 29/09/2026')).toBeInTheDocument();
    expect(within(published).getByText('Đóng 17:00 30/09/2026')).toBeInTheDocument();
    expect(within(published).getByText('18/32')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'Kiểm tra 15 phút: Kinh thành Huế' })).toHaveAttribute('href', '/giao-vien/kiem-tra/1');

    const draft = within(table).getByRole('row', { name: /Khu đền tháp/ });
    expect(within(draft).getByText('Nháp')).toBeInTheDocument();
    expect(within(draft).getByText('10 câu · không giới hạn')).toBeInTheDocument();
    expect(within(draft).getByText('Chưa đặt giờ mở')).toBeInTheDocument();
    expect(await screen.findByText('3 bài kiểm tra ở 2 lớp · 1 đang phát hành · 1 nháp · 1 đã đóng')).toBeInTheDocument();
    expect(screen.getByText('Học sinh vào bài kiểm tra bằng mã bài học; bài kiểm tra không có mã riêng.')).toBeInTheDocument();
  });

  it('thao tác trên dòng theo trạng thái: nháp có Soạn và Xóa, đang phát hành có Đóng và Kết quả, đã đóng chỉ Nhân bản và Kết quả', async () => {
    signInAs('TEACHER');
    api([PUBLISHED, CLOSED, DRAFT]);
    renderApp('/giao-vien/kiem-tra');
    await screen.findByRole('table', { name: 'Bài kiểm tra của tôi' });

    expect(screen.getByRole('button', { name: 'Soạn "Khu đền tháp Mỹ Sơn"' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa "Khu đền tháp Mỹ Sơn"' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kết quả "Khu đền tháp Mỹ Sơn"' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đóng "Kiểm tra 15 phút: Kinh thành Huế"' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kết quả "Kiểm tra 15 phút: Kinh thành Huế"' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đóng "Kiểm tra cuối bài"' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa "Kiểm tra cuối bài"' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhân bản "Kiểm tra cuối bài"' })).toBeEnabled();
  });

  it('bài đang phát hành chưa tới giờ mở hoặc đã quá giờ đóng ghi rõ giai đoạn', async () => {
    signInAs('TEACHER');
    api([
      quizRowOf(1, { name: 'Chưa mở', status: 'PUBLISHED', openState: 'NOT_OPEN', openStateLabel: 'Chưa tới giờ mở' }),
      quizRowOf(2, { name: 'Quá hạn', status: 'PUBLISHED', openState: 'ENDED', openStateLabel: 'Đã hết hạn nhận bài' }),
    ]);
    renderApp('/giao-vien/kiem-tra');
    expect(await screen.findByText('Chưa tới giờ mở')).toBeInTheDocument();
    expect(screen.getByText('Đã hết hạn nhận bài')).toBeInTheDocument();
  });

  it('lọc theo trạng thái, bài học, lớp gửi đúng tham số', async () => {
    signInAs('TEACHER');
    const calls = api([PUBLISHED]);
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra');

    await screen.findByRole('table', { name: 'Bài kiểm tra của tôi' });
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'dang-phat-hanh');
    await user.selectOptions(await screen.findByRole('option', { name: /Ngọ Môn và Kinh thành Huế/ }).then(() => screen.getByLabelText('Bài học')), '5');
    await user.selectOptions(screen.getByLabelText('Lớp'), '1');

    await waitFor(() => {
      const last = calls.filter((c) => c.path.startsWith('/teacher/quizzes?')).at(-1)?.path ?? '';
      expect(last).toContain('status=PUBLISHED');
      expect(last).toContain('lessonId=5');
      expect(last).toContain('classId=1');
    });
  });

  it('đóng: hỏi xác nhận có số đã nộp, rồi gọi máy chủ và hiện lời của máy chủ', async () => {
    signInAs('TEACHER');
    const calls = api([PUBLISHED], (call) =>
      call.path === '/teacher/quizzes/1/close'
        ? envelope(200, { data: { quiz: publishedQuizOf({ status: 'CLOSED' }), expiredAttempts: 2, message: 'Đã đóng bài kiểm tra. 2 lượt làm dở đã được tự nộp.' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra');

    await user.click(await screen.findByRole('button', { name: 'Đóng "Kiểm tra 15 phút: Kinh thành Huế"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Đóng bài kiểm tra "Kiểm tra 15 phút: Kinh thành Huế"?' });
    expect(within(dialog).getByText(/Hiện 18\/32 em đã nộp/)).toBeInTheDocument();
    expect(within(dialog).getByText(/không mở lại được/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Đóng bài kiểm tra' }));

    expect(await screen.findByText('Đã đóng bài kiểm tra. 2 lượt làm dở đã được tự nộp.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/teacher/quizzes/1/close')).toBe(true);
  });

  it('nhân bản: tạo bản nháp trong cùng bài học rồi mở trang soạn của bản mới', async () => {
    signInAs('TEACHER');
    const calls = api([CLOSED], (call) => {
      if (call.path === '/teacher/quizzes/2/duplicate')
        return envelope(201, { data: { quiz: quizOf({ id: 50, name: 'Kiểm tra cuối bài (bản sao)' }), skippedQuestions: 0, message: 'Đã nhân bản bài kiểm tra.' } });
      if (call.path === '/teacher/quizzes/50') return envelope(200, { data: quizOf({ id: 50, name: 'Kiểm tra cuối bài (bản sao)' }) });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/kiem-tra');

    await user.click(await screen.findByRole('button', { name: 'Nhân bản "Kiểm tra cuối bài"' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/kiem-tra/50'));
    expect(calls.find((c) => c.path === '/teacher/quizzes/2/duplicate')?.method).toBe('POST');
  });

  it('xóa: chỉ bài nháp, hỏi xác nhận rồi xóa', async () => {
    signInAs('TEACHER');
    const calls = api([DRAFT], (call) =>
      call.path === '/teacher/quizzes/3' && call.method === 'DELETE' ? envelope(200, { message: 'Xóa bài kiểm tra thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra');

    await user.click(await screen.findByRole('button', { name: 'Xóa "Khu đền tháp Mỹ Sơn"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa bài kiểm tra' });
    expect(within(dialog).getByText(/Chỉ xóa được bài Nháp/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Xóa' }));
    expect(await screen.findByText('Xóa bài kiểm tra thành công.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/teacher/quizzes/3')).toBe(true);
  });

  it('trường hết gói: thanh báo, Tạo bài kiểm tra và Nhân bản bị khóa, Soạn và Đóng vẫn dùng được', async () => {
    signInAs('TEACHER');
    api([PUBLISHED, DRAFT], undefined, quotaOf({ hasEffectivePlan: false, planName: null, max: null, remaining: null }));
    renderApp('/giao-vien/kiem-tra');

    expect(await screen.findByText(/Trường chưa có gói dịch vụ còn hiệu lực/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Tạo bài kiểm tra' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nhân bản "Khu đền tháp Mỹ Sơn"' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Soạn "Khu đền tháp Mỹ Sơn"' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Đóng "Kiểm tra 15 phút: Kinh thành Huế"' })).toBeEnabled();
  });

  it('chưa có bài kiểm tra: trạng thái rỗng hướng dẫn tạo; có lọc mà không khớp thì cho bỏ bộ lọc', async () => {
    signInAs('TEACHER');
    api([]);
    const view = renderApp('/giao-vien/kiem-tra');
    expect(await screen.findByText(/Chưa có bài kiểm tra nào\. Tạo bài kiểm tra từ một bài học của thầy cô/)).toBeInTheDocument();
    view.unmount();

    renderApp('/giao-vien/kiem-tra?trang-thai=da-dong');
    expect(await screen.findByRole('button', { name: 'Bỏ bộ lọc' })).toBeInTheDocument();
  });

  it('tạo bài kiểm tra: chọn bài học (không có bài lưu trữ), tên gợi ý theo bài, tạo xong mở trang soạn', async () => {
    signInAs('TEACHER');
    const calls = api([], (call) => {
      if (call.path === '/teacher/quizzes' && call.method === 'POST') return envelope(201, { data: quizOf({ id: 77 }), message: 'Tạo bài kiểm tra thành công.' });
      if (call.path === '/teacher/quizzes/77') return envelope(200, { data: quizOf({ id: 77 }) });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/kiem-tra');

    await user.click((await screen.findAllByRole('button', { name: 'Tạo bài kiểm tra' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài kiểm tra' });
    expect(await within(dialog).findByText('Lớp 7A1 · Đã xuất bản · mã BH7F3K2Q')).toBeInTheDocument();
    expect(within(dialog).getByText('Lớp 9A3 · Nháp — phát hành được sau khi xuất bản bài học')).toBeInTheDocument();
    expect(within(dialog).queryByText('Bài đã lưu trữ')).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Tạo bài kiểm tra' }));
    expect(await within(dialog).findByText('Vui lòng chọn bài học.')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: 'Ngọ Môn và Kinh thành Huế' }));
    expect(within(dialog).getByLabelText('Tên bài kiểm tra')).toHaveValue('Kiểm tra: Ngọ Môn và Kinh thành Huế');
    await user.clear(within(dialog).getByLabelText('Tên bài kiểm tra'));
    await user.type(within(dialog).getByLabelText('Tên bài kiểm tra'), 'Kiểm tra 15 phút');
    await user.click(within(dialog).getByRole('button', { name: 'Tạo bài kiểm tra' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/kiem-tra/77'));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/teacher/quizzes')?.body).toEqual({ lessonId: 5, name: 'Kiểm tra 15 phút' });
  });

  it('tạo bài kiểm tra bị máy chủ từ chối (hết gói) hiện lý do ngay trong hộp thoại', async () => {
    signInAs('TEACHER');
    api([], (call) =>
      call.path === '/teacher/quizzes' && call.method === 'POST'
        ? envelope(422, { errorCode: ERROR_CODES.blocked, message: 'Trường chưa có gói dịch vụ còn hiệu lực.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra');

    await user.click((await screen.findAllByRole('button', { name: 'Tạo bài kiểm tra' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài kiểm tra' });
    await user.click(await within(dialog).findByRole('radio', { name: 'Ngọ Môn và Kinh thành Huế' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tạo bài kiểm tra' }));
    expect(await within(dialog).findByText('Trường chưa có gói dịch vụ còn hiệu lực.')).toBeInTheDocument();
  });
});
