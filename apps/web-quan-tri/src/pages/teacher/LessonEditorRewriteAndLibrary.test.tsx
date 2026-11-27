import { ERROR_CODES, type LessonDetail } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { draftOf, lessonOf, materialsOf, quotaOf, rewriteOf, sampleOf, sectionOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Soạn bài học: yêu cầu thêm cho AI khi soạn, viết lại riêng một phần bằng AI, khối Thư viện bài mẫu và lời nhắc khi lưu bài đang ở thư viện.

function api(lesson: LessonDetail, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === `/teacher/lessons/${lesson.id}` && call.method === 'GET') return envelope(200, { data: lesson });
      if (call.path === `/teacher/lessons/${lesson.id}/materials`) return envelope(200, { data: materialsOf() });
      if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quotaOf({ used: 270, remaining: 30 }) });
      if (call.path.startsWith('/teacher/quizzes?')) return envelope(200, { data: { items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } });
      if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: { items: [classOf(1)], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } });
      return undefined;
    },
  );
}

const reading = (over = {}) => sectionOf({ type: 'READING', title: 'Bối cảnh', body: 'Kinh thành Huế được xây dựng từ năm 1805 và là công trình lớn nhất của triều Nguyễn.', sortOrder: 1, ...over });
const milestone = (over = {}) =>
  sectionOf({ type: 'MILESTONE', title: '1805', body: 'Khởi công xây Kinh thành.', milestoneYear: 1805, milestoneLabel: '1805', sortOrder: 2, ...over });

describe('Soạn bài học — yêu cầu thêm cho AI', () => {
  it('ô "Yêu cầu thêm cho AI" có đếm ký tự và gợi ý mẫu; soạn bằng AI gửi instructions đã cắt khoảng trắng', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ summary: null, keyPoints: [], sections: [] }), (call) =>
      call.path === '/teacher/lessons/5/ai/compose' ? envelope(200, { data: draftOf() }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    const box = await screen.findByLabelText('Yêu cầu thêm cho AI (không bắt buộc)');
    expect(screen.getByText('0/500')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dùng gợi ý mẫu' }));
    expect(box).toHaveValue('Nhấn mạnh kiến trúc; liên hệ với địa phương; dùng ví dụ gần gũi');
    await user.clear(box);
    await user.type(box, '  Nhấn mạnh kiến trúc  ');
    expect(screen.getByText('23/500')).toBeInTheDocument();
    expect(box).toHaveAttribute('maxlength', '500');
    await user.click(screen.getByRole('button', { name: 'Soạn nội dung bằng AI' }));

    await waitFor(() => expect(calls.find((c) => c.path === '/teacher/lessons/5/ai/compose')?.body).toEqual({ length: 'MEDIUM', instructions: 'Nhấn mạnh kiến trúc' }));
  });

  it('để trống ô yêu cầu thì không gửi instructions', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ summary: null, keyPoints: [], sections: [] }), (call) =>
      call.path === '/teacher/lessons/5/ai/compose' ? envelope(200, { data: draftOf() }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Soạn nội dung bằng AI' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/teacher/lessons/5/ai/compose')?.body).toEqual({ length: 'MEDIUM' }));
  });
});

