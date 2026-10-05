import { ERROR_CODES, type LessonRow } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { lessonOf, lessonRowOf, quotaOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Bài học của tôi: danh sách, lọc, mã bài học và chiếu lên bảng, lưu trữ, xóa, khóa theo gói, tạo bài học hai bước.

function pageOf(items: LessonRow[]) {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}

const classPage = { items: [classOf(1, { name: '7A1' }), classOf(2, { name: '4B1', grade: 4, schoolLevel: 1 })], page: 1, pageSize: 100, totalItems: 2, totalPages: 1 };

function api(rows: LessonRow[], extra?: (call: FetchCall) => Response | undefined, quota = quotaOf()) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path.startsWith('/teacher/lessons?')) return envelope(200, { data: pageOf(rows) });
      if (call.path === '/teacher/lessons/ai-quota') return envelope(200, { data: quota });
      if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: classPage });
      return undefined;
    },
  );
}

describe('Bài học của tôi', () => {
  it('bảng: tiêu đề kèm di sản, lớp, trạng thái, mã chỉ có ở bài đã xuất bản, số bài kiểm tra', async () => {
    signInAs('TEACHER');
    api([
      lessonRowOf(1, { title: 'Ngọ Môn và Kinh thành Huế', status: 'PUBLISHED', accessCode: 'BH7F3K2Q', quizCount: 1 }),
      lessonRowOf(2, { title: 'Vịnh Hạ Long', status: 'DRAFT', className: '9A3', classId: 3 }),
    ]);
    renderApp('/giao-vien/bai-hoc');

    const table = await screen.findByRole('table', { name: 'Bài học của tôi' });
    const published = within(table).getByRole('row', { name: /Ngọ Môn/ });
    expect(within(published).getByText('Đã xuất bản')).toBeInTheDocument();
    expect(within(published).getByText('BH7F3K2Q')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'Ngọ Môn và Kinh thành Huế' })).toHaveAttribute('href', '/giao-vien/bai-hoc/1');
    const draft = within(table).getByRole('row', { name: /Vịnh Hạ Long/ });
    expect(within(draft).getByText('Nháp')).toBeInTheDocument();
    expect(within(draft).queryByRole('button', { name: /Mã bài học/ })).not.toBeInTheDocument();
    expect(await screen.findByText(/2 bài học ở 2 lớp · 1 đã xuất bản · 1 nháp · 0 lưu trữ/)).toBeInTheDocument();
  });

  it('lọc theo lớp, trạng thái, loại di sản và từ khóa gửi đúng tham số', async () => {
    signInAs('TEACHER');
    const calls = api([lessonRowOf(1)]);
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc');

    await screen.findByRole('table', { name: 'Bài học của tôi' });
    await user.selectOptions(screen.getByLabelText('Lớp'), '1');
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'da-xuat-ban');
    await user.selectOptions(screen.getByLabelText('Loại di sản'), 'phi-vat-the');

    await waitFor(() => {
      const last = calls.filter((c) => c.path.startsWith('/teacher/lessons?')).at(-1)?.path ?? '';
      expect(last).toContain('classId=1');
      expect(last).toContain('status=PUBLISHED');
      expect(last).toContain('heritageType=INTANGIBLE');
    });
  });

  it('mã bài học: hộp thoại có mã, đường dẫn, sao chép; chiếu lên bảng hiện mã chia nhóm và Esc để thoát', async () => {
    signInAs('TEACHER');
    api([lessonRowOf(1, { title: 'Ngọ Môn', status: 'PUBLISHED', accessCode: 'BH7F3K2Q' })]);
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc');

    await user.click(await screen.findByRole('button', { name: /Mã bài học "Ngọ Môn"/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Mã bài học' });
    expect(within(dialog).getByTestId('ma-bai-hoc')).toHaveTextContent('BH7F3K2Q');
    expect(within(dialog).getByLabelText('Đường dẫn bài học')).toHaveValue('hoc.test/bai-hoc/BH7F3K2Q');
    expect(within(dialog).getByText(/Chỉ học sinh lớp 7A1 đã đăng nhập mới mở được/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Chiếu lên bảng' }));
    const board = await screen.findByRole('dialog', { name: 'Mã bài học BH7F3K2Q' });
    expect(within(board).getByTestId('ma-chieu-bang')).toHaveTextContent('BH 7F3 K2Q');
    expect(within(board).getByText('Mở Học di sản → Nhập mã')).toBeInTheDocument();
    await user.click(within(board).getByRole('button', { name: /Thoát/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mã bài học BH7F3K2Q' })).not.toBeInTheDocument());
  });

  it('lưu trữ: hỏi xác nhận rồi gọi máy chủ; xóa chỉ có ở bài chưa có bài kiểm tra', async () => {
    signInAs('TEACHER');
    const calls = api(
      [
        lessonRowOf(1, { title: 'Hoàng thành', status: 'PUBLISHED', accessCode: 'BH2K7P5M', className: '7A2' }),
        lessonRowOf(2, { title: 'Đã có kiểm tra', status: 'PUBLISHED', accessCode: 'BH9D4T6R', quizCount: 2 }),
      ],
      (call) => (call.path === '/teacher/lessons/1/archive' ? envelope(200, { data: lessonOf({ status: 'ARCHIVED' }), message: 'Lưu trữ bài học thành công.' }) : undefined),
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc');

    expect(await screen.findByRole('button', { name: 'Xóa "Hoàng thành"' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa "Đã có kiểm tra"' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lưu trữ "Hoàng thành"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lưu trữ bài học "Hoàng thành"?' });
    expect(within(dialog).getByText(/Học sinh lớp 7A2 không mở được bài học bằng mã nữa/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Lưu trữ' }));

    expect(await screen.findByText('Lưu trữ bài học thành công.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/teacher/lessons/1/archive')).toBe(true);
  });

  it('lưu trữ bị chặn khi còn bài kiểm tra đang mở: toast hiện lý do máy chủ', async () => {
    signInAs('TEACHER');
    const reason = 'Không thể lưu trữ bài học. Bài học còn bài kiểm tra đang mở. Hãy đóng bài kiểm tra trước.';
    api([lessonRowOf(1, { title: 'Hoàng thành', status: 'PUBLISHED', accessCode: 'BH2K7P5M' })], (call) =>
      call.path.endsWith('/archive') ? envelope(422, { errorCode: ERROR_CODES.blocked, message: reason }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc');

    await user.click(await screen.findByRole('button', { name: 'Lưu trữ "Hoàng thành"' }));
    const dialog = await screen.findByRole('dialog', { name: /Lưu trữ bài học/ });
    await user.click(within(dialog).getByRole('button', { name: 'Lưu trữ' }));
    expect(await screen.findByText(reason)).toBeInTheDocument();
  });

  it('trường hết gói: thanh báo, nút Tạo bài học và Nhân bản bị khóa, các thao tác khác vẫn dùng được', async () => {
    signInAs('TEACHER');
    api([lessonRowOf(1, { title: 'Hoàng thành', status: 'PUBLISHED', accessCode: 'BH2K7P5M' })], undefined, quotaOf({ hasEffectivePlan: false, planName: null, max: null, remaining: null }));
    renderApp('/giao-vien/bai-hoc');

    expect(await screen.findByText(/Trường chưa có gói dịch vụ còn hiệu lực/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Tạo bài học' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nhân bản "Hoàng thành" sang lớp khác' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Soạn "Hoàng thành"' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Mã bài học "Hoàng thành"/ })).toBeEnabled();
  });

  it('chưa có bài học: trạng thái rỗng hướng dẫn tạo bài', async () => {
    signInAs('TEACHER');
    api([]);
    renderApp('/giao-vien/bai-hoc');
    expect(await screen.findByText('Thầy cô chưa có bài học nào.')).toBeInTheDocument();
  });
});

describe('Tạo bài học', () => {
  const heritagePage = {
    items: [
      { id: 11, slug: 'co-do-hue', name: 'Quần thể di tích Cố đô Huế', shortDescription: null, thumbnailUrl: null, provinceId: 1, provinceName: 'Thành phố Huế', region: 'Trung', heritageType: 'TANGIBLE', recognitionLevel: 'UNESCO', recognizedYear: 1993 },
      { id: 12, slug: 'nha-nhac', name: 'Nhã nhạc cung đình Huế', shortDescription: null, thumbnailUrl: null, provinceId: 1, provinceName: 'Thành phố Huế', region: 'Trung', heritageType: 'INTANGIBLE', recognitionLevel: 'UNESCO', recognizedYear: 2003 },
    ],
    page: 1,
    pageSize: 12,
    totalItems: 2,
    totalPages: 1,
  };

  function withHeritages(rows: LessonRow[], extra?: (call: FetchCall) => Response | undefined) {
    return api(rows, (call) => {
      const own = extra?.(call);
      if (own) return own;
      if (call.path.startsWith('/public/filters')) return envelope(200, { data: { provinces: [{ id: 1, code: '46', name: 'Thành phố Huế', region: 'Trung' }], regions: [], heritageTypes: [], recognitionLevels: [], periods: [] } });
      if (call.path.startsWith('/public/heritages')) return envelope(200, { data: heritagePage });
      return undefined;
    });
  }

  it('hai bước: chọn lớp, rồi chọn di sản và tiêu đề; tạo xong mở màn hình Soạn bài học', async () => {
    signInAs('TEACHER');
    const calls = withHeritages([], (call) => {
      if (call.path === '/teacher/lessons' && call.method === 'POST') return envelope(201, { data: lessonOf({ id: 77 }), message: 'Tạo bài học thành công.' });
      if (call.path === '/teacher/lessons/77') return envelope(200, { data: lessonOf({ id: 77 }) });
      if (call.path === '/teacher/lessons/77/materials') return envelope(200, { data: { images: [], events: [] } });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/bai-hoc');

    await user.click(await screen.findByRole('button', { name: 'Tạo bài học' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài học' });
    expect(within(dialog).getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
    await user.click(await within(dialog).findByRole('radio', { name: 'Lớp 7A1' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tiếp tục' }));

    await user.click(await within(dialog).findByRole('checkbox', { name: 'Quần thể di tích Cố đô Huế' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Nhã nhạc cung đình Huế' }));
    expect(within(dialog).getByText('Đã chọn 2 di sản')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Tiêu đề bài học')).toHaveValue('Quần thể di tích Cố đô Huế');
    await user.clear(within(dialog).getByLabelText('Tiêu đề bài học'));
    await user.type(within(dialog).getByLabelText('Tiêu đề bài học'), 'Ngọ Môn và Kinh thành Huế');
    await user.click(within(dialog).getByRole('button', { name: 'Tạo bài học' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/bai-hoc/77'));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/teacher/lessons')?.body).toEqual({
      classId: 1,
      title: 'Ngọ Môn và Kinh thành Huế',
      heritageIds: [11, 12],
    });
  });

  it('chưa chọn di sản hoặc thiếu tiêu đề: báo lỗi, không gọi máy chủ', async () => {
    signInAs('TEACHER');
    const calls = withHeritages([]);
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc');

    await user.click(await screen.findByRole('button', { name: 'Tạo bài học' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài học' });
    await user.click(await within(dialog).findByRole('radio', { name: 'Lớp 4B1' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tiếp tục' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Tạo bài học' }));

    expect(await within(dialog).findByText('Vui lòng chọn ít nhất một di sản.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập tiêu đề bài học.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('trường hết gói giữa chừng: máy chủ từ chối, câu lý do hiện ngay trong hộp thoại', async () => {
    signInAs('TEACHER');
    const reason = 'Không thể tạo bài học. Trường chưa có gói dịch vụ còn hiệu lực.';
    withHeritages([], (call) => (call.method === 'POST' && call.path === '/teacher/lessons' ? envelope(422, { errorCode: ERROR_CODES.blocked, message: reason }) : undefined));
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc');

    await user.click(await screen.findByRole('button', { name: 'Tạo bài học' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài học' });
    await user.click(await within(dialog).findByRole('radio', { name: 'Lớp 7A1' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tiếp tục' }));
    await user.click(await within(dialog).findByRole('checkbox', { name: 'Quần thể di tích Cố đô Huế' }));
    await user.click(within(dialog).getByRole('button', { name: 'Tạo bài học' }));

    expect(await within(dialog).findByText(reason)).toBeInTheDocument();
  });
});
