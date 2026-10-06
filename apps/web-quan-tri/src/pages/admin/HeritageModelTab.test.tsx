import type { HeritageDetail, HeritageModel } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { envelope, heritageDetailOf, heritageModelOf, heritageSummaryOf, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Tab Mô hình 3D của Biên tập di sản và cột, bộ lọc "Mô hình 3D" của Quản lý di sản: khai báo bằng tệp tải lên hoặc đường dẫn trong kho,
// ghi công bắt buộc, giấy phép hạn chế bị chặn, một mô hình đang hiển thị, hiện, ẩn, thay tệp, sửa, gỡ, xem thử.

// Trình xem thật cần WebGL; ở đây thay bằng khung giả để kiểm địa chỉ tệp, ảnh xem trước và chữ truyền vào. Trình xem thật chạy ở smoke test.
vi.mock('@dsvhvn/dung-chung/model3d', async () => {
  const { createElement } = await import('react');
  return {
    ModelViewer: ({ src, poster, labels }: { src: string; poster?: string | null; labels: { viewerAria: string } }) =>
      createElement('div', { 'data-testid': 'trinh-xem', 'data-src': src, 'data-poster': poster ?? '' }, labels.viewerAria),
  };
});

const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

interface State {
  detail?: HeritageDetail;
  models: HeritageModel[];
}

function api(state: State, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/provinces') return envelope(200, { data: [] });
      if (call.path === '/admin/heritages/1' && call.method === 'GET') return envelope(200, { data: state.detail ?? heritageDetailOf({ status: 'PUBLISHED' }) });
      if (call.path === '/admin/heritages/1/models' && call.method === 'GET') return envelope(200, { data: state.models });
      if (call.path.startsWith('/admin/heritages?')) return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      return undefined;
    },
  );
}

/** Tệp .glb tối thiểu: 12 byte đầu đúng chuẩn (dấu glTF, phiên bản 2, độ dài khớp). */
function glb(name = 'ngo-mon.glb', size = 2048) {
  const bytes = new Uint8Array(size);
  for (const [i, c] of [...'glTF'].entries()) bytes[i] = c.charCodeAt(0);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, 2, true);
  view.setUint32(8, size, true);
  return new File([bytes], name, { type: 'model/gltf-binary' });
}

const PATH = '/quan-tri/di-san/1?tab=mo-hinh-3d';

async function fillCredit(user: UserEvent, dialog: HTMLElement, { license = 'CC BY 4.0', source = 'https://sketchfab.com/3d-models/ngo-mon' } = {}) {
  await user.type(within(dialog).getByLabelText('Tác giả'), 'Nguyễn Văn An');
  await user.type(within(dialog).getByLabelText('Giấy phép'), license);
  if (source) await user.type(within(dialog).getByLabelText('Đường dẫn nguồn'), source);
}

