import { ERROR_CODES, type LessonDetail } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { draftOf, lessonOf, lessonRowOf, materialsOf, quizOf as studentQuizOf, quotaOf, sectionOf, studentLessonOf, studentSectionOf } from '../../test/lessonFixtures';
import { quizOf, quizRowOf } from '../../test/quizFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Soạn bài học: khung nội dung đổi theo cấp của lớp, AI soạn bản nháp, lưu, điều kiện xuất bản, mã bài học, bài đã lưu trữ.

function api(lesson: LessonDetail, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === `/teacher/lessons/${lesson.id}` && call.method === 'GET') return envelope(200, { data: lesson });
      if (call.path === `/teacher/lessons/${lesson.id}/materials`) return envelope(200, { data: materialsOf() });
      if (call.path.startsWith('/teacher/quizzes?')) {
        return envelope(200, { data: { items: lesson.quizCount > 0 ? [quizRowOf(9, { name: 'Kiểm tra 15 phút', status: 'PUBLISHED' })] : [], page: 1, pageSize: 50, totalItems: lesson.quizCount, totalPages: 1 } });
      }
      if (call.path.startsWith('/teacher/classes?')) {
        return envelope(200, {
          data: { items: [classOf(1), classOf(2, { name: '10A1', grade: 10, schoolLevel: 3 })], page: 1, pageSize: 100, totalItems: 2, totalPages: 1 },
        });
      }
      return undefined;
    },
  );
}

const milestone = (over = {}) =>
  sectionOf({ type: 'MILESTONE', title: '1805', body: 'Khởi công xây Kinh thành.', milestoneYear: 1805, milestoneLabel: '1805', sortOrder: 2, ...over });

