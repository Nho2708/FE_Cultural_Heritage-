import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';
import {
  attemptDetailOf,
  classRecommendationsOf,
  overviewOf,
  questionStatsOf,
  quizStudentsOf,
  quizTopicsOf,
  studentRowOf,
} from '../../test/statisticsFixtures';

// Kết quả bài kiểm tra của giáo viên: bốn tab (Tổng quan, Từng câu, Từng học sinh, Gợi ý), Chi tiết bài làm, đóng bài, bài của người khác.

const BASE = '/teacher/quizzes/9/results';

function api(extra?: (call: FetchCall) => Response | undefined, overview = overviewOf()) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === BASE) return envelope(200, { data: overview });
      if (call.path === `${BASE}/questions`) return envelope(200, { data: questionStatsOf() });
      if (call.path === `${BASE}/topics`) return envelope(200, { data: quizTopicsOf() });
      if (call.path === `${BASE}/students`) {
        return envelope(200, {
          data: quizStudentsOf([
            studentRowOf(1, { fullName: 'Nguyễn Minh Anh', studentCode: 'HS8K2QX7', score: 7.5 }),
            studentRowOf(2, { fullName: 'Lê Khánh Chi', studentCode: 'HS7Q2LC5', status: 'EXPIRED', statusLabel: 'Hết giờ, tự nộp', score: 6, percent: 60 }),
            studentRowOf(3, { fullName: 'Võ Ngọc Hân', studentCode: 'HS2N6HG4', status: 'IN_PROGRESS', statusLabel: 'Đang làm', score: null, totalPoint: null, percent: null, submittedAt: null, durationSeconds: null }),
            studentRowOf(4, { fullName: 'Đặng Minh Khoa', studentCode: 'HS9T4KH8', status: 'NOT_STARTED', statusLabel: 'Chưa làm', attemptId: null, score: null, totalPoint: null, percent: null, startedAt: null, submittedAt: null, durationSeconds: null }),
          ]),
        });
      }
      if (call.path.startsWith(`${BASE}/recommendations`)) return envelope(200, { data: classRecommendationsOf({ quizId: 9 }) });
      if (call.path === '/teacher/attempts/301') return envelope(200, { data: attemptDetailOf() });
      return undefined;
    },
  );
}

