import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';
import { classRecommendationsOf, masteryOf, progressOf } from '../../test/statisticsFixtures';

// Ba tab thống kê của Chi tiết lớp: Tiến độ, Thành thạo (bảng nhiệt, bộ lọc), Gợi ý ôn tập.

function api(extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === '/teacher/classes/1') return envelope(200, { data: classOf(1) });
      if (call.path === '/teacher/classes/1/progress') return envelope(200, { data: progressOf() });
      if (call.path.startsWith('/teacher/classes/1/mastery')) return envelope(200, { data: masteryOf() });
      if (call.path.startsWith('/teacher/classes/1/recommendations')) return envelope(200, { data: classRecommendationsOf() });
      if (call.path === '/public/filters') return envelope(200, { data: { provinces: [{ id: 1, name: 'Thành phố Hà Nội', slug: 'ha-noi' }], regions: [], types: [] } });
      return undefined;
    },
  );
}

describe('Chi tiết lớp — tab Tiến độ', () => {
  it('thẻ tiến độ, bài kiểm tra đã phát hành kèm liên kết kết quả, bảng học sinh × bài kiểm tra, liên kết hồ sơ học sinh', async () => {
    signInAs('TEACHER');
    api();
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/lop/1?tab=tien-do');

    expect(await screen.findByText('73,4%', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Chưa đăng nhập lần nào')).toBeInTheDocument();
    const quizzes = screen.getByRole('region', { name: 'Bài kiểm tra đã phát hành' });
    expect(within(quizzes).getByText('18 / 32')).toBeInTheDocument();
    expect(within(quizzes).getByRole('link', { name: 'Kiểm tra 15 phút: Kinh thành Huế' })).toHaveAttribute('href', '/giao-vien/kiem-tra/9/ket-qua');

    const table = screen.getByRole('table', { name: 'Học sinh và bài kiểm tra của lớp' });
    const first = within(table).getByRole('row', { name: /Nguyễn Minh Anh/ });
    expect(within(first).getByText('9/10')).toBeInTheDocument();
    expect(within(first).getByText('Hết giờ, tự nộp')).toBeInTheDocument();
    expect(within(first).getByText('2/2')).toBeInTheDocument();
    const second = within(table).getByRole('row', { name: /Trần Gia Bảo/ });
    expect(within(second).getAllByText('Chưa làm')).toHaveLength(2);

    await user.click(within(first).getByRole('link', { name: 'Nguyễn Minh Anh' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/lop/1/hoc-sinh/1'));
  });

  it('lớp cấp 1: giải thích học sinh chỉ thấy sao còn giáo viên thấy điểm', async () => {
    signInAs('TEACHER');
    mockApi(
      (call) => (call.path === '/teacher/classes/1/progress' ? envelope(200, { data: progressOf({ level: 1, cells: [{ studentId: 1, quizId: 9, attemptId: 301, status: 'SUBMITTED', score: 9, totalPoint: 10, percent: 90, stars: 3 }] }) }) : undefined),
      (call) => {
        if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
        if (call.path === '/teacher/classes/1') return envelope(200, { data: classOf(1, { schoolLevel: 1, grade: 4 }) });
        return undefined;
      },
    );
    renderApp('/giao-vien/lop/1?tab=tien-do');
    expect(await screen.findByText(/học sinh chỉ thấy số sao và lời khen/, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('9/10')).toBeInTheDocument();
    expect(screen.getByText('3 sao')).toBeInTheDocument();
  });

  it('lớp chưa có học sinh: báo trống', async () => {
    signInAs('TEACHER');
    mockApi(
      (call) => (call.path === '/teacher/classes/1/progress' ? envelope(200, { data: progressOf({ students: [], cells: [], quizzes: [], enrolled: 0 }) }) : undefined),
      (call) => {
        if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
        if (call.path === '/teacher/classes/1') return envelope(200, { data: classOf(1) });
        return undefined;
      },
    );
    renderApp('/giao-vien/lop/1?tab=tien-do');
    expect(await screen.findByText('Lớp chưa có học sinh đang hoạt động.', undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});

describe('Chi tiết lớp — tab Thành thạo', () => {
  it('bảng nhiệt học sinh × di sản có phần trăm và chú giải; lọc theo tỉnh gọi lại với tham số', async () => {
    signInAs('TEACHER');
    const calls = api();
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1?tab=thanh-thao');

    const heat = await screen.findByRole('table', { name: 'Tỉ lệ đúng của từng học sinh theo di sản' }, { timeout: 5000 });
    expect(within(heat).getByRole('rowheader', { name: 'Cả lớp' })).toBeInTheDocument();
    expect(within(heat).getByLabelText('Nguyễn Minh Anh, Văn Miếu – Quốc Tử Giám: 80%, Thành thạo')).toBeInTheDocument();
    expect(within(heat).getByLabelText('Nguyễn Minh Anh, Quần thể di tích Cố đô Huế: 40%, Cần ôn')).toBeInTheDocument();
    expect(within(heat).getByLabelText('Trần Gia Bảo, Văn Miếu – Quốc Tử Giám: chưa có dữ liệu')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Chú giải màu' })).toHaveTextContent('Dưới 50%: nên ôn');
    expect(screen.getByText('Tỉ lệ đúng theo dạng câu')).toBeInTheDocument();

    await user.selectOptions(await screen.findByLabelText('Tỉnh'), '1');
    await user.selectOptions(screen.getByLabelText('Loại di sản'), 'TANGIBLE');
    await waitFor(() => expect(calls.some((c) => c.path === '/teacher/classes/1/mastery?provinceId=1&heritageType=TANGIBLE')).toBe(true));
  });

  it('chưa có lượt nộp: báo trống', async () => {
    signInAs('TEACHER');
    mockApi(
      (call) =>
        call.path.startsWith('/teacher/classes/1/mastery')
          ? envelope(200, { data: masteryOf({ byHeritage: [], byProvince: [], byHeritageType: [], byQuestionType: [], heatmapStudents: [], heatmapCells: [], message: 'Chưa có học sinh nào nộp bài.' }) })
          : undefined,
      (call) => {
        if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
        if (call.path === '/teacher/classes/1') return envelope(200, { data: classOf(1) });
        if (call.path === '/public/filters') return envelope(200, { data: { provinces: [], regions: [], types: [] } });
        return undefined;
      },
    );
    renderApp('/giao-vien/lop/1?tab=thanh-thao');
    expect(await screen.findByText('Chưa có dữ liệu thành thạo.', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Chưa có học sinh nào nộp bài.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('Chi tiết lớp — tab Gợi ý ôn tập', () => {
  it('chọn bài kiểm tra thu hẹp phạm vi; Tạo bài ôn tập (cả lớp) mở hộp thoại với lớp khóa và di sản chọn sẵn', async () => {
    signInAs('TEACHER');
    const calls = api();
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1?tab=goi-y-on-tap');

    expect(await screen.findByRole('region', { name: 'Di sản nên ôn' }, { timeout: 5000 })).toHaveTextContent('Lớp sai 44% ở 216 câu về di sản này');
    await user.selectOptions(await screen.findByLabelText('Phạm vi'), '9');
    await waitFor(() => expect(calls.some((c) => c.path.startsWith('/teacher/classes/1/recommendations?quizId=9'))).toBe(true));

    await user.click(screen.getByRole('button', { name: 'Tạo bài ôn tập' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài học' }, { timeout: 5000 });
    expect(within(dialog).getByText(/Mở từ Chi tiết lớp nên lớp được chọn sẵn và khóa/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Tiêu đề bài học')).toHaveValue('Ôn tập: Văn Miếu – Quốc Tử Giám');
  }, 20_000);
});