describe('Biên tập di sản — tab Mô hình 3D', () => {
  it('có tab thứ sáu; chưa có mô hình thì báo trạng thái rỗng và nhắc di sản chưa xuất bản', async () => {
    signInAs('ADMIN');
    api({ models: [], detail: heritageDetailOf({ status: 'DRAFT' }) });
    renderApp(PATH);

    expect(await screen.findByRole('tab', { name: 'Mô hình 3D', selected: true })).toBeInTheDocument();
    expect(await screen.findByText('Di sản chưa có mô hình 3D.')).toBeInTheDocument();
    expect(screen.getByText(/Di sản chưa xuất bản \(hoặc đang ẩn\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải mô hình lên' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dùng tệp đã lưu' })).toBeInTheDocument();
  });

  it('di sản mới chưa lưu thì tab báo lưu thông tin chung trước', async () => {
    signInAs('ADMIN');
    api({ models: [] });
    renderApp('/quan-tri/di-san/moi?tab=mo-hinh-3d');
    expect(await screen.findByText('Lưu thông tin chung trước.')).toBeInTheDocument();
  });

  it('liệt kê mô hình: tên, trạng thái, ghi công do hệ thống ghép, dung lượng, liên kết giấy phép và nguồn, khách đang thấy', async () => {
    signInAs('ADMIN');
    api({
      models: [
        heritageModelOf(1, { status: 'PUBLISHED', statusLabel: 'Đang hiển thị', isVisibleToPublic: true }),
        heritageModelOf(2, { title: null, status: 'ARCHIVED', statusLabel: 'Đã ẩn', license: 'Mô hình nhóm tự dựng', licenseUrl: null, sourceUrl: null, credit: 'Nhóm · Mô hình nhóm tự dựng · Nhóm thực hiện' }),
      ],
    });
    renderApp(PATH);

    const first = (await screen.findByText('Cổng Ngọ Môn')).closest('li')!;
    expect(within(first).getByText('Đang hiển thị')).toBeInTheDocument();
    expect(within(first).getByText('Khách đang thấy')).toBeInTheDocument();
    expect(within(first).getByText('Nguyễn Văn An · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon')).toBeInTheDocument();
    expect(within(first).getByText(/GLB · 4,2 MB/)).toBeInTheDocument();
    expect(within(first).getByRole('link', { name: /Xem giấy phép/ })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    expect(within(first).getByRole('link', { name: /Xem nguồn/ })).toHaveAttribute('href', 'https://sketchfab.com/3d-models/ngo-mon');
    const second = screen.getByText('Mô hình chưa đặt tên').closest('li')!;
    expect(within(second).getByText('Đã ẩn')).toBeInTheDocument();
    expect(within(second).getByText('Nhóm · Mô hình nhóm tự dựng · Nhóm thực hiện')).toBeInTheDocument();
    expect(within(second).queryByRole('link', { name: /Xem nguồn/ })).not.toBeInTheDocument();
  });

  it('mô hình đang hiển thị nhưng di sản chưa xuất bản: khách chưa thấy và có giải thích', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ status: 'ARCHIVED' }), models: [heritageModelOf(1, { status: 'PUBLISHED', statusLabel: 'Đang hiển thị', isVisibleToPublic: false })] });
    renderApp(PATH);

    const row = (await screen.findByText('Cổng Ngọ Môn')).closest('li')!;
    expect(within(row).queryByText('Khách đang thấy')).not.toBeInTheDocument();
    expect(within(row).getByText('Khách chưa thấy mô hình này vì di sản chưa xuất bản hoặc đang ẩn.')).toBeInTheDocument();
  });

  it('"Xem thử" mở trình xem dùng chung ngay trong tab với địa chỉ tệp ghép với máy chủ API, bấm lại thì đóng', async () => {
    signInAs('ADMIN');
    api({ models: [heritageModelOf(1, { fileUrl: `/files/models/${KEY}.glb`, posterUrl: '/files/images/poster.jpg' })] });
    const user = userEvent.setup();
    renderApp(PATH);

    await user.click(await screen.findByRole('button', { name: 'Xem thử' }));
    const viewer = await screen.findByTestId('trinh-xem');
    expect(viewer).toHaveAttribute('data-src', `http://api.test/files/models/${KEY}.glb`);
    expect(viewer).toHaveAttribute('data-poster', 'http://api.test/files/images/poster.jpg');
    expect(viewer).toHaveTextContent('Mô hình 3D Cổng Ngọ Môn');

    await user.click(screen.getByRole('button', { name: 'Đóng xem thử' }));
    expect(screen.queryByTestId('trinh-xem')).not.toBeInTheDocument();
  });

  describe('tải tệp lên', () => {
    async function openUpload(user: UserEvent) {
      await user.click(await screen.findByRole('button', { name: 'Tải mô hình lên' }));
      return screen.findByRole('dialog', { name: 'Thêm mô hình 3D' });
    }

    it('thiếu tệp và ghi công thì báo bằng câu của backend, chưa gửi gì', async () => {
      signInAs('ADMIN');
      const calls = api({ models: [] });
      const user = userEvent.setup();
      renderApp(PATH);

      const dialog = await openUpload(user);
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));

      expect(await within(dialog).findByText('Vui lòng nhập tệp mô hình (.glb).')).toBeInTheDocument();
      expect(within(dialog).getByText('Vui lòng nhập tác giả.')).toBeInTheDocument();
      expect(within(dialog).getByText('Vui lòng nhập giấy phép.')).toBeInTheDocument();
      expect(calls.some((c) => c.path.endsWith('/models/upload'))).toBe(false);
    });

    it('tệp sai đuôi, quá 15 MB hoặc không phải glTF 2.0 bị từ chối ngay khi chọn', async () => {
      signInAs('ADMIN');
      const calls = api({ models: [] });
      const user = userEvent.setup({ applyAccept: false });
      renderApp(PATH);

      const dialog = await openUpload(user);
      const input = within(dialog).getByLabelText('Tệp mô hình 3D');
      await user.upload(input, new File(['{}'], 'ngo-mon.gltf', { type: 'model/gltf+json' }));
      expect(await within(dialog).findByText('Tệp mô hình không hợp lệ: chỉ nhận tệp .glb (glTF 2.0 đóng gói một tệp).')).toBeInTheDocument();

      await user.upload(input, new File([new Uint8Array(16 * 1024 * 1024)], 'to.glb', { type: 'model/gltf-binary' }));
      expect(await within(dialog).findByText('Tệp mô hình không hợp lệ: tối đa 15 MB, tệp này 16,0 MB.')).toBeInTheDocument();

      await user.upload(input, new File(['đây là ảnh đổi đuôi, không phải mô hình 3D'], 'gia.glb', { type: 'model/gltf-binary' }));
      expect(await within(dialog).findByText(/không phải tệp \.glb/)).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));
      expect(calls.some((c) => c.path.endsWith('/models/upload'))).toBe(false);
    });

    it('giấy phép hạn chế (CC BY-NC) bị chặn và thiếu nguồn chỉ được bỏ trống với mô hình nhóm tự dựng', async () => {
      signInAs('ADMIN');
      const calls = api({ models: [] });
      const user = userEvent.setup();
      renderApp(PATH);

      const dialog = await openUpload(user);
      await user.upload(within(dialog).getByLabelText('Tệp mô hình 3D'), glb());
      await fillCredit(user, dialog, { license: 'CC BY-NC 4.0' });
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));
      expect(await within(dialog).findByText(/không nhận CC BY-NC, CC BY-ND/)).toBeInTheDocument();

      await user.clear(within(dialog).getByLabelText('Giấy phép'));
      await user.type(within(dialog).getByLabelText('Giấy phép'), 'CC BY 4.0');
      await user.clear(within(dialog).getByLabelText('Đường dẫn nguồn'));
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));
      expect(await within(dialog).findByText(/chỉ mô hình nhóm tự dựng được bỏ trống/)).toBeInTheDocument();
      expect(calls.some((c) => c.path.endsWith('/models/upload'))).toBe(false);
    });

    it('tải một mô hình và hiện ngay: gửi multipart đủ tệp và ghi công, không gửi dung lượng, rồi đóng và làm mới danh sách', async () => {
      signInAs('ADMIN');
      const state: State = { models: [] };
      const calls = api(state, (call) => {
        if (call.path === '/admin/heritages/1/models/upload' && call.method === 'POST') {
          state.models = [heritageModelOf(7, { status: 'PUBLISHED', statusLabel: 'Đang hiển thị', isVisibleToPublic: true, title: 'Ngọ Môn bản mới' })];
          return envelope(201, { data: state.models[0], message: 'Tải mô hình 3D lên thành công.' });
        }
        return undefined;
      });
      const user = userEvent.setup();
      renderApp(PATH);

      const dialog = await openUpload(user);
      await user.upload(within(dialog).getByLabelText('Tệp mô hình 3D'), glb());
      expect(await within(dialog).findByText('ngo-mon.glb')).toBeInTheDocument();
      expect(within(dialog).getByText('2 KB')).toBeInTheDocument();
      await user.type(within(dialog).getByLabelText('Tên mô hình'), 'Ngọ Môn bản mới');
      await fillCredit(user, dialog);
      expect(within(dialog).getByText('Nguyễn Văn An · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon')).toBeInTheDocument();
      await user.click(within(dialog).getByLabelText('Hiện cho khách và học sinh ngay'));
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));

      expect(await screen.findByText('Tải mô hình 3D lên thành công.')).toBeInTheDocument();
      const sent = calls.find((c) => c.path.endsWith('/models/upload'))!.body as Record<string, unknown>;
      expect(sent).toEqual({
        file: { fileName: 'ngo-mon.glb', size: 2048 },
        title: 'Ngọ Môn bản mới',
        author: 'Nguyễn Văn An',
        license: 'CC BY 4.0',
        sourceUrl: 'https://sketchfab.com/3d-models/ngo-mon',
        show: 'true',
      });
      expect(sent).not.toHaveProperty('fileSizeBytes');
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thêm mô hình 3D' })).not.toBeInTheDocument());
      const row = (await screen.findByText('Ngọ Môn bản mới')).closest('li')!;
      expect(within(row).getByText('Khách đang thấy')).toBeInTheDocument();
    });

    it('mô hình nhóm tự dựng không cần nguồn; lỗi theo trường của backend hiện dưới ô và giữ hộp thoại', async () => {
      signInAs('ADMIN');
      api({ models: [] }, (call) =>
        call.path.endsWith('/models/upload')
          ? envelope(400, { errorCode: 'INVALID', message: 'Tệp mô hình không hợp lệ: không đọc được.', errors: { file: 'Tệp mô hình không hợp lệ: không đọc được.' } })
          : undefined,
      );
      const user = userEvent.setup();
      renderApp(PATH);

      const dialog = await openUpload(user);
      await user.upload(within(dialog).getByLabelText('Tệp mô hình 3D'), glb());
      await fillCredit(user, dialog, { license: 'Mô hình nhóm tự dựng', source: '' });
      expect(within(dialog).getByText('Nguyễn Văn An · Mô hình nhóm tự dựng · Nhóm thực hiện')).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));

      expect(await within(dialog).findByText('Tệp mô hình không hợp lệ: không đọc được.')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Thêm mô hình 3D' })).toBeInTheDocument();
    });

    it('di sản đã có mô hình đang hiển thị thì không bật được "hiện ngay"', async () => {
      signInAs('ADMIN');
      api({ models: [heritageModelOf(1, { status: 'PUBLISHED', statusLabel: 'Đang hiển thị', isVisibleToPublic: true })] });
      const user = userEvent.setup();
      renderApp(PATH);

      await screen.findByText('Cổng Ngọ Môn');
      const dialog = await openUpload(user);
      expect(within(dialog).getByLabelText('Hiện cho khách và học sinh ngay')).toBeDisabled();
      expect(within(dialog).getByText('Di sản đã có một mô hình đang hiển thị. Hãy ẩn mô hình đó trước.')).toBeInTheDocument();
    });
  });

  describe('dùng tệp đã lưu trong kho', () => {
    it('đường dẫn ngoài kho bị chặn; đường dẫn đúng gửi JSON không kèm dung lượng, lưu nháp mặc định', async () => {
      signInAs('ADMIN');
      const calls = api({ models: [] }, (call) =>
        call.path === '/admin/heritages/1/models' && call.method === 'POST'
          ? envelope(201, { data: heritageModelOf(3), message: 'Thêm mô hình 3D thành công.' })
          : undefined,
      );
      const user = userEvent.setup();
      renderApp(PATH);

      await user.click(await screen.findByRole('button', { name: 'Dùng tệp đã lưu' }));
      const dialog = await screen.findByRole('dialog', { name: 'Thêm mô hình 3D' });
      expect(within(dialog).queryByLabelText('Tệp mô hình 3D')).not.toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Thêm' }));
      expect(await within(dialog).findByText('Vui lòng nhập đường dẫn tệp mô hình (.glb đã tải lên kho tệp).')).toBeInTheDocument();

      await user.type(within(dialog).getByLabelText('Đường dẫn tệp mô hình'), 'https://sketchfab.com/models/ngo-mon.glb');
      await fillCredit(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Thêm' }));
      expect(await within(dialog).findByText(/không dùng đường dẫn tới trang ngoài/)).toBeInTheDocument();
      expect(calls.some((c) => c.method === 'POST' && c.path === '/admin/heritages/1/models')).toBe(false);

      await user.clear(within(dialog).getByLabelText('Đường dẫn tệp mô hình'));
      await user.type(within(dialog).getByLabelText('Đường dẫn tệp mô hình'), `/files/models/${KEY}.glb`);
      await user.click(within(dialog).getByRole('button', { name: 'Thêm' }));

      expect(await screen.findByText('Thêm mô hình 3D thành công.')).toBeInTheDocument();
      expect(calls.find((c) => c.method === 'POST' && c.path === '/admin/heritages/1/models')?.body).toEqual({
        title: null,
        posterUrl: null,
        author: 'Nguyễn Văn An',
        license: 'CC BY 4.0',
        licenseUrl: null,
        sourceUrl: 'https://sketchfab.com/3d-models/ngo-mon',
        sortOrder: null,
        fileUrl: `/files/models/${KEY}.glb`,
        show: false,
      });
    });
  });

  describe('hiện, ẩn, thay tệp, sửa, gỡ', () => {
    it('hiện mô hình nháp; ẩn mô hình đang hiển thị; nút Hiện bị khóa khi di sản đã có mô hình khác đang hiển thị', async () => {
      signInAs('ADMIN');
      const state: State = {
        models: [heritageModelOf(1, { status: 'PUBLISHED', statusLabel: 'Đang hiển thị', isVisibleToPublic: true }), heritageModelOf(2, { title: 'Bản nháp' })],
      };
      const calls = api(state, (call) => {
        if (call.path === '/admin/models/1/hide' && call.method === 'POST') {
          state.models = [heritageModelOf(1, { status: 'ARCHIVED', statusLabel: 'Đã ẩn' }), state.models[1]!];
          return envelope(200, { data: state.models[0], message: 'Ẩn mô hình 3D thành công.' });
        }
        if (call.path === '/admin/models/2/show' && call.method === 'POST') {
          state.models = [state.models[0]!, heritageModelOf(2, { title: 'Bản nháp', status: 'PUBLISHED', statusLabel: 'Đang hiển thị', isVisibleToPublic: true })];
          return envelope(200, { data: state.models[1], message: 'Hiện mô hình 3D thành công.' });
        }
        return undefined;
      });
      const user = userEvent.setup();
      renderApp(PATH);

      const draft = (await screen.findByText('Bản nháp')).closest('li')!;
      expect(within(draft).getByRole('button', { name: 'Hiện' })).toBeDisabled();
      const visible = screen.getByText('Cổng Ngọ Môn').closest('li')!;
      await user.click(within(visible).getByRole('button', { name: 'Ẩn' }));
      expect(await screen.findByText('Ẩn mô hình 3D thành công.')).toBeInTheDocument();
      expect(calls.some((c) => c.path === '/admin/models/1/hide')).toBe(true);

      await waitFor(() => expect(within(screen.getByText('Bản nháp').closest('li')!).getByRole('button', { name: 'Hiện' })).toBeEnabled());
      await user.click(within(screen.getByText('Bản nháp').closest('li')!).getByRole('button', { name: 'Hiện' }));
      expect(await screen.findByText('Hiện mô hình 3D thành công.')).toBeInTheDocument();
      await waitFor(() => expect(within(screen.getByText('Bản nháp').closest('li')!).getByText('Khách đang thấy')).toBeInTheDocument());
    });

    it('hai quản trị cùng hiện: người đến sau nhận 422 và câu của máy chủ hiện trong thông báo', async () => {
      signInAs('ADMIN');
      const message = 'Không thể hiện mô hình 3D. Di sản đã có một mô hình đang hiển thị, hãy ẩn mô hình đó trước.';
      api({ models: [heritageModelOf(2, { title: 'Bản nháp' })] }, (call) =>
        call.path === '/admin/models/2/show' ? envelope(422, { errorCode: 'BLOCKED', message }) : undefined,
      );
      const user = userEvent.setup();
      renderApp(PATH);

      await user.click(await screen.findByRole('button', { name: 'Hiện' }));
      expect(await screen.findByText(message)).toBeInTheDocument();
    });

    it('sửa thông tin: nạp sẵn ghi công, để trống đường dẫn tệp thì giữ tệp (fileUrl null), không có ô hiện ngay', async () => {
      signInAs('ADMIN');
      const calls = api({ models: [heritageModelOf(1)] }, (call) =>
        call.path === '/admin/models/1' && call.method === 'PUT' ? envelope(200, { data: heritageModelOf(1), message: 'Lưu mô hình 3D thành công.' }) : undefined,
      );
      const user = userEvent.setup();
      renderApp(PATH);

      await user.click(await screen.findByRole('button', { name: 'Sửa Cổng Ngọ Môn' }));
      const dialog = await screen.findByRole('dialog', { name: 'Sửa mô hình 3D' });
      expect(within(dialog).getByLabelText('Tác giả')).toHaveValue('Nguyễn Văn An');
      expect(within(dialog).getByLabelText('Giấy phép')).toHaveValue('CC BY 4.0');
      expect(within(dialog).queryByLabelText('Hiện cho khách và học sinh ngay')).not.toBeInTheDocument();
      expect(within(dialog).queryByLabelText('Tệp mô hình 3D')).not.toBeInTheDocument();
      await user.clear(within(dialog).getByLabelText('Tác giả'));
      await user.type(within(dialog).getByLabelText('Tác giả'), 'Trần Thị Bình');
      await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));

      expect(await screen.findByText('Lưu mô hình 3D thành công.')).toBeInTheDocument();
      expect(calls.find((c) => c.path === '/admin/models/1' && c.method === 'PUT')?.body).toEqual({
        title: 'Cổng Ngọ Môn',
        posterUrl: null,
        author: 'Trần Thị Bình',
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourceUrl: 'https://sketchfab.com/3d-models/ngo-mon',
        sortOrder: null,
        fileUrl: null,
      });
    });

    it('thay tệp bằng tải lên: chỉ gửi tệp, kiểm đầu tệp trước khi gửi', async () => {
      signInAs('ADMIN');
      const calls = api({ models: [heritageModelOf(1)] }, (call) =>
        call.path === '/admin/models/1/file' && call.method === 'PUT' ? envelope(200, { data: heritageModelOf(1), message: 'Thay tệp mô hình 3D thành công.' }) : undefined,
      );
      const user = userEvent.setup({ applyAccept: false });
      renderApp(PATH);

      await user.click(await screen.findByRole('button', { name: 'Thay tệp' }));
      const dialog = await screen.findByRole('dialog', { name: 'Thay tệp mô hình' });
      await user.click(within(dialog).getByRole('button', { name: 'Thay tệp' }));
      expect(await within(dialog).findByText('Vui lòng nhập tệp mô hình (.glb).')).toBeInTheDocument();

      await user.upload(within(dialog).getByLabelText('Tệp mô hình mới'), new File(['không phải glb'], 'sai.glb', { type: 'model/gltf-binary' }));
      expect(await within(dialog).findByText(/không phải tệp \.glb/)).toBeInTheDocument();
      expect(calls.some((c) => c.path === '/admin/models/1/file')).toBe(false);

      await user.upload(within(dialog).getByLabelText('Tệp mô hình mới'), glb('moi.glb', 4096));
      await waitFor(() => expect(within(dialog).queryByText(/không phải tệp \.glb/)).not.toBeInTheDocument());
      await user.click(within(dialog).getByRole('button', { name: 'Thay tệp' }));

      expect(await screen.findByText('Thay tệp mô hình 3D thành công.')).toBeInTheDocument();
      expect(calls.find((c) => c.path === '/admin/models/1/file')?.body).toEqual({ file: { fileName: 'moi.glb', size: 4096 } });
    });

    it('gỡ mô hình: hộp xác nhận nói tệp được giữ trong kho, xác nhận thì gọi xóa mềm', async () => {
      signInAs('ADMIN');
      const state: State = { models: [heritageModelOf(1)] };
      const calls = api(state, (call) => {
        if (call.path === '/admin/models/1' && call.method === 'DELETE') {
          state.models = [];
          return envelope(200, { message: 'Gỡ mô hình 3D thành công.' });
        }
        return undefined;
      });
      const user = userEvent.setup();
      renderApp(PATH);

      await user.click(await screen.findByRole('button', { name: 'Gỡ Cổng Ngọ Môn' }));
      const dialog = await screen.findByRole('dialog', { name: 'Gỡ mô hình 3D' });
      expect(within(dialog).getByText('Bạn có chắc muốn gỡ mô hình 3D "Cổng Ngọ Môn"?')).toBeInTheDocument();
      expect(within(dialog).getByText(/Tệp vẫn được giữ trong kho tệp/)).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Gỡ mô hình' }));

      expect(await screen.findByText('Gỡ mô hình 3D thành công.')).toBeInTheDocument();
      expect(calls.some((c) => c.path === '/admin/models/1' && c.method === 'DELETE')).toBe(true);
      expect(await screen.findByText('Di sản chưa có mô hình 3D.')).toBeInTheDocument();
    });
  });
});

