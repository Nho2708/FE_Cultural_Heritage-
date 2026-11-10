import { ERROR_CODES, type LessonLibraryItem } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { libraryDetailOf, libraryItemOf, lessonOf, materialsOf, quotaOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Thư viện bài mẫu của giáo viên: thẻ bài, bộ lọc trên URL, xem trước chỉ đọc, dùng cho lớp (chép kèm bài kiểm tra) rồi chuyển tới bài mới.

function pageOf(items: LessonLibraryItem[]) {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}

const classPage = {
  items: [classOf(1, { name: '7A1' }), classOf(2, { name: '10A1', grade: 10, schoolLevel: 3 })],
  page: 1,
  pageSize: 100,
  totalItems: 2,
  totalPages: 1,
};

function api(items: LessonLibraryItem[], extra?: (call: FetchCall) => Response | undefined, quota = quotaOf()) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path.startsWith('/teacher/lesson-library?')) return envelope(200, { data: pageOf(items) });
      if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quota });
      if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: classPage });
      return undefined;
    },
  );
}

const lastList = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/teacher/lesson-library?')).at(-1)?.path ?? '';

describe('Thư viện bài mẫu của giáo viên', () => {
  it('có mục điều hướng cạnh Bài học; thẻ bài hiện đủ thông tin và nhãn Bài của tôi', async () => {
    signInAs('TEACHER');
    api([
      libraryItemOf(1, { title: 'Ngọ Môn và Kinh thành Huế', summaryExcerpt: 'Kinh thành Huế khởi công năm 1805.', sectionCount: 5, quizCount: 2, useCount: 7 }),
      libraryItemOf(2, { title: 'Vịnh Hạ Long', isMine: true, authorName: 'Lê Thị Hoa', schoolName: 'THCS Trần Phú' }),
    ]);
    renderApp('/giao-vien/thu-vien-bai-mau');

    const nav = await screen.findByRole('navigation', { name: 'Khu giáo viên' });
    expect(within(nav).getByRole('link', { name: 'Thư viện bài mẫu' })).toHaveAttribute('href', '/giao-vien/thu-vien-bai-mau');
    const cards = await screen.findAllByRole('listitem', { name: /Ngọ Môn|Vịnh Hạ Long/ });
    expect(cards).toHaveLength(2);
    const first = cards[0]!;
    expect(within(first).getByText('Cấp 2 · Khối 7')).toBeInTheDocument();
    expect(within(first).getByText('Quần thể di tích Cố đô Huế')).toBeInTheDocument();
    expect(within(first).getByText('Kinh thành Huế khởi công năm 1805.')).toBeInTheDocument();
    expect(within(first).getByText('5 phần · 2 bài kiểm tra · 7 lượt dùng')).toBeInTheDocument();
    expect(within(first).getByText('Người soạn: Trần Văn Bình · Trường THCS Nguyễn Du')).toBeInTheDocument();
    expect(within(first).queryByText('Bài của tôi')).not.toBeInTheDocument();
    expect(within(cards[1]!).getByText('Bài của tôi')).toBeInTheDocument();
    expect(within(cards[1]!).getByText('Người soạn: Lê Thị Hoa · THCS Trần Phú')).toBeInTheDocument();
  });

  it('bộ lọc cấp, khối, sắp xếp, từ khóa gửi đúng tham số và nằm trên URL', async () => {
    signInAs('TEACHER');
    const calls = api([libraryItemOf(1)]);
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/thu-vien-bai-mau');

    await screen.findByRole('listitem', { name: 'Bài mẫu số 1' });
    expect(lastList(calls)).toContain('page=1');
    await user.selectOptions(screen.getByLabelText('Cấp'), '3');
    await user.selectOptions(screen.getByLabelText('Khối'), '10');
    await user.selectOptions(screen.getByLabelText('Sắp xếp'), 'dung-nhieu');
    await user.type(screen.getByRole('searchbox', { name: 'Tìm theo tiêu đề' }), 'Huế{Enter}');

    await waitFor(() => expect(lastList(calls)).toMatch(/level=3/));
    await waitFor(() => {
      const path = lastList(calls);
      expect(path).toMatch(/grade=10/);
      expect(path).toMatch(/sort=popular/);
      expect(path).toMatch(/keyword=Hu/);
    });
    expect(router.state.location.search).toContain('cap=3');
    expect(router.state.location.search).toContain('khoi=10');
    expect(router.state.location.search).toContain('sap-xep=dung-nhieu');
    expect(router.state.location.search).toContain('tu-khoa=');
  });

  it('lọc không có kết quả: báo và có nút Bỏ bộ lọc; thư viện trống chưa lọc: giải thích cách có bài mẫu', async () => {
    signInAs('TEACHER');
    api([]);
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/thu-vien-bai-mau?cap=3');
    await screen.findByText(/Không tìm thấy kết quả phù hợp/);
    await user.click(screen.getByRole('button', { name: 'Bỏ bộ lọc' }));
    expect(await screen.findByText('Thư viện chưa có bài mẫu nào.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('Xem trước mở bài như học sinh thấy kèm người soạn và bài kiểm tra; chỉ đọc', async () => {
    signInAs('TEACHER');
    const calls = api([libraryItemOf(1, { title: 'Ngọ Môn và Kinh thành Huế' })], (call) =>
      call.path === '/teacher/lesson-library/1' ? envelope(200, { data: libraryDetailOf(1) }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: 'Xem trước "Ngọ Môn và Kinh thành Huế"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem trước bài mẫu: Ngọ Môn và Kinh thành Huế' });
    expect(await within(dialog).findByText(/Bài của Trần Văn Bình, Trường THCS Nguyễn Du/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Kiểm tra 15 phút \(10 câu\)/)).toBeInTheDocument();
    expect(within(dialog).getByText('Nội dung bài mẫu.')).toBeInTheDocument();
    expect(calls.filter((c) => c.method !== 'GET')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Xem trước bài mẫu/ })).not.toBeInTheDocument());
  });

  it('xem trước lỗi: hiện lỗi và cho thử lại', async () => {
    signInAs('TEACHER');
    api([libraryItemOf(1)], (call) =>
      call.path === '/teacher/lesson-library/1' ? envelope(404, { errorCode: ERROR_CODES.notFound, message: 'Bài mẫu không còn trong thư viện.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: /Xem trước/ }));
    expect(await screen.findByText('Bài mẫu không còn trong thư viện.')).toBeInTheDocument();
  });

  it('Dùng cho lớp: chọn lớp khác cấp thì cảnh báo; gửi targetClassId và includeQuizzes; chuyển tới bài mới kèm câu lưu ý', async () => {
    signInAs('TEACHER');
    const copy = lessonOf({ id: 8, level: 3, status: 'DRAFT' });
    const message = 'Đã tạo bài học nháp ở lớp 10A1 từ bài mẫu.';
    const calls = api([libraryItemOf(1, { title: 'Ngọ Môn và Kinh thành Huế', quizCount: 2 })], (call) => {
      if (call.path === '/teacher/lesson-library/1/use') {
        return envelope(201, {
          data: { lesson: copy, skippedHeritages: 1, levelNotice: 'Lớp 10A1 thuộc cấp 3, khác cấp bài mẫu.', copiedQuizzes: 2, skippedQuestions: 3, message },
          message,
        });
      }
      if (call.path === '/teacher/lessons/8') return envelope(200, { data: copy });
      if (call.path === '/teacher/lessons/8/materials') return envelope(200, { data: materialsOf() });
      if (call.path.startsWith('/teacher/quizzes?')) return envelope(200, { data: { items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: 'Dùng "Ngọ Môn và Kinh thành Huế" cho lớp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Dùng bài mẫu cho lớp' });
    expect(within(dialog).getByText(/Cấp 2 · Khối 7 · 2 bài kiểm tra/)).toBeInTheDocument();
    const copyQuizzes = within(dialog).getByRole('checkbox', { name: 'Chép kèm bài kiểm tra' });
    expect(copyQuizzes).toBeChecked();
    await user.selectOptions(await within(dialog).findByLabelText('Lớp'), '2');
    expect(within(dialog).getByText(/Lớp 10A1 thuộc cấp 3, khác cấp 2 của bài mẫu/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Dùng bài mẫu' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/bai-hoc/8'));
    expect(calls.find((c) => c.path === '/teacher/lesson-library/1/use')?.body).toEqual({ targetClassId: 2, includeQuizzes: true });
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Đã bỏ 1 di sản đang ẩn của bài mẫu. Lớp 10A1 thuộc cấp 3, khác cấp bài mẫu. Đã chép 2 bài kiểm tra thành bản nháp. Đã bỏ 3 câu hỏi không dùng được cho lớp này.',
      ),
    ).toBeInTheDocument();
  });

  it('bài mẫu không có bài kiểm tra: không có ô chép kèm; chọn lớp cùng cấp', async () => {
    signInAs('TEACHER');
    const calls = api([libraryItemOf(1, { quizCount: 0 })], (call) => {
      if (call.path === '/teacher/lesson-library/1/use') return envelope(201, { data: { lesson: lessonOf({ id: 9 }), skippedHeritages: 0, levelNotice: null, copiedQuizzes: 0, skippedQuestions: 0, message: 'Đã tạo.' } });
      if (call.path === '/teacher/lessons/9') return envelope(200, { data: lessonOf({ id: 9 }) });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: /Dùng .* cho lớp/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Dùng bài mẫu cho lớp' });
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    await user.selectOptions(await within(dialog).findByLabelText('Lớp'), '1');
    expect(within(dialog).getByText(/Cùng cấp với bài mẫu/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Dùng bài mẫu' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/teacher/lesson-library/1/use')?.body).toEqual({ targetClassId: 1, includeQuizzes: false }));
  });

  it('chưa chọn lớp: báo lỗi, không gọi máy chủ; hết gói giữa chừng: hiện câu của máy chủ trong hộp thoại', async () => {
    signInAs('TEACHER');
    const reason = 'Không thể dùng bài mẫu. Trường chưa có gói dịch vụ còn hiệu lực.';
    const calls = api([libraryItemOf(1)], (call) =>
      call.path === '/teacher/lesson-library/1/use' ? envelope(422, { errorCode: 'PLAN_REQUIRED', message: reason }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: /Dùng .* cho lớp/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Dùng bài mẫu cho lớp' });
    await within(dialog).findByLabelText('Lớp');
    await user.click(within(dialog).getByRole('button', { name: 'Dùng bài mẫu' }));
    expect(await within(dialog).findByText('Vui lòng chọn lớp.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.selectOptions(within(dialog).getByLabelText('Lớp'), '1');
    await user.click(within(dialog).getByRole('button', { name: 'Dùng bài mẫu' }));
    expect(await within(dialog).findByText(reason)).toBeInTheDocument();
  });

  it('từ hộp xem trước bấm Dùng cho lớp: chuyển sang hộp chọn lớp', async () => {
    signInAs('TEACHER');
    api([libraryItemOf(1)], (call) => (call.path === '/teacher/lesson-library/1' ? envelope(200, { data: libraryDetailOf(1) }) : undefined));
    const user = userEvent.setup();
    renderApp('/giao-vien/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: /Xem trước/ }));
    const preview = await screen.findByRole('dialog', { name: /Xem trước bài mẫu/ });
    await user.click(within(preview).getByRole('button', { name: 'Dùng cho lớp…' }));
    expect(await screen.findByRole('dialog', { name: 'Dùng bài mẫu cho lớp' })).toBeInTheDocument();
  });

  it('trường hết gói: nút Dùng cho lớp bị khóa kèm thanh báo', async () => {
    signInAs('TEACHER');
    api([libraryItemOf(1)], undefined, quotaOf({ hasEffectivePlan: false, planName: null, max: null, remaining: null }));
    renderApp('/giao-vien/thu-vien-bai-mau');

    expect(await screen.findByText(/Trường chưa có gói dịch vụ còn hiệu lực/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Dùng .* cho lớp/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Xem trước/ })).toBeEnabled();
  });

  it('quản trị trường mở trang nhận 403 và không gọi API thư viện', async () => {
    signInAs('ORG_ADMIN');
    const calls = mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('ORG_ADMIN') }) : undefined));
    renderApp('/giao-vien/thu-vien-bai-mau');
    await screen.findByRole('navigation', { name: 'Quản trị trường' });
    expect(calls.some((c) => c.path.includes('lesson-library'))).toBe(false);
  });
});
