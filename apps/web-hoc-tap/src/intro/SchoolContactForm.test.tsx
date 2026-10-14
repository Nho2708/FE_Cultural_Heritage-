import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi } from '../test/fixtures';
import { renderApp } from '../test/renderApp';

// Biểu mẫu liên hệ của trường ở trang Dành cho nhà trường: kiểm hợp lệ phía giao diện, gửi thành công, lỗi theo trường và lỗi chung của máy chủ,
// gửi quá nhiều lần, ô bẫy ẩn.

const SENT = 'Đã gửi. Nhóm sẽ liên hệ lại qua email.';
const SUBMIT = '/public/school-inquiries';

async function openForm() {
  renderApp('/nha-truong');
  const region = await screen.findByRole('region', { name: 'Liên hệ để được tạo tài khoản cho trường' });
  return { region, user: userEvent.setup() };
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Tên trường *'), 'Trường THCS Nguyễn Du');
  await user.type(screen.getByLabelText('Họ tên người liên hệ *'), 'Trần Thị Hạnh');
  await user.type(screen.getByLabelText('Email *'), 'hanh@nguyendu.edu.vn');
  await user.type(screen.getByLabelText('Nội dung *'), 'Trường em muốn được tạo tài khoản.');
}

describe('biểu mẫu liên hệ của trường', () => {
  it('có đủ ô với nhãn rõ ràng, ghi chú gói Miễn phí và ô bẫy ẩn khỏi trình đọc màn hình', async () => {
    mockApi();
    const { region } = await openForm();

    for (const label of ['Tên trường *', 'Tỉnh/thành', 'Họ tên người liên hệ *', 'Chức vụ', 'Email *', 'Số điện thoại', 'Nội dung *']) {
      expect(within(region).getByLabelText(label)).toBeInTheDocument();
    }
    expect(within(region).getByText(/Trường mới nhận gói Miễn phí/)).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Gửi liên hệ' })).toBeEnabled();
    const trap = region.querySelector('input[name="website"]');
    expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(trap).toHaveAttribute('tabindex', '-1');
  });

  it('thiếu trường bắt buộc hoặc sai định dạng thì báo dưới ô nhập, chuyển focus tới ô lỗi đầu tiên và không gọi máy chủ', async () => {
    const calls = mockApi();
    const { user } = await openForm();

    await user.type(screen.getByLabelText('Email *'), 'khong-phai-email');
    await user.click(screen.getByRole('button', { name: 'Gửi liên hệ' }));

    expect(await screen.findByText('Vui lòng nhập tên trường.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập họ tên người liên hệ.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập nội dung.')).toBeInTheDocument();
    expect(screen.getByText(/^Email không hợp lệ/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tên trường *')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByLabelText('Tên trường *')).toHaveFocus());
    expect(calls.filter((c) => c.path === SUBMIT)).toHaveLength(0);
  });

  it('gửi thành công: gọi API công khai không token, hiện câu xác nhận, nhận focus và cho gửi liên hệ khác', async () => {
    const calls = mockApi((call) => (call.path === SUBMIT ? envelope(202, { message: SENT }) : undefined));
    const { user } = await openForm();

    await fillRequired(user);
    await user.type(screen.getByLabelText('Số điện thoại'), '0912 345 678');
    await user.click(screen.getByRole('button', { name: 'Gửi liên hệ' }));

    const status = await screen.findByRole('status');
    expect(within(status).getByText(SENT)).toBeInTheDocument();
    await waitFor(() => expect(status).toHaveFocus());
    const sent = calls.filter((c) => c.path === SUBMIT);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: 'POST', authorization: undefined });
    expect(sent[0]!.body).toEqual({
      schoolName: 'Trường THCS Nguyễn Du',
      province: null,
      contactName: 'Trần Thị Hạnh',
      position: null,
      email: 'hanh@nguyendu.edu.vn',
      phone: '0912 345 678',
      message: 'Trường em muốn được tạo tài khoản.',
      website: '',
    });
    expect(screen.queryByLabelText('Tên trường *')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gửi thêm một liên hệ khác' }));
    expect(screen.getByLabelText('Tên trường *')).toHaveValue('');
  });

  it('máy chủ báo lỗi theo trường thì hiện dưới đúng ô và giữ nguyên nội dung đã nhập', async () => {
    mockApi((call) =>
      call.path === SUBMIT
        ? envelope(400, { errorCode: 'INVALID', message: 'Email không hợp lệ.', errors: { email: 'Email không hợp lệ: máy chủ từ chối.' } })
        : undefined,
    );
    const { user } = await openForm();

    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Gửi liên hệ' }));

    expect(await screen.findByText('Email không hợp lệ: máy chủ từ chối.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email *')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Tên trường *')).toHaveValue('Trường THCS Nguyễn Du');
    await waitFor(() => expect(screen.getByLabelText('Email *')).toHaveFocus());
  });

  it('máy chủ chưa gửi được thư (503) thì hiện câu của máy chủ trong vùng báo lỗi và vẫn gửi lại được', async () => {
    mockApi((call) =>
      call.path === SUBMIT ? envelope(503, { errorCode: 'SCHOOL_INQUIRY_UNAVAILABLE', message: 'Chưa gửi được, vui lòng thử lại sau.' }) : undefined,
    );
    const { user } = await openForm();

    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Gửi liên hệ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa gửi được, vui lòng thử lại sau.');
    expect(screen.getByRole('button', { name: 'Gửi liên hệ' })).toBeEnabled();
    expect(screen.getByLabelText('Nội dung *')).toHaveValue('Trường em muốn được tạo tài khoản.');
  });

  it('gửi quá nhiều lần (429) thì báo gửi quá nhiều lần kèm thời gian chờ', async () => {
    mockApi((call) =>
      call.path === SUBMIT
        ? new Response(JSON.stringify({ success: false, data: null, message: 'Có quá nhiều yêu cầu.', errorCode: 'TOO_MANY_REQUESTS', traceId: 't' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '540' },
          })
        : undefined,
    );
    const { user } = await openForm();

    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Gửi liên hệ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau 9 phút.');
  });

  it('chương trình tự động điền ô bẫy thì giá trị đó vẫn được gửi đi để máy chủ bỏ qua', async () => {
    const calls = mockApi((call) => (call.path === SUBMIT ? envelope(202, { message: SENT }) : undefined));
    const { region, user } = await openForm();

    await fillRequired(user);
    const trap = region.querySelector<HTMLInputElement>('input[name="website"]')!;
    await user.type(trap, 'http://thu-rac.example');
    await user.click(screen.getByRole('button', { name: 'Gửi liên hệ' }));

    await waitFor(() => expect(calls.some((c) => c.path === SUBMIT)).toBe(true));
    expect((calls.find((c) => c.path === SUBMIT)!.body as { website: string }).website).toBe('http://thu-rac.example');
  });
});