describe('Quản lý di sản — cột và bộ lọc Mô hình 3D', () => {
  function listApi(items: unknown[]) {
    return mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/provinces') return envelope(200, { data: [] });
      if (call.path.startsWith('/admin/heritages?')) return envelope(200, { data: { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 } });
      return undefined;
    });
  }

  it('cột Mô hình 3D chỉ đánh dấu di sản có mô hình đang hiển thị', async () => {
    signInAs('ADMIN');
    listApi([heritageSummaryOf(1, { name: 'Ngọ Môn', hasModel: true }), heritageSummaryOf(2, { name: 'Văn Miếu', hasModel: false })]);
    renderApp('/quan-tri/di-san');

    const table = await screen.findByRole('table', { name: 'Danh sách di sản' });
    expect(within(table).getByRole('columnheader', { name: 'Mô hình 3D' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]!).getByText('Có 3D')).toBeInTheDocument();
    expect(within(rows[2]!).queryByText('Có 3D')).not.toBeInTheDocument();
  });

  it('lọc có hoặc chưa có mô hình 3D gửi hasModel lên máy chủ và ghi lên URL; "Bỏ bộ lọc" xóa', async () => {
    signInAs('ADMIN');
    const calls = listApi([heritageSummaryOf(1, { hasModel: true })]);
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/di-san');
    await screen.findByRole('table', { name: 'Danh sách di sản' });

    await user.selectOptions(screen.getByLabelText('Mô hình 3D'), 'Có mô hình 3D');
    await waitFor(() => expect(router.state.location.search).toContain('mo-hinh-3d=co'));
    const last = () => new URLSearchParams([...calls].reverse().find((c) => c.path.startsWith('/admin/heritages?'))!.path.split('?')[1]);
    await waitFor(() => expect(last().get('hasModel')).toBe('true'));

    await user.selectOptions(screen.getByLabelText('Mô hình 3D'), 'Chưa có mô hình 3D');
    await waitFor(() => expect(last().get('hasModel')).toBe('false'));
    expect(router.state.location.search).toContain('mo-hinh-3d=chua-co');

    await user.selectOptions(screen.getByLabelText('Mô hình 3D'), 'Tất cả (có hoặc chưa có 3D)');
    // Về "Tất cả" dùng lại danh sách đã đọc lúc đầu (không có hasModel) nên chỉ cần URL sạch và ô lọc về mặc định.
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(screen.getByLabelText('Mô hình 3D')).toHaveValue('');
  });
});
