import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';
import { attemptDetailOf, profileOf } from '../../test/statisticsFixtures';

// Hồ sơ học tập của học sinh (giáo viên): số liệu tổng, biểu đồ điểm, lịch sử làm bài mở Chi tiết bài làm, bài học hoàn thành, thành thạo, huy hiệu.

const PATH = '/teacher/classes/1/students/1/profile';

function api(profile = profileOf()) {
  return mockApi((call) => {
    if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
    if (call.path === '/teacher/classes/1') return envelope(200, { data: classOf(1) });
    if (call.path === PATH) return envelope(200, { data: profile });
    if (call.path === '/teacher/attempts/301') return envelope(200, { data: attemptDetailOf() });
    return undefined;
  });
}

describe('Hồ sơ học tập của học sinh', () => {
  it('đầu trang có họ tên, mã, lớp, lần đăng nhập gần nhất, trạng thái; bốn thẻ số liệu và biểu đồ điểm có bảng số cho trình đọc', async () => {
    signInAs('TEACHER');
    api();
    renderApp('/giao-vien/lop/1/hoc-sinh/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Nguyễn Minh Anh' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('HS8K2QX7')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('trên 3 bài đã phát hành', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '7A1' })).toHaveAttribute('href', '/giao-vien/lop/1');
    const chart = screen.getByRole('figure', { name: /Điểm theo thời gian: 2 lượt làm bài/ });
    expect(within(chart).getByText('9 trên 10')).toBeInTheDocument();
  });

  it('lịch sử làm bài: bấm một dòng mở Chi tiết bài làm; lượt hết giờ có nhãn tự nộp', async () => {
    signInAs('TEACHER');
    api();
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1/hoc-sinh/1');

    const table = await screen.findByRole('table', { name: 'Lịch sử làm bài của học sinh' }, { timeout: 5000 });
    expect(within(table).getByText('Hết giờ, tự nộp')).toBeInTheDocument();
    await user.click(within(table).getByRole('button', { name: 'Kiểm tra 15 phút: Kinh thành Huế' }));
    const dialog = await screen.findByRole('dialog', { name: /Nguyễn Minh Anh · HS8K2QX7/ });
    expect(within(dialog).getByText('7,5/10')).toBeInTheDocument();
  });

  it('bài học hoàn thành, mức thành thạo theo di sản kèm nhãn mức, huy hiệu', async () => {
    signInAs('TEACHER');
    api();
    renderApp('/giao-vien/lop/1/hoc-sinh/1');

    const lessons = await screen.findByRole('region', { name: 'Bài học đã hoàn thành' }, { timeout: 5000 });
    expect(within(lessons).getByText('Ngọ Môn và Kinh thành Huế')).toBeInTheDocument();
    const mastery = screen.getByRole('region', { name: 'Mức thành thạo theo di sản' });
    expect(within(mastery).getAllByText('Thành thạo').length).toBeGreaterThan(0);
    expect(within(mastery).getAllByText('Đạt').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Huy hiệu' })).getByText('Xuất sắc')).toBeInTheDocument();
  });

  it('lớp cấp 1: lịch sử kèm số sao', async () => {
    signInAs('TEACHER');
    const base = profileOf();
    api(profileOf({ level: 1, totalStars: 5, history: base.history.map((row) => ({ ...row, stars: 3 })) }));
    renderApp('/giao-vien/lop/1/hoc-sinh/1');
    const table = await screen.findByRole('table', { name: 'Lịch sử làm bài của học sinh' }, { timeout: 5000 });
    expect(within(table).getAllByText('3 sao')).toHaveLength(2);
    expect(screen.getByText(/5 sao/)).toBeInTheDocument();
  });

  it('chưa nộp bài nào: báo trống kèm lời của máy chủ', async () => {
    signInAs('TEACHER');
    api(profileOf({ history: [], scoreTrend: [], completedLessons: [], masteryByHeritage: [], masteryByProvince: [], badges: [], finishedAttempts: 0, averagePercent: null, quizzesSubmitted: 0, message: 'Em chưa nộp bài kiểm tra nào.' }));
    renderApp('/giao-vien/lop/1/hoc-sinh/1');
    expect(await screen.findAllByText('Em chưa nộp bài kiểm tra nào.', undefined, { timeout: 5000 })).not.toHaveLength(0);
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('học sinh của lớp khác (404): báo không tìm thấy học sinh', async () => {
    signInAs('TEACHER');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      return envelope(404, { errorCode: 'BLOCKED', message: 'Không tìm thấy dữ liệu.' });
    });
    renderApp('/giao-vien/lop/1/hoc-sinh/99');
    expect(await screen.findByText('Không tìm thấy học sinh.', undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});