describe('Kết quả bài kiểm tra — Tổng quan', () => {
  it('đầu trang có tên bài, lớp, cấp, sĩ số; thẻ điểm trung bình, cao nhất, thấp nhất, đã nộp và phổ điểm', async () => {
    signInAs('TEACHER');
    api();
    renderApp('/giao-vien/kiem-tra/9/ket-qua');

    expect(await screen.findByRole('heading', { level: 1, name: 'Kiểm tra 15 phút: Kinh thành Thăng Long' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/Lớp 7A1 · Cấp 2 · 32 học sinh · 10 câu/)).toBeInTheDocument();
    expect(await screen.findByText('Điểm trung bình')).toBeInTheDocument();
    expect(screen.getByText('7,4')).toBeInTheDocument();
    expect(screen.getByText('28 / 32')).toBeInTheDocument();
    expect(screen.getByText(/Chưa làm 3 em · 1 em đang làm/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Phổ điểm' })).toBeInTheDocument();
    expect(screen.getByText('90–100% (gồm 100%): 8 học sinh')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tổng quan', selected: true })).toBeInTheDocument();
  });

  it('chưa có bài nộp: các số điểm là gạch ngang và hiện lời báo của máy chủ', async () => {
    signInAs('TEACHER');
    api(undefined, overviewOf({ finished: 0, submitted: 0, autoSubmitted: 0, averageScore: null, highestScore: null, lowestScore: null, averagePercent: null, highestPercent: null, lowestPercent: null, message: 'Chưa có học sinh nào nộp bài.' }));
    renderApp('/giao-vien/kiem-tra/9/ket-qua');
    expect(await screen.findByText('Chưa có học sinh nào nộp bài.', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Chưa có bài nộp')).toBeInTheDocument();
  });

  it('bài của người khác (404): báo không tìm thấy bài kiểm tra', async () => {
    signInAs('TEACHER');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      return envelope(404, { errorCode: 'BLOCKED', message: 'Không tìm thấy dữ liệu.' });
    });
    renderApp('/giao-vien/kiem-tra/77/ket-qua');
    expect(await screen.findByText('Không tìm thấy bài kiểm tra.', undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});

describe('Kết quả bài kiểm tra — Từng câu', () => {
  it('bảng có dạng câu, tỉ lệ đúng, phương án chọn nhiều nhất, lỗi hay gặp; câu dưới 50% bị cảnh báo; có tỉ lệ theo di sản', async () => {
    signInAs('TEACHER');
    api();
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/kiem-tra/9/ket-qua');
    await user.click(await screen.findByRole('tab', { name: 'Từng câu' }, { timeout: 5000 }));

    const table = await screen.findByRole('table', { name: /Tỉ lệ đúng của 3 câu hỏi/ });
    expect(router.state.location.search).toBe('?tab=tung-cau');
    const second = within(table).getByRole('row', { name: /Câu hỏi số 2/ });
    expect(within(second).getByText('Sắp xếp sự kiện')).toBeInTheDocument();
    expect(within(second).getByText(/Mở Quốc Tử Giám: Đặt trước Xây dựng Văn Miếu · 9 em/)).toBeInTheDocument();
    const weak = within(table).getByRole('row', { name: /Câu hỏi số 5/ });
    expect(within(weak).getByText('Dưới 50% — nên ôn lại')).toBeInTheDocument();
    expect(within(weak).getByText('(sai)')).toBeInTheDocument();
    expect(within(weak).getByText(/Phía bắc · 13 em/)).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Tỉ lệ đúng theo di sản' })).toBeInTheDocument();
  });
});

describe('Kết quả bài kiểm tra — Từng học sinh', () => {
  it('liệt kê cả em chưa làm; lọc theo trạng thái; mở Chi tiết bài làm từ dòng đã nộp', async () => {
    signInAs('TEACHER');
    api();
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9/ket-qua?tab=tung-hoc-sinh');

    const table = await screen.findByRole('table', { name: 'Kết quả từng học sinh' }, { timeout: 5000 });
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(table).getByText('Hết giờ, tự nộp')).toBeInTheDocument();
    expect(within(table).getByText('Chưa làm')).toBeInTheDocument();
    // Em chưa làm không có liên kết xem bài làm.
    expect(within(within(table).getByRole('row', { name: /Đặng Minh Khoa/ })).queryByRole('button')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'EXPIRED');
    expect(within(await screen.findByRole('table', { name: 'Kết quả từng học sinh' })).getAllByRole('row')).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText('Trạng thái'), '');

    await user.click(screen.getByRole('button', { name: 'Nguyễn Minh Anh' }));
    const dialog = await screen.findByRole('dialog', { name: /Nguyễn Minh Anh · HS8K2QX7/ });
    expect(within(dialog).getByText('7,5/10')).toBeInTheDocument();
    expect(within(dialog).getByText('Nộp đúng hạn')).toBeInTheDocument();
    // Câu đúng, câu sắp xếp sai một phần có đáp án đúng cạnh câu em sắp, câu bỏ trống.
    expect(within(dialog).getByRole('article', { name: 'Câu 1' })).toHaveTextContent('Em chọn – đúng');
    expect(within(dialog).getByRole('article', { name: 'Câu 2' })).toHaveTextContent('Đúng một phần');
    expect(within(dialog).getByRole('article', { name: 'Câu 2' })).toHaveTextContent('Thứ tự đúng');
    expect(within(dialog).getByRole('article', { name: 'Câu 3' })).toHaveTextContent('Bỏ trống');
    expect(within(dialog).getByText(/Giải thích:/)).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole('button', { name: 'Đóng' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Nguyễn Minh Anh/ })).not.toBeInTheDocument());
  });
});

describe('Kết quả bài kiểm tra — Gợi ý', () => {
  it('hiện di sản nên ôn và di sản liên quan với lý do; đổi khoảng thời gian gọi lại; Tạo bài ôn tập mở hộp thoại với di sản chọn sẵn', async () => {
    signInAs('TEACHER');
    const calls = api((call) => {
      if (call.path === '/teacher/classes/1') return envelope(200, { data: classOf(1) });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9/ket-qua?tab=goi-y');

    const review = await screen.findByRole('region', { name: 'Di sản nên ôn' }, { timeout: 5000 });
    expect(within(review).getByText('Lớp sai 44% ở 216 câu về di sản này')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Di sản liên quan' })).toHaveTextContent('Nhã nhạc – Âm nhạc cung đình Việt Nam');
    expect(screen.getByText(/Không gửi họ tên, mã học sinh hay tên lớp sang dịch vụ AI/)).toBeInTheDocument();
    const first = calls.find((c) => c.path.startsWith(`${BASE}/recommendations`));
    expect(first?.path).toMatch(/from=/);

    await user.selectOptions(screen.getByLabelText('Thời gian'), 'all');
    await waitFor(() => expect(calls.some((c) => c.path === `${BASE}/recommendations`)).toBe(true));

    await user.click(within(await screen.findByRole('region', { name: 'Di sản nên ôn' })).getByRole('button', { name: 'Tạo bài ôn tập về Văn Miếu – Quốc Tử Giám' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo bài học' }, { timeout: 5000 });
    expect(within(dialog).getByLabelText('Tiêu đề bài học')).toHaveValue('Ôn tập: Văn Miếu – Quốc Tử Giám');
  }, 20_000);

  it('dịch vụ AI chưa phản hồi: báo di sản liên quan chọn theo cùng tỉnh hoặc loại', async () => {
    signInAs('TEACHER');
    mockApi(
      (call) => (call.path.startsWith(`${BASE}/recommendations`) ? envelope(200, { data: classRecommendationsOf({ relatedFromFallback: true, heritagesToReview: [], message: 'Chưa có di sản nào đạt ngưỡng nên ôn.' }) }) : undefined),
      (call) => {
        if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
        if (call.path === BASE) return envelope(200, { data: overviewOf() });
        return undefined;
      },
    );
    renderApp('/giao-vien/kiem-tra/9/ket-qua?tab=goi-y');
    expect(await screen.findByText(/Dịch vụ AI chưa phản hồi/, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Chưa có di sản nào đạt ngưỡng nên ôn.')).toBeInTheDocument();
    expect(screen.getByText('Chưa có di sản nào cần ôn.')).toBeInTheDocument();
  });
});

describe('Kết quả bài kiểm tra — Đóng bài', () => {
  it('bài đang phát hành có nút Đóng bài kiểm tra: hỏi xác nhận rồi gọi đóng', async () => {
    signInAs('TEACHER');
    const calls = api((call) => {
      if (call.path === '/teacher/quizzes/9/close' && call.method === 'POST') return envelope(200, { data: { message: 'Đóng bài kiểm tra thành công.', quiz: {} } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9/ket-qua');
    await user.click(await screen.findByRole('button', { name: 'Đóng bài kiểm tra' }, { timeout: 5000 }));
    const dialog = await screen.findByRole('alertdialog').catch(() => screen.findByRole('dialog', { name: /Đóng bài kiểm tra/ }));
    expect(dialog).toHaveTextContent('Hiện 28/32 em đã nộp.');
    await user.click(within(dialog).getByRole('button', { name: 'Đóng bài kiểm tra' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/teacher/quizzes/9/close' && c.method === 'POST')).toBe(true));
  });

  it('bài đã đóng không còn nút Đóng bài kiểm tra', async () => {
    signInAs('TEACHER');
    api(undefined, overviewOf({ status: 'CLOSED' }));
    renderApp('/giao-vien/kiem-tra/9/ket-qua');
    await screen.findByText('Điểm trung bình', undefined, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: 'Đóng bài kiểm tra' })).not.toBeInTheDocument();
  });
});