describe('Soạn bài học — viết lại một phần bằng AI', () => {
  it('đoạn trích tư liệu gốc không có nút Viết lại bằng AI; các loại phần khác có', async () => {
    signInAs('TEACHER');
    api(
      lessonOf({
        level: 3,
        sections: [
          sectionOf({ type: 'SOURCE_EXCERPT', body: 'Đóng đô ở Đại La.', sourceCitation: 'Chiếu dời đô', sortOrder: 1 }),
          sectionOf({ type: 'REFLECTION', body: 'Vì sao dời đô?', sortOrder: 2 }),
          reading({ sortOrder: 3 }),
        ],
      }),
    );
    renderApp('/giao-vien/bai-hoc/5');

    expect(await screen.findAllByRole('button', { name: /Viết lại bằng AI/ })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /Viết lại bằng AI Trích tư liệu gốc/ })).not.toBeInTheDocument();
  });

  it('chọn nhanh điền yêu cầu, gửi chữ đang sửa chưa lưu; bản cũ cạnh bản mới; Dùng bản này thay chữ trong biểu mẫu, chưa lưu; lượt AI cập nhật', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ sections: [reading(), milestone()] }), (call) =>
      call.path === '/teacher/lessons/5/ai/rewrite-section' ? envelope(200, { data: rewriteOf({ title: 'Bối cảnh lịch sử' }) }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    const area = (await screen.findAllByLabelText('Đoạn văn'))[0]!;
    await user.type(area, ' Thêm chữ chưa lưu.');
    await user.click(screen.getByRole('button', { name: /Viết lại bằng AI Đoạn văn/ }));
    const panel = await screen.findByRole('region', { name: 'Viết lại Đoạn văn bằng AI' });
    expect(within(panel).getByText(/Còn 32 lượt AI trong kỳ/)).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Ngắn hơn' }));
    expect(within(panel).getByLabelText('Yêu cầu cho AI (không bắt buộc)')).toHaveValue('Ngắn hơn');
    expect(within(panel).getByRole('button', { name: 'Ngắn hơn' })).toHaveAttribute('aria-pressed', 'true');
    expect(calls.some((c) => c.path.endsWith('/rewrite-section'))).toBe(false);
    await user.click(within(panel).getByRole('button', { name: 'Viết lại' }));

    expect(await within(panel).findByTestId('ban-moi')).toHaveTextContent('Bản viết lại ngắn gọn hơn.');
    expect(within(panel).getByTestId('ban-cu')).toHaveTextContent('Thêm chữ chưa lưu.');
    expect(calls.find((c) => c.path.endsWith('/rewrite-section'))?.body).toEqual({
      sectionType: 'READING',
      text: 'Kinh thành Huế được xây dựng từ năm 1805 và là công trình lớn nhất của triều Nguyễn. Thêm chữ chưa lưu.',
      title: 'Bối cảnh',
      instructions: 'Ngắn hơn',
    });
    expect(screen.getByText('269 / 300')).toBeInTheDocument();
    // Chưa dùng thì biểu mẫu giữ chữ cũ.
    expect(area).toHaveValue('Kinh thành Huế được xây dựng từ năm 1805 và là công trình lớn nhất của triều Nguyễn. Thêm chữ chưa lưu.');

    await user.click(within(panel).getByRole('button', { name: 'Dùng bản này' }));
    expect(screen.queryByRole('region', { name: 'Viết lại Đoạn văn bằng AI' })).not.toBeInTheDocument();
    expect((await screen.findAllByLabelText('Đoạn văn'))[0]).toHaveValue('Bản viết lại ngắn gọn hơn.');
    expect(screen.getByLabelText('Tiêu đề phần')).toHaveValue('Bối cảnh lịch sử');
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('Giữ bản cũ: đóng hộp, nội dung không đổi', async () => {
    signInAs('TEACHER');
    api(lessonOf({ sections: [reading()] }), (call) => (call.path.endsWith('/rewrite-section') ? envelope(200, { data: rewriteOf() }) : undefined));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: /Viết lại bằng AI Đoạn văn/ }));
    const panel = await screen.findByRole('region', { name: 'Viết lại Đoạn văn bằng AI' });
    await user.click(within(panel).getByRole('button', { name: 'Viết lại' }));
    await within(panel).findByTestId('ban-moi');
    await user.click(within(panel).getByRole('button', { name: 'Giữ bản cũ' }));

    expect(screen.queryByRole('region', { name: 'Viết lại Đoạn văn bằng AI' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Đoạn văn')).toHaveValue('Kinh thành Huế được xây dựng từ năm 1805 và là công trình lớn nhất của triều Nguyễn.');
    expect(screen.queryByText('Có thay đổi chưa lưu')).not.toBeInTheDocument();
  });

  it('mốc thời gian: gửi năm, bản mới giữ năm và chỉ thay nội dung khi máy chủ không trả tiêu đề', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ sections: [milestone()] }), (call) =>
      call.path.endsWith('/rewrite-section') ? envelope(200, { data: rewriteOf({ sectionType: 'MILESTONE', text: 'Vua Gia Long khởi công xây Kinh thành.', title: null }) }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: /Viết lại bằng AI Mốc thời gian/ }));
    const panel = await screen.findByRole('region', { name: 'Viết lại Mốc thời gian bằng AI' });
    await user.click(within(panel).getByRole('button', { name: 'Viết lại' }));
    await within(panel).findByTestId('ban-moi');
    expect(calls.find((c) => c.path.endsWith('/rewrite-section'))?.body).toEqual({
      sectionType: 'MILESTONE',
      text: 'Khởi công xây Kinh thành.',
      title: '1805',
      year: 1805,
    });
    await user.click(within(panel).getByRole('button', { name: 'Dùng bản này' }));
    expect(screen.getByDisplayValue('Vua Gia Long khởi công xây Kinh thành.')).toBeInTheDocument();
    expect(screen.getByLabelText('Năm')).toHaveValue('1805');
  });

  it('cảnh báo của AI hiện cạnh bản mới', async () => {
    signInAs('TEACHER');
    api(lessonOf({ sections: [reading()] }), (call) =>
      call.path.endsWith('/rewrite-section') ? envelope(200, { data: rewriteOf({ warnings: ['Bản mới dài hơn giới hạn của cấp.'] }) }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: /Viết lại bằng AI Đoạn văn/ }));
    const panel = await screen.findByRole('region', { name: 'Viết lại Đoạn văn bằng AI' });
    await user.click(within(panel).getByRole('button', { name: 'Viết lại' }));
    expect(await within(panel).findByText('Bản mới dài hơn giới hạn của cấp.')).toBeInTheDocument();
  });

  it('lỗi 503 và 422: hiện câu của máy chủ, giữ nguyên nội dung, cập nhật lại lượt AI', async () => {
    signInAs('TEACHER');
    let status = 503;
    api(lessonOf({ sections: [reading()] }), (call) => {
      if (!call.path.endsWith('/rewrite-section')) return undefined;
      return status === 503
        ? envelope(503, { errorCode: ERROR_CODES.aiUnavailable, message: 'Chưa viết lại được phần này. Dịch vụ AI đang gián đoạn; lượt AI không bị trừ.' })
        : envelope(422, { errorCode: ERROR_CODES.blocked, message: 'Không thể viết lại. Trường đã dùng hết lượt AI trong kỳ của gói.' });
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: /Viết lại bằng AI Đoạn văn/ }));
    const panel = await screen.findByRole('region', { name: 'Viết lại Đoạn văn bằng AI' });
    await user.click(within(panel).getByRole('button', { name: 'Viết lại' }));
    expect(await within(panel).findByText(/Dịch vụ AI đang gián đoạn; lượt AI không bị trừ/)).toBeInTheDocument();
    expect(screen.getByText('270 / 300')).toBeInTheDocument();

    status = 422;
    await user.click(within(panel).getByRole('button', { name: 'Viết lại' }));
    expect(await within(panel).findByText(/Trường đã dùng hết lượt AI trong kỳ của gói/)).toBeInTheDocument();
    expect(screen.getByLabelText('Đoạn văn')).toHaveValue('Kinh thành Huế được xây dựng từ năm 1805 và là công trình lớn nhất của triều Nguyễn.');
  });

  it('lỗi theo trường yêu cầu (400) hiện ngay dưới ô yêu cầu', async () => {
    signInAs('TEACHER');
    api(lessonOf({ sections: [reading()] }), (call) =>
      call.path.endsWith('/rewrite-section')
        ? envelope(400, { errorCode: ERROR_CODES.invalid, message: 'Dữ liệu không hợp lệ.', errors: { instructions: 'Yêu cầu tối đa 500 ký tự.' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: /Viết lại bằng AI Đoạn văn/ }));
    const panel = await screen.findByRole('region', { name: 'Viết lại Đoạn văn bằng AI' });
    await user.click(within(panel).getByRole('button', { name: 'Viết lại' }));
    expect(await within(panel).findByText('Yêu cầu tối đa 500 ký tự.')).toBeInTheDocument();
  });

  it('hết lượt AI, hết gói hoặc phần trống: nút Viết lại bị khóa kèm lý do', async () => {
    signInAs('TEACHER');
    api(lessonOf({ aiQuota: quotaOf({ used: 300, remaining: 0 }), sections: [reading(), reading({ body: '', sortOrder: 2 })] }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    const buttons = await screen.findAllByRole('button', { name: /Viết lại bằng AI/ });
    await user.click(buttons[0]!);
    const panel = await screen.findByRole('region', { name: /Viết lại Đoạn văn bằng AI/ });
    expect(within(panel).getByRole('button', { name: 'Viết lại' })).toBeDisabled();
    expect(within(panel).getByText('Trường đã dùng hết lượt AI trong kỳ của gói.')).toBeInTheDocument();
  });

  it('bài đã lưu trữ chỉ xem: không có nút Viết lại bằng AI', async () => {
    signInAs('TEACHER');
    api(lessonOf({ status: 'ARCHIVED', sections: [reading()] }));
    renderApp('/giao-vien/bai-hoc/5');
    await screen.findByLabelText('Đoạn văn');
    expect(screen.queryByRole('button', { name: /Viết lại bằng AI/ })).not.toBeInTheDocument();
  });
});

describe('Soạn bài học — khối Thư viện bài mẫu', () => {
  it('bài nháp: Chưa đề xuất và nút đề xuất bị khóa kèm lý do', async () => {
    signInAs('TEACHER');
    api(lessonOf({ status: 'DRAFT', sections: [reading()] }));
    renderApp('/giao-vien/bai-hoc/5');

    const block = (await screen.findByRole('heading', { name: 'Thư viện bài mẫu' })).closest('section')!;
    expect(within(block).getByText('Chưa đề xuất')).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Đề xuất vào thư viện bài mẫu' })).toBeDisabled();
    expect(within(block).getByText('Chỉ bài Đã xuất bản mới đề xuất được.')).toBeInTheDocument();
    expect(within(block).queryByRole('button', { name: 'Rút khỏi thư viện' })).not.toBeInTheDocument();
  });

  it('bài đã xuất bản nhưng chưa đủ điều kiện: khóa', async () => {
    signInAs('TEACHER');
    api(lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', readiness: { isReady: false, missing: ['ít nhất một mốc thời gian'], warnings: [] }, sections: [reading()] }));
    renderApp('/giao-vien/bai-hoc/5');

    const block = (await screen.findByRole('heading', { name: 'Thư viện bài mẫu' })).closest('section')!;
    expect(within(block).getByRole('button', { name: 'Đề xuất vào thư viện bài mẫu' })).toBeDisabled();
    expect(within(block).getByText('Bài chưa đủ điều kiện xuất bản nên chưa đề xuất được.')).toBeInTheDocument();
  });

  it('bài đã xuất bản, đủ điều kiện: đề xuất thành Chờ duyệt; rút hỏi xác nhận rồi về Chưa đề xuất', async () => {
    signInAs('TEACHER');
    const lesson = lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', readiness: { isReady: true, missing: [], warnings: [] }, sections: [reading()] });
    const calls = api(lesson, (call) => {
      if (call.path === '/teacher/lessons/5/sample-request' && call.method === 'POST') {
        return envelope(200, { data: { lesson: { ...lesson, sample: sampleOf() }, message: 'Đã đề xuất bài vào thư viện bài mẫu. Bài đang chờ quản trị hệ thống duyệt.' } });
      }
      if (call.path === '/teacher/lessons/5/sample-request' && call.method === 'DELETE') {
        return envelope(200, { data: { lesson: { ...lesson, sample: null }, message: 'Đã rút bài khỏi thư viện bài mẫu.' } });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    const block = (await screen.findByRole('heading', { name: 'Thư viện bài mẫu' })).closest('section')!;
    await user.click(within(block).getByRole('button', { name: 'Đề xuất vào thư viện bài mẫu' }));
    expect(await screen.findByText('Đã đề xuất bài vào thư viện bài mẫu. Bài đang chờ quản trị hệ thống duyệt.')).toBeInTheDocument();
    expect(within(block).getByText('Chờ duyệt')).toBeInTheDocument();
    expect(within(block).queryByRole('button', { name: 'Đề xuất vào thư viện bài mẫu' })).not.toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);

    await user.click(within(block).getByRole('button', { name: 'Rút khỏi thư viện' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rút bài khỏi thư viện bài mẫu?' });
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    await user.click(within(dialog).getByRole('button', { name: 'Rút khỏi thư viện' }));
    expect(await screen.findByText('Đã rút bài khỏi thư viện bài mẫu.')).toBeInTheDocument();
    expect(within(block).getByText('Chưa đề xuất')).toBeInTheDocument();
  });

  it('đề xuất bị chặn (422): hiện câu của máy chủ, trạng thái không đổi', async () => {
    signInAs('TEACHER');
    const lesson = lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', readiness: { isReady: true, missing: [], warnings: [] }, sections: [reading()] });
    api(lesson, (call) =>
      call.path === '/teacher/lessons/5/sample-request' && call.method === 'POST'
        ? envelope(422, { errorCode: ERROR_CODES.blocked, message: 'Không thể đề xuất. Bài đang chờ duyệt.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    const block = (await screen.findByRole('heading', { name: 'Thư viện bài mẫu' })).closest('section')!;
    await user.click(within(block).getByRole('button', { name: 'Đề xuất vào thư viện bài mẫu' }));
    expect((await within(block).findAllByText('Không thể đề xuất. Bài đang chờ duyệt.')).length).toBeGreaterThan(0);
    expect(within(block).getByText('Chưa đề xuất')).toBeInTheDocument();
  });

  it('trong thư viện: hiện số lượt dùng và nút rút', async () => {
    signInAs('TEACHER');
    api(lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', readiness: { isReady: true, missing: [], warnings: [] }, sample: sampleOf({ status: 'APPROVED', useCount: 4 }), sections: [reading()] }));
    renderApp('/giao-vien/bai-hoc/5');
    const block = (await screen.findByRole('heading', { name: 'Thư viện bài mẫu' })).closest('section')!;
    expect(within(block).getByText('Trong thư viện · 4 lượt dùng')).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Rút khỏi thư viện' })).toBeEnabled();
  });

  it('bị từ chối: hiện lý do, còn nút đề xuất lại', async () => {
    signInAs('TEACHER');
    api(
      lessonOf({
        status: 'PUBLISHED',
        accessCode: 'BH7F3K2Q',
        readiness: { isReady: true, missing: [], warnings: [] },
        sample: sampleOf({ status: 'REJECTED', note: 'Nội dung còn sai năm xây dựng.' }),
        sections: [reading()],
      }),
    );
    renderApp('/giao-vien/bai-hoc/5');
    const block = (await screen.findByRole('heading', { name: 'Thư viện bài mẫu' })).closest('section')!;
    expect(within(block).getByText('Bị từ chối: Nội dung còn sai năm xây dựng.')).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Đề xuất vào thư viện bài mẫu' })).toBeEnabled();
  });

  it('còn thay đổi chưa lưu: khóa nút đề xuất, nhắc lưu trước', async () => {
    signInAs('TEACHER');
    api(lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', readiness: { isReady: true, missing: [], warnings: [] }, sections: [reading()] }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.type(await screen.findByLabelText('Tiêu đề'), '!');
    const block = screen.getByRole('heading', { name: 'Thư viện bài mẫu' }).closest('section')!;
    expect(within(block).getByRole('button', { name: 'Đề xuất vào thư viện bài mẫu' })).toBeDisabled();
    expect(within(block).getByText('Hãy lưu thay đổi trước khi đề xuất.')).toBeInTheDocument();
  });

  it('lưu bài đang ở thư viện: nhắc bài sẽ chờ duyệt lại; Hủy không lưu; xác nhận mới gửi và hiện câu báo của máy chủ', async () => {
    signInAs('TEACHER');
    const lesson = lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', readiness: { isReady: true, missing: [], warnings: [] }, sample: sampleOf({ status: 'APPROVED', useCount: 2 }), sections: [reading()] });
    const message = 'Lưu bài học thành công. Bài đang ở thư viện bài mẫu nên sẽ chờ quản trị duyệt lại.';
    const calls = api(lesson, (call) =>
      call.method === 'PUT' ? envelope(200, { data: { ...lesson, title: 'Tiêu đề mới', sample: sampleOf() }, message }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    const title = await screen.findByLabelText('Tiêu đề');
    await user.clear(title);
    await user.type(title, 'Tiêu đề mới');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bài đang ở thư viện bài mẫu' });
    expect(within(dialog).getByText(/sẽ chờ quản trị hệ thống duyệt lại/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);

    await user.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Bài đang ở thư viện bài mẫu' })).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
    const block = screen.getByRole('heading', { name: 'Thư viện bài mẫu' }).closest('section')!;
    expect(within(block).getByText('Chờ duyệt')).toBeInTheDocument();
  });

  it('bài không ở thư viện: lưu ngay, không nhắc', async () => {
    signInAs('TEACHER');
    const lesson = lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', sections: [reading()] });
    const calls = api(lesson, (call) => (call.method === 'PUT' ? envelope(200, { data: lesson, message: 'Lưu bài học thành công.' }) : undefined));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.type(await screen.findByLabelText('Tiêu đề'), '!');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Lưu bài học thành công.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Bài đang ở thư viện bài mẫu' })).not.toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
  });

  it('câu lưu ý sau khi dùng bài mẫu hiện ở đầu trang và đóng được', async () => {
    signInAs('TEACHER');
    api(lessonOf({ sections: [reading()] }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5', { sampleNotice: ['Đã bỏ 1 di sản đang ẩn của bài mẫu.', 'Lớp 10A1 thuộc cấp 3.'] });

    expect(await screen.findByText('Đã bỏ 1 di sản đang ẩn của bài mẫu. Lớp 10A1 thuộc cấp 3.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    expect(screen.queryByText(/Đã bỏ 1 di sản đang ẩn/)).not.toBeInTheDocument();
  });
});
