import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf } from '../../test/fixtures';
import { overviewClassOf, schoolOverviewOf } from '../../test/overviewFixtures';
import { renderApp, signInAs } from '../../test/renderApp';
import type { SchoolOverview } from '@dsvhvn/dung-chung/api';

// Tổng quan trường: thẻ số liệu, hạn mức giáo viên và lượt AI, điểm trung bình theo lớp, gói hiện tại và lời nhắc.

function api(overview: SchoolOverview, fail = false) {
  return mockApi((call) => {
    if (call.path === '/me') return envelope(200, { data: userOf('ORG_ADMIN') });
    if (call.path === '/org') return envelope(200, { data: { subscription: overview.plan, teacherQuota: overview.teachers } });
    if (call.path === '/org/overview')
      return fail ? envelope(500, { errorCode: 'ERROR', message: 'Có lỗi xảy ra.' }) : envelope(200, { data: overview });
    return undefined;
  });
}

describe('Tổng quan trường', () => {
  it('hiện thẻ số liệu của trường kèm hạn mức giáo viên và lượt AI', async () => {
    signInAs('ORG_ADMIN');
    api(schoolOverviewOf());
    renderApp('/truong');

    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan trường' })).toBeInTheDocument();
    const tiles = await screen.findByRole('region', { name: 'Số liệu của trường' });
    expect(within(tiles).getByText('8 / 10')).toBeInTheDocument();
    expect(within(tiles).getByText('Còn 2 tài khoản giáo viên trong gói Cơ bản')).toBeInTheDocument();
    expect(within(tiles).getByText('1.248')).toBeInTheDocument();
    expect(within(tiles).getByText(/1\.106 em đã đăng nhập ít nhất một lần, 142 em chưa đăng nhập/)).toBeInTheDocument();
    expect(within(tiles).getByText('57')).toBeInTheDocument();
    expect(within(tiles).getByText('12 bài đang mở cho học sinh làm')).toBeInTheDocument();
    expect(within(tiles).getByText('4.310')).toBeInTheDocument();
    expect(within(tiles).getByText('468 / 500')).toBeInTheDocument();
    expect(within(tiles).getByText(/Sắp hết lượt AI; kỳ hiện tại kết thúc ngày 28\/10\/2026/)).toBeInTheDocument();
    expect(within(tiles).getByText('7,3')).toBeInTheDocument();
    expect(within(tiles).getByRole('progressbar', { name: 'Lượt AI đã dùng so với hạn mức trong kỳ' })).toHaveAttribute('value', '94');
  });

  it('chỉ có số tổng: không có tên giáo viên hay học sinh; có tên lớp', async () => {
    signInAs('ORG_ADMIN');
    api(schoolOverviewOf());
    renderApp('/truong');
    await screen.findByRole('list', { name: 'Điểm trung bình theo lớp' });
    expect(document.body.textContent).not.toMatch(/Trần Văn Bình|Lê Thị Hoa/);
    expect(screen.getByText('6A1')).toBeInTheDocument();
  });

  it('điểm trung bình theo lớp: điểm cao trước, lớp chưa có lượt nộp cuối và hiện gạch; lọc theo cấp', async () => {
    signInAs('ORG_ADMIN');
    api(
      schoolOverviewOf({
        classes: [
          overviewClassOf(1, '6A2', 75),
          overviewClassOf(2, '6A1', 82),
          overviewClassOf(3, '8A3', null),
          overviewClassOf(4, '2B', 90, { schoolLevel: 1, schoolLevelName: 'Cấp 1 (Tiểu học)', grade: 2 }),
        ],
        classCount: 4,
        levels: [
          { schoolLevel: 1, schoolLevelName: 'Cấp 1 (Tiểu học)', classCount: 1, activeStudents: 30, finishedAttempts: 40, averagePercent: 90 },
          { schoolLevel: 2, schoolLevelName: 'Cấp 2 (Trung học cơ sở)', classCount: 3, activeStudents: 90, finishedAttempts: 80, averagePercent: 73 },
          { schoolLevel: 3, schoolLevelName: 'Cấp 3 (Trung học phổ thông)', classCount: 0, activeStudents: 0, finishedAttempts: 0, averagePercent: null },
        ],
      }),
    );
    const user = userEvent.setup();
    renderApp('/truong');

    const list = await screen.findByRole('list', { name: 'Điểm trung bình theo lớp' });
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent?.slice(0, 2))).toEqual(['2B', '6A', '6A', '8A']);
    expect(within(list).getByText(/chưa có lượt nộp/)).toBeInTheDocument();

    expect(screen.queryByRole('option', { name: 'Cấp 3 (Trung học phổ thông)' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Lọc theo cấp'), '1');
    expect(within(await screen.findByRole('list', { name: 'Điểm trung bình theo lớp' })).getAllByRole('listitem')).toHaveLength(1);
  });

  it('gói còn không quá 14 ngày: nhắc gia hạn kèm số ngày còn lại', async () => {
    signInAs('ORG_ADMIN');
    api(
      schoolOverviewOf({
        planNotice: { kind: 'EXPIRING_SOON', daysLeft: 9, message: 'Gói Cơ bản còn 9 ngày. Hãy gia hạn để không gián đoạn.' },
      }),
    );
    renderApp('/truong');
    expect((await screen.findAllByText('Gói Cơ bản còn 9 ngày. Hãy gia hạn để không gián đoạn.')).length).toBeGreaterThan(0);
    expect(screen.getByText('9 ngày')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói và hóa đơn' })).toHaveAttribute('href', '/truong/thong-tin');
  });

  it('trường không có gói hiệu lực: trang vẫn xem được, hạn mức báo chưa có', async () => {
    signInAs('ORG_ADMIN');
    api(
      schoolOverviewOf({
        plan: null,
        planNotice: { kind: 'NO_EFFECTIVE_PLAN', daysLeft: null, message: 'Trường chưa có gói hiệu lực.' },
        teachers: { used: 3, max: null, planName: null, canAddTeacher: false },
        ai: { hasEffectivePlan: false, planName: null, used: 0, max: null, remaining: null, periodStart: null, periodEnd: null },
      }),
    );
    renderApp('/truong');
    expect(await screen.findByText('Trường chưa có gói hiệu lực nên chưa có hạn mức giáo viên.')).toBeInTheDocument();
    expect(screen.getByText('Trường chưa có gói hiệu lực nên chưa có hạn mức lượt AI.')).toBeInTheDocument();
    expect(screen.getByText('Trường chưa có gói dịch vụ nào.')).toBeInTheDocument();
    expect(screen.getByText('Trường chưa có gói hiệu lực.')).toBeInTheDocument();
  });

  it('lỗi tải hiện thông báo và nút Thử lại', async () => {
    signInAs('ORG_ADMIN');
    api(schoolOverviewOf(), true);
    renderApp('/truong');
    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('chưa có lượt nộp nào: điểm trung bình toàn trường để trống kèm lời giải thích', async () => {
    signInAs('ORG_ADMIN');
    api(schoolOverviewOf({ attempts: { finished: 0, averagePercent: null }, classes: [], classCount: 0 }));
    renderApp('/truong');
    expect(await screen.findByText('Chưa có lượt nộp nào.')).toBeInTheDocument();
    expect(screen.getByText('Trường chưa có lớp nào.')).toBeInTheDocument();
  });
});