describe('Soạn bài học — khung nội dung theo cấp của lớp', () => {
  it('cấp 1: các bước câu chuyện mỗi bước một hình, ô Câu ngắn kèm hình, khoảng 150-250 từ', async () => {
    signInAs('TEACHER');
    api(
      lessonOf({
        level: 1,
        sections: [
          sectionOf({ type: 'STORY', title: 'Ngọ Môn là cổng chính.', body: 'Hôm nay Na đến Ngọ Môn.', imageUrl: 'https://anh.test/ngo-mon.jpg', sortOrder: 1 }),
          sectionOf({ type: 'STORY', body: 'Na đi thuyền trên sông Hương.', imageUrl: null, sortOrder: 2 }),
        ],
      }),
    );
    renderApp('/giao-vien/bai-hoc/5');

    expect(await screen.findByRole('heading', { name: /Nội dung bài theo cấp — Cấp 1/ })).toBeInTheDocument();
    expect(screen.getByText(/câu chuyện 150-250 từ chia 3-6 bước/)).toBeInTheDocument();
    expect(screen.getByText('Theo khối 4 của lớp 4B1')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Câu ngắn kèm hình')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Các bước câu chuyện' })).toBeInTheDocument();
    expect(screen.getAllByText('Bắt buộc có hình').length).toBe(1);
    expect(screen.getByText(/Câu chuyện có 2 bước; cấp 1 thường có 3-6 bước/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm bước' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm mốc' })).not.toBeInTheDocument();
    // Bước thiếu hình chặn xuất bản.
    expect(screen.getByText('hình cho mỗi bước câu chuyện')).toBeInTheDocument();
  });

  it('cấp 2: đoạn văn, hình có chú thích, mốc thời gian nối với sự kiện của di sản', async () => {
    signInAs('TEACHER');
    api(lessonOf({ level: 2, sections: [sectionOf({ type: 'READING', body: 'Đoạn một.', sortOrder: 1 }), milestone()] }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    expect(await screen.findByRole('heading', { name: /Nội dung bài theo cấp — Cấp 2/ })).toBeInTheDocument();
    expect(screen.getByText(/bài đọc 300-500 từ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm mốc' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm hình và chú thích' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm đoạn trích' })).not.toBeInTheDocument();

    const select = await screen.findByLabelText('Nối với sự kiện của di sản');
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(select, '21');
    expect(screen.getByLabelText('Năm')).toHaveValue('1805');
  });

  it('cấp 3: đoạn trích tư liệu gốc bắt buộc có nguồn, câu hỏi gợi suy nghĩ không chấm điểm', async () => {
    signInAs('TEACHER');
    api(
      lessonOf({
        level: 3,
        sections: [
          sectionOf({ type: 'SOURCE_EXCERPT', body: 'Đóng đô ở Đại La.', sourceCitation: null, sortOrder: 1 }),
          sectionOf({ type: 'REFLECTION', body: 'Vì sao dời đô?', sortOrder: 2 }),
        ],
      }),
    );
    renderApp('/giao-vien/bai-hoc/5');

    expect(await screen.findByRole('heading', { name: /Nội dung bài theo cấp — Cấp 3/ })).toBeInTheDocument();
    expect(screen.getByText(/bài phân tích 600-900 từ/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nguồn')).toBeInTheDocument();
    expect(screen.getByText('nguồn của mỗi đoạn trích')).toBeInTheDocument();
    expect(screen.getAllByText(/không chấm điểm/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Thêm đoạn trích' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm câu hỏi' })).toBeInTheDocument();
  });

  it('phần thuộc khung của cấp khác (bài nhân bản sang lớp khác cấp) bị cảnh báo', async () => {
    signInAs('TEACHER');
    api(lessonOf({ level: 3, sections: [sectionOf({ type: 'STORY', body: 'Chuyện.', sortOrder: 1 })] }));
    renderApp('/giao-vien/bai-hoc/5');
    expect(await screen.findByText(/Loại phần này thuộc khung của cấp khác/)).toBeInTheDocument();
    expect(screen.getByText(/Có 1 phần thuộc khung của cấp khác/)).toBeInTheDocument();
  });

  it('bài không tồn tại: thông báo không tìm thấy', async () => {
    signInAs('TEACHER');
    mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
    renderApp('/giao-vien/bai-hoc/999');
    expect(await screen.findByText('Không tìm thấy bài học.')).toBeInTheDocument();
  });
});

describe('Soạn bài học — AI soạn bản nháp', () => {
  it('bài chưa có nội dung: nút "Soạn nội dung bằng AI" gửi độ dài đã chọn, bản nháp điền vào biểu mẫu chưa lưu và lượt AI cập nhật', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ summary: null, keyPoints: [], sections: [] }), (call) =>
      call.path === '/teacher/lessons/5/ai/compose'
        ? envelope(200, { data: draftOf({ message: 'Đã soạn bản nháp nội dung bài cấp 2. Còn 31 lượt AI trong kỳ.' }) })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    expect(await screen.findByText('268 / 300')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Chi tiết'));
    await user.click(screen.getByRole('button', { name: 'Soạn nội dung bằng AI' }));

    expect(await screen.findByText('Đã soạn bản nháp nội dung bài cấp 2. Còn 31 lượt AI trong kỳ.')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/teacher/lessons/5/ai/compose')?.body).toEqual({ length: 'DETAILED' });
    expect(screen.getByLabelText('Tóm tắt')).toHaveValue('Bản nháp do AI soạn.');
    expect(screen.getByDisplayValue('Khởi công xây Kinh thành.')).toBeInTheDocument();
    expect(screen.getByText('269 / 300')).toBeInTheDocument();
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
    // AI không tự lưu hay xuất bản.
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    expect(calls.some((c) => c.path.endsWith('/publish'))).toBe(false);
  });

  it('bài đã có nội dung: tạo lại phải xác nhận vì thay nội dung đang soạn', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ sections: [milestone()] }), (call) =>
      call.path === '/teacher/lessons/5/ai/compose' ? envelope(200, { data: draftOf({ summary: 'Bản nháp mới.' }), message: 'Xong.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Tạo lại' }));
    const dialog = await screen.findByRole('dialog', { name: 'Soạn lại nội dung bằng AI' });
    expect(calls.some((c) => c.path.endsWith('/ai/compose'))).toBe(false);
    await user.click(within(dialog).getByRole('button', { name: 'Soạn lại' }));
    await waitFor(() => expect(screen.getByLabelText('Tóm tắt')).toHaveValue('Bản nháp mới.'));
  });

  it('dịch vụ AI lỗi: toast báo lỗi, nội dung bài giữ nguyên, lượt không bị tính', async () => {
    signInAs('TEACHER');
    const failure = 'Chưa soạn được nội dung bài. Dịch vụ AI đang gián đoạn; lượt AI không bị trừ.';
    api(lessonOf({ summary: 'Nội dung của cô.', sections: [milestone()] }), (call) => {
      if (call.path.endsWith('/ai/compose')) return envelope(503, { errorCode: ERROR_CODES.systemError, message: failure });
      if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quotaOf() });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Tạo lại' }));
    await user.click(await screen.findByRole('button', { name: 'Soạn lại' }));
    expect(await screen.findByText(failure)).toBeInTheDocument();
    expect(screen.getByLabelText('Tóm tắt')).toHaveValue('Nội dung của cô.');
    expect(screen.getByText('268 / 300')).toBeInTheDocument();
  });

  it('trường hết gói hoặc hết lượt AI: nút khóa kèm lý do; vẫn nhập tay được', async () => {
    signInAs('TEACHER');
    api(lessonOf({ aiQuota: quotaOf({ used: 300, remaining: 0 }) }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    expect(await screen.findByRole('button', { name: 'Tạo lại' })).toBeDisabled();
    expect(screen.getByText(/đã dùng hết lượt AI trong kỳ/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Tiêu đề'), ' mới');
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Ngọ Môn và Kinh thành Huế mới');
  });

  it('hết gói: thanh báo, nhân bản bị khóa', async () => {
    signInAs('TEACHER');
    api(lessonOf({ aiQuota: quotaOf({ hasEffectivePlan: false, planName: null, max: null, remaining: null }) }));
    renderApp('/giao-vien/bai-hoc/5');
    expect(await screen.findByText(/Trường chưa có gói dịch vụ còn hiệu lực/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhân bản sang lớp khác' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tạo lại' })).toBeDisabled();
  });
});

describe('Soạn bài học — lưu, xuất bản, mã bài học', () => {
  it('sửa rồi Lưu nháp gửi toàn bộ nội dung theo thứ tự; xong thì hết "chưa lưu"', async () => {
    signInAs('TEACHER');
    const lesson = lessonOf({ sections: [milestone()] });
    const calls = api(lesson, (call) =>
      call.method === 'PUT' ? envelope(200, { data: { ...lesson, title: 'Tiêu đề mới', updatedAt: '2026-10-06T03:00:00Z' }, message: 'Lưu bài học thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    const save = await screen.findByRole('button', { name: 'Lưu nháp' });
    expect(save).toBeDisabled();
    const title = screen.getByLabelText('Tiêu đề');
    await user.clear(title);
    await user.type(title, 'Tiêu đề mới');
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    expect(await screen.findByText('Lưu bài học thành công.')).toBeInTheDocument();
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.path).toBe('/teacher/lessons/5');
    expect(put?.body).toMatchObject({
      title: 'Tiêu đề mới',
      summary: 'Kinh thành Huế được xây dựng từ năm 1805.',
      keyPoints: ['Kinh thành Huế khởi công năm 1805.'],
      sections: [{ type: 'MILESTONE', body: 'Khởi công xây Kinh thành.', milestoneYear: 1805, eventId: null }],
    });
    expect(screen.queryByText('Có thay đổi chưa lưu')).not.toBeInTheDocument();
  });

  it('lỗi theo phần từ máy chủ hiện ngay dưới phần đó', async () => {
    signInAs('TEACHER');
    api(lessonOf({ sections: [milestone()] }), (call) =>
      call.method === 'PUT'
        ? envelope(400, { errorCode: ERROR_CODES.invalid, message: 'Nội dung phần không hợp lệ.', errors: { 'sections[0].body': 'Nội dung phần không hợp lệ: tối đa 20000 ký tự.' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.type(await screen.findByLabelText('Tiêu đề'), '!');
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    expect((await screen.findAllByText('Nội dung phần không hợp lệ: tối đa 20000 ký tự.')).length).toBeGreaterThan(0);
  });

  it('chưa đủ điều kiện: xuất bản bị chặn ngay, liệt kê còn thiếu, không gọi máy chủ', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ level: 2, sections: [] }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Xuất bản' }));
    expect(await screen.findByText(/Chưa thể xuất bản\. Bài học còn thiếu: ít nhất một mốc thời gian\./)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('xuất bản lần đầu: lưu thay đổi trước, rồi sinh mã và hiện hộp thoại Mã bài học', async () => {
    signInAs('TEACHER');
    const lesson = lessonOf({ sections: [milestone()] });
    const published = { ...lesson, status: 'PUBLISHED' as const, accessCode: 'BH7F3K2Q' };
    const calls = api(lesson, (call) => {
      if (call.method === 'PUT') return envelope(200, { data: lesson });
      if (call.path === '/teacher/lessons/5/publish') {
        return envelope(200, {
          data: { lesson: published, codeCreated: true, accessCode: 'BH7F3K2Q', message: 'Xuất bản bài học thành công. Mã bài học của lớp 7A1 là BH7F3K2Q.' },
          message: 'Xuất bản bài học thành công. Mã bài học của lớp 7A1 là BH7F3K2Q.',
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.type(await screen.findByLabelText('Tiêu đề'), '!');
    await user.click(screen.getByRole('button', { name: 'Xuất bản' }));

    const dialog = await screen.findByRole('dialog', { name: 'Mã bài học' });
    expect(within(dialog).getByTestId('ma-bai-hoc')).toHaveTextContent('BH7F3K2Q');
    const order = calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path}`);
    expect(order).toEqual(['PUT /teacher/lessons/5', 'POST /teacher/lessons/5/publish']);
    // Sau xuất bản, trang hiện mã ở cột bên phải và trạng thái Đã xuất bản.
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    expect(screen.getAllByText('BH7F3K2Q').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đã xuất bản').length).toBeGreaterThan(0);
  });

  it('bài đã xuất bản: có nút Lưu trữ; lưu trữ hỏi xác nhận rồi chuyển sang chỉ xem và nút "Xuất bản lại"', async () => {
    signInAs('TEACHER');
    const lesson = lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', sections: [milestone()] });
    api(lesson, (call) =>
      call.path === '/teacher/lessons/5/archive' ? envelope(200, { data: { ...lesson, status: 'ARCHIVED' }, message: 'Lưu trữ bài học thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Lưu trữ' }));
    const dialog = await screen.findByRole('dialog', { name: /Lưu trữ bài học/ });
    await user.click(within(dialog).getByRole('button', { name: 'Lưu trữ' }));

    expect(await screen.findByText(/Bài học đã lưu trữ nên học sinh không mở được bằng mã nữa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xuất bản lại' })).toBeEnabled();
    expect(screen.getByLabelText('Tiêu đề')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Lưu nháp' })).not.toBeInTheDocument();
  });

  it('nhân bản sang lớp khác cấp: cảnh báo khác cấp rồi mở bài nháp mới', async () => {
    signInAs('TEACHER');
    const copy = lessonOf({ id: 8, level: 3, status: 'DRAFT' });
    const calls = api(lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', sections: [milestone()] }), (call) => {
      if (call.path === '/teacher/lessons/5/duplicate') {
        return envelope(201, { data: { lesson: copy, skippedHeritages: 0, levelNotice: 'Lớp 10A1 thuộc cấp 3.', message: 'Đã tạo bài học nháp ở lớp 10A1.' }, message: 'Đã tạo bài học nháp ở lớp 10A1.' });
      }
      if (call.path === '/teacher/lessons/8') return envelope(200, { data: copy });
      if (call.path === '/teacher/lessons/8/materials') return envelope(200, { data: materialsOf() });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Nhân bản sang lớp khác' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nhân bản bài học sang lớp khác' });
    await user.selectOptions(await within(dialog).findByLabelText('Lớp đích'), '2');
    expect(within(dialog).getByText(/Lớp 10A1 thuộc cấp 3, khác cấp 2 của bài gốc/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Nhân bản' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/bai-hoc/8'));
    expect(calls.find((c) => c.path === '/teacher/lessons/5/duplicate')?.body).toEqual({ targetClassId: 2, includeQuizzes: false });
  });

  it('nhân bản kèm bài kiểm tra: ô chép kèm mặc định chọn, gửi includeQuizzes, lời nhắc bỏ câu không hợp cấp; bỏ chọn thì không chép', async () => {
    signInAs('TEACHER');
    const copy = lessonOf({ id: 8, level: 3, status: 'DRAFT' });
    const message =
      'Đã tạo bài học nháp ở lớp 10A1. Đã chép 2 bài kiểm tra thành bản nháp; hãy đặt lại giờ mở và giờ đóng. Bỏ qua 3 câu hỏi đã ẩn hoặc không dùng được ở cấp của lớp.';
    const calls = api(lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', quizCount: 2, sections: [milestone()] }), (call) => {
      if (call.path === '/teacher/lessons/5/duplicate') {
        return envelope(201, { data: { lesson: copy, skippedHeritages: 0, levelNotice: null, copiedQuizzes: 2, skippedQuestions: 3, message }, message });
      }
      if (call.path === '/teacher/lessons/8') return envelope(200, { data: copy });
      if (call.path === '/teacher/lessons/8/materials') return envelope(200, { data: materialsOf() });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Nhân bản sang lớp khác' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nhân bản bài học sang lớp khác' });
    expect(within(dialog).getByText(/Cấp 2 · Đã xuất bản · 1 di sản · 2 bài kiểm tra/)).toBeInTheDocument();
    const copyQuizzes = within(dialog).getByRole('checkbox', { name: 'Chép kèm các bài kiểm tra của bài' });
    expect(copyQuizzes).toBeChecked();
    await user.selectOptions(await within(dialog).findByLabelText('Lớp đích'), '2');
    expect(within(dialog).getByText(/Câu hỏi có dạng không dùng được ở cấp 3 sẽ không được chép/)).toBeInTheDocument();

    await user.click(copyQuizzes);
    expect(within(dialog).queryByText(/Câu hỏi có dạng không dùng được ở cấp 3 sẽ không được chép/)).not.toBeInTheDocument();
    await user.click(copyQuizzes);
    await user.click(within(dialog).getByRole('button', { name: 'Nhân bản' }));

    expect(await screen.findByText(/Đã chép 2 bài kiểm tra thành bản nháp; hãy đặt lại giờ mở và giờ đóng\. Bỏ qua 3 câu hỏi/)).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/teacher/lessons/5/duplicate')?.body).toEqual({ targetClassId: 2, includeQuizzes: true });
  });

  it('bài không có bài kiểm tra: hộp nhân bản không có ô chép kèm', async () => {
    signInAs('TEACHER');
    api(lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', quizCount: 0, sections: [milestone()] }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Nhân bản sang lớp khác' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nhân bản bài học sang lớp khác' });
    await within(dialog).findByLabelText('Lớp đích');
    expect(within(dialog).queryByRole('checkbox', { name: /Chép kèm/ })).not.toBeInTheDocument();
  });

  it('mục bài kiểm tra của bài: liệt kê các bài kiểm tra và tạo bài kiểm tra mới với bài học chọn sẵn', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ status: 'PUBLISHED', accessCode: 'BH7F3K2Q', quizCount: 1, sections: [milestone()] }), (call) => {
      if (call.path === '/teacher/quizzes' && call.method === 'POST') return envelope(201, { data: quizOf({ id: 70 }), message: 'Tạo bài kiểm tra thành công.' });
      if (call.path === '/teacher/quizzes/70') return envelope(200, { data: quizOf({ id: 70 }) });
      if (call.path.startsWith('/teacher/lessons?')) {
        const row = lessonRowOf(5, { title: 'Ngọ Môn và Kinh thành Huế', status: 'PUBLISHED', accessCode: 'BH7F3K2Q' });
        return envelope(200, { data: { items: [row], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } });
      }
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/bai-hoc/5');

    const list = await screen.findByRole('list', { name: 'Các bài kiểm tra của bài' });
    expect(within(list).getByRole('link', { name: 'Kiểm tra 15 phút' })).toHaveAttribute('href', '/giao-vien/kiem-tra/9');
    await user.click(screen.getByRole('button', { name: 'Tạo bài kiểm tra' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài kiểm tra' });
    const radio = await within(dialog).findByRole('radio', { name: 'Ngọ Môn và Kinh thành Huế' });
    expect(radio).toBeChecked();
    expect(radio).toBeDisabled();
    await waitFor(() => expect(within(dialog).getByLabelText('Tên bài kiểm tra')).toHaveValue('Kiểm tra: Ngọ Môn và Kinh thành Huế'));
    await user.click(within(dialog).getByRole('button', { name: 'Tạo bài kiểm tra' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/kiem-tra/70'));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/teacher/quizzes')?.body).toEqual({ lessonId: 5, name: 'Kiểm tra: Ngọ Môn và Kinh thành Huế' });
  });
});

describe('Soạn bài học — xem như học sinh', () => {
  const previewOf = (lesson: ReturnType<typeof studentLessonOf>, status: 'DRAFT' | 'PUBLISHED' = 'DRAFT') =>
    envelope(200, { data: { lesson, status, quizzesViewOnly: true } });

  it('cấp 1: hộp thoại dựng bố cục kể chuyện từng bước với bộ giao diện cấp 1, không có liên kết sang trang công khai', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ level: 1 }), (call) =>
      call.path === '/teacher/lessons/5/preview'
        ? previewOf(
            studentLessonOf(1, {
              accessCode: '',
              sections: [studentSectionOf({ type: 'STORY', title: 'Ngọ Môn là cổng chính.', body: 'Hôm nay Na đến Ngọ Môn.' })],
              quizzes: [{ ...studentQuizOf(3), state: 'OPEN', stateLabel: 'Đang mở' }],
            }),
          )
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Xem như học sinh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem như học sinh' });

    expect(await within(dialog).findByText(/Bạn đang xem bài như học sinh lớp 4A1 \(Cấp 1\)/)).toBeInTheDocument();
    expect(within(dialog).getByText(/không lưu kết quả/)).toBeInTheDocument();
    expect(within(dialog).getByText(/chưa có mã bài học/)).toBeInTheDocument();
    expect(dialog.querySelector('[data-bo-cuc="cap-1"]')).not.toBeNull();
    expect(dialog.querySelector('[data-bo-giao-dien="cap-1"]')).not.toBeNull();
    expect(within(dialog).getByRole('list', { name: 'Các bước của bài' })).toBeInTheDocument();
    expect(within(dialog).getByText('Hôm nay Na đến Ngọ Môn.')).toBeInTheDocument();
    // Không mở trang công khai của di sản: không có liên kết nào trong hộp thoại.
    expect(within(dialog).queryAllByRole('link')).toHaveLength(0);
    // Chỉ đọc: chỉ một lời gọi xem trước, không ghi gì.
    expect(calls.filter((c) => c.path === '/teacher/lessons/5/preview')).toHaveLength(1);
    expect(calls.some((c) => c.method !== 'GET')).toBe(false);
  });

  it('cấp 3: bố cục tài liệu có mục lục, bài kiểm tra chỉ để xem (không nút làm bài)', async () => {
    signInAs('TEACHER');
    api(lessonOf({ level: 3, status: 'PUBLISHED', accessCode: 'BH7F3K2Q' }), (call) =>
      call.path === '/teacher/lessons/5/preview'
        ? previewOf(
            studentLessonOf(3, {
              sections: [
                studentSectionOf({ type: 'READING', title: 'Bối cảnh', body: 'Đoạn phân tích.' }),
                studentSectionOf({ type: 'SOURCE_EXCERPT', body: 'Đóng đô ở Đại La.', sourceCitation: 'Chiếu dời đô', sortOrder: 2 }),
              ],
              quizzes: [{ ...studentQuizOf(3), state: 'OPEN', stateLabel: 'Đang mở' }],
            }),
            'PUBLISHED',
          )
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Xem như học sinh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem như học sinh' });
    expect(await within(dialog).findByRole('navigation', { name: 'Mục lục' })).toBeInTheDocument();
    expect(dialog.querySelector('[data-bo-cuc="cap-3"]')).not.toBeNull();
    expect(dialog.querySelector('[data-bo-giao-dien="cap-3"]')).not.toBeNull();
    expect(within(dialog).getByText('Kiểm tra số 3')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Làm bài' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/chưa có mã bài học/)).not.toBeInTheDocument();
    // Liên kết trong trang chỉ là mục lục của chính bài (neo #), không đi ra ngoài.
    for (const link of within(dialog).queryAllByRole('link')) expect(link.getAttribute('href')).toMatch(/^#/);
  });

  it('cấp 2: bố cục ba tab (Đọc bài, Dòng thời gian, Bài kiểm tra)', async () => {
    signInAs('TEACHER');
    api(lessonOf({ level: 2 }), (call) =>
      call.path === '/teacher/lessons/5/preview'
        ? previewOf(studentLessonOf(2, { sections: [studentSectionOf({ type: 'READING', body: 'Bài đọc cấp 2.' })] }))
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.click(await screen.findByRole('button', { name: 'Xem như học sinh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem như học sinh' });
    expect(await within(dialog).findByRole('tab', { name: 'Đọc bài' })).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: 'Dòng thời gian của bài' })).toBeInTheDocument();
    expect(dialog.querySelector('[data-bo-cuc="cap-2"]')).not.toBeNull();
    expect(within(dialog).getByText('Bài đọc cấp 2.')).toBeInTheDocument();
  });

  it('có thay đổi chưa lưu thì nhắc lưu trước, không mở hộp thoại', async () => {
    signInAs('TEACHER');
    const calls = api(lessonOf({ level: 2 }));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');

    await user.type(await screen.findByLabelText('Tiêu đề'), ' mới');
    await user.click(screen.getByRole('button', { name: 'Xem như học sinh' }));
    expect(await screen.findByText('Hãy lưu bài học trước khi xem như học sinh.')).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/preview'))).toBe(false);
  });

  it('máy chủ từ chối: hộp thoại báo lỗi', async () => {
    signInAs('TEACHER');
    api(lessonOf({ level: 2 }), (call) =>
      call.path === '/teacher/lessons/5/preview' ? envelope(404, { errorCode: ERROR_CODES.blocked, message: 'Không thể xem bài học. Không tìm thấy bài học.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5');
    await user.click(await screen.findByRole('button', { name: 'Xem như học sinh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem như học sinh' });
    expect(await within(dialog).findByText('Không thể xem bài học. Không tìm thấy bài học.')).toBeInTheDocument();
  });
});
