import { MESSAGES } from '@dsvhvn/dung-chung';
import type { HeritageDetail } from '@dsvhvn/dung-chung/api';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  envelope,
  heritageDetailOf,
  heritageEventOf,
  heritageMediaOf,
  heritageReferenceOf,
  heritageTimelineOf,
  mockApi,
  userOf,
  type FetchCall,
} from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Biên tập di sản: tạo mới, lưu nháp, xuất bản – ẩn – hiện lại, điều kiện xuất bản còn thiếu, rời trang khi chưa lưu và
// bốn tab (Thông tin chung, Ảnh và media, Dòng thời gian, Nguồn tham chiếu) cùng Biểu mẫu giai đoạn và sự kiện.

const PROVINCES = [
  { id: 1, code: '46', name: 'Thành phố Huế', region: 'Trung' },
  { id: 2, code: '48', name: 'Thành phố Đà Nẵng', region: 'Trung' },
];

/** API giả: `state.detail` là di sản hiện tại (GET trả về nó); `extra` chạy trước để test ghi đè từng endpoint. */
function api(state: { detail: HeritageDetail }, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/provinces') return envelope(200, { data: PROVINCES });
      if (call.path === `/admin/heritages/${state.detail.id}` && call.method === 'GET') return envelope(200, { data: state.detail });
      if (call.path.startsWith('/admin/heritages?'))
        return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
      return undefined;
    },
  );
}

const fields = () => screen.getByRole('form', { name: 'Thông tin chung' });

describe('Biên tập di sản — tạo mới', () => {
  it('chỉ có tên là bắt buộc: để trống thì báo dưới ô Tên và không gọi API', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf() });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/moi');

    expect(await screen.findByRole('heading', { level: 1, name: 'Tạo di sản' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    expect(await screen.findByText('Vui lòng nhập tên di sản.')).toBeInTheDocument();
    expect(within(fields()).getByLabelText('Tên')).toHaveAttribute('aria-invalid', 'true');
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('đường dẫn tự sinh từ tên; lưu nháp gửi đúng thân yêu cầu rồi chuyển sang trang sửa', async () => {
    signInAs('ADMIN');
    const created = heritageDetailOf({ id: 7, name: 'Đền Hùng', slug: 'den-hung', shortDescription: null, content: null, heritageType: null, recognitionLevel: null, recognizedYear: null, province: null, address: null, latitude: null, longitude: null });
    const calls = api({ detail: created }, (call) => {
      if (call.path === '/admin/heritages/suggest-slug?name=%C4%90%E1%BB%81n+H%C3%B9ng')
        return envelope(200, { data: 'den-hung' });
      if (call.path === '/admin/heritages' && call.method === 'POST')
        return envelope(201, { data: created, message: 'Tạo di sản thành công.' });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/di-san/moi');

    await user.type(await screen.findByLabelText('Tên'), 'Đền Hùng');
    expect(screen.getByLabelText('Đường dẫn')).toHaveValue('den-hung');
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/quan-tri/di-san/7'));
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      name: 'Đền Hùng',
      slug: 'den-hung',
      shortDescription: null,
      content: null,
      heritageType: null,
      recognitionLevel: null,
      recognizedYear: null,
      provinceId: null,
      address: null,
      latitude: null,
      longitude: null,
      placeId: null,
    });
    expect(await screen.findByText('Tạo di sản thành công.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Đền Hùng' })).toBeInTheDocument();
  });

  it('trùng đường dẫn: lỗi của máy chủ hiện dưới ô Đường dẫn', async () => {
    signInAs('ADMIN');
    const duplicate = 'Đường dẫn không hợp lệ: đã có di sản khác dùng đường dẫn này.';
    api({ detail: heritageDetailOf() }, (call) =>
      call.path === '/admin/heritages' && call.method === 'POST'
        ? envelope(409, { errorCode: 'DUPLICATE', message: duplicate, errors: { slug: duplicate } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/moi');

    await user.type(await screen.findByLabelText('Tên'), 'Đền Hùng');
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    expect(await screen.findByText(duplicate)).toBeInTheDocument();
    expect(screen.getByLabelText('Đường dẫn')).toHaveAttribute('aria-invalid', 'true');
  });

  it('kiểm dữ liệu ở máy khách khớp máy chủ: tọa độ ngoài Việt Nam, năm công nhận ở tương lai', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf() });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/moi');

    await user.type(await screen.findByLabelText('Tên'), 'Đền Hùng');
    await user.type(screen.getByLabelText('Vĩ độ'), '40');
    await user.type(screen.getByLabelText('Kinh độ'), '107');
    await user.type(screen.getByLabelText('Năm công nhận'), '2999');
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    expect(await screen.findByText('Vĩ độ không hợp lệ: phải từ 8,0 đến 23,5.')).toBeInTheDocument();
    expect(screen.getByText('Năm công nhận không hợp lệ: phải là năm dương lịch không lớn hơn năm hiện tại.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('các tab khác nhắc lưu thông tin chung trước', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf() });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/moi');

    await user.click(await screen.findByRole('tab', { name: 'Dòng thời gian' }));
    expect(await screen.findByText('Lưu thông tin chung trước.')).toBeInTheDocument();
  });

  it('có thay đổi chưa lưu mà rời trang: hỏi lại, "Ở lại" giữ nguyên nội dung đã nhập', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf() });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/di-san/moi');

    await user.type(await screen.findByLabelText('Tên'), 'Đền Hùng');
    await user.click(screen.getByRole('link', { name: '← Danh sách di sản' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rời khỏi trang' });
    await user.click(within(dialog).getByRole('button', { name: 'Ở lại' }));
    expect(router.state.location.pathname).toBe('/quan-tri/di-san/moi');
    expect(screen.getByLabelText('Tên')).toHaveValue('Đền Hùng');

    await user.click(screen.getByRole('link', { name: '← Danh sách di sản' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Rời khỏi trang' })).getByRole('button', { name: 'Rời khỏi trang' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/quan-tri/di-san'));
  });
});

describe('Biên tập di sản — sửa, xuất bản, ẩn', () => {
  it('hiện thông tin đã lưu và nút theo trạng thái Nháp: Lưu nháp, Xuất bản', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ recognizedYear: 1993, latitude: 16.4637, longitude: 107.5909 }) });
    renderApp('/quan-tri/di-san/1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Quần thể di tích Cố đô Huế' })).toBeInTheDocument();
    expect(screen.getByText('Nháp')).toBeInTheDocument();
    expect(await screen.findByLabelText('Đường dẫn')).toHaveValue('quan-the-di-tich-co-do-hue');
    expect(screen.getByLabelText('Loại')).toHaveValue('TANGIBLE');
    expect(screen.getByLabelText('Cấp xếp hạng')).toHaveValue('UNESCO');
    expect(screen.getByLabelText('Năm công nhận')).toHaveValue('1993');
    expect(screen.getByLabelText('Vĩ độ')).toHaveValue('16.4637');
    await waitFor(() => expect(screen.getByLabelText('Tỉnh, thành phố')).toHaveValue('1'));
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xuất bản' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ẩn' })).not.toBeInTheDocument();
  });

  it('lưu nháp gửi toàn bộ thông tin chung, đổi loại và tỉnh thành số / enum', async () => {
    signInAs('ADMIN');
    const state = { detail: heritageDetailOf() };
    const calls = api(state, (call) => {
      if (call.path === '/admin/heritages/1' && call.method === 'PUT') {
        state.detail = heritageDetailOf({ name: 'Cố đô Huế', address: null });
        return envelope(200, { data: state.detail, message: 'Lưu di sản thành công.' });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    const name = await screen.findByLabelText('Tên');
    await user.clear(name);
    await user.type(name, '  Cố đô Huế ');
    await user.clear(screen.getByLabelText('Địa chỉ'));
    await user.selectOptions(screen.getByLabelText('Loại'), 'Hỗn hợp');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Thành phố Đà Nẵng' })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText('Tỉnh, thành phố'), 'Thành phố Đà Nẵng');
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    expect(await screen.findByText('Lưu di sản thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
      name: 'Cố đô Huế',
      slug: 'quan-the-di-tich-co-do-hue',
      shortDescription: 'Hệ thống thành quách, cung điện, đền miếu của triều Nguyễn.',
      content: 'Nội dung tóm lược.',
      heritageType: 'MIXED',
      recognitionLevel: 'UNESCO',
      recognizedYear: 1993,
      provinceId: 2,
      address: null,
      latitude: 16.4637,
      longitude: 107.5909,
      placeId: null,
    });
  });

  it('xuất bản khi chưa đủ điều kiện: báo phần còn thiếu, mở đúng tab, không đổi trạng thái', async () => {
    signInAs('ADMIN');
    const notReady = 'Chưa đủ điều kiện xuất bản di sản. Còn thiếu: nguồn tham chiếu (ít nhất một).';
    api({ detail: heritageDetailOf() }, (call) =>
      call.path === '/admin/heritages/1/publish'
        ? envelope(422, { errorCode: 'NOT_READY', message: notReady, errors: { references: 'Còn thiếu nguồn tham chiếu (ít nhất một).' } })
        : undefined,
    );
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/di-san/1');

    await user.click(await screen.findByRole('button', { name: 'Xuất bản' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(notReady);
    expect(screen.getByText('Nháp')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Mở tab Nguồn tham chiếu' }));
    await waitFor(() => expect(router.state.location.search).toBe('?tab=nguon'));
    expect(await screen.findByText('Di sản chưa có nguồn tham chiếu nào.')).toBeInTheDocument();
  });

  it('di sản nháp còn thiếu điều kiện: thanh báo thường trực liệt kê phần thiếu', async () => {
    signInAs('ADMIN');
    api({
      detail: heritageDetailOf({
        readiness: {
          isReady: false,
          missing: [
            { field: 'content', label: 'nội dung tối thiểu 200 từ' },
            { field: 'references', label: 'nguồn tham chiếu (ít nhất một)' },
          ],
          warnings: [],
        },
      }),
    });
    renderApp('/quan-tri/di-san/1');

    expect(
      await screen.findByText('Chưa đủ điều kiện xuất bản. Còn thiếu: nội dung tối thiểu 200 từ, nguồn tham chiếu (ít nhất một).'),
    ).toBeInTheDocument();
  });

  it('xuất bản khi có thay đổi chưa lưu: lưu trước rồi mới xuất bản; xong thì nút đổi thành Lưu và Ẩn', async () => {
    signInAs('ADMIN');
    const order: string[] = [];
    const published = heritageDetailOf({ name: 'Cố đô Huế', status: 'PUBLISHED' });
    api({ detail: heritageDetailOf() }, (call) => {
      if (call.path === '/admin/heritages/1' && call.method === 'PUT') {
        order.push('lưu');
        return envelope(200, { data: heritageDetailOf({ name: 'Cố đô Huế' }), message: 'Lưu di sản thành công.' });
      }
      if (call.path === '/admin/heritages/1/publish') {
        order.push('xuất bản');
        return envelope(200, { data: published, message: 'Xuất bản di sản thành công.' });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    const name = await screen.findByLabelText('Tên');
    await user.clear(name);
    await user.type(name, 'Cố đô Huế');
    await user.click(screen.getByRole('button', { name: 'Xuất bản' }));

    expect(await screen.findByText('Xuất bản di sản thành công.')).toBeInTheDocument();
    expect(order).toEqual(['lưu', 'xuất bản']);
    expect(await screen.findByText('Đã xuất bản')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ẩn' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xuất bản' })).not.toBeInTheDocument();
  });

  it('sửa di sản đang xuất bản làm mất điều kiện: máy chủ từ chối, báo phần thiếu và không lưu', async () => {
    signInAs('ADMIN');
    const message = 'Chưa đủ điều kiện lưu di sản đang xuất bản. Còn thiếu: mô tả ngắn.';
    api({ detail: heritageDetailOf({ status: 'PUBLISHED' }) }, (call) =>
      call.path === '/admin/heritages/1' && call.method === 'PUT'
        ? envelope(422, { errorCode: 'NOT_READY', message, errors: { shortDescription: 'Còn thiếu mô tả ngắn.' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    await user.clear(await screen.findByLabelText('Mô tả ngắn'));
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByText('Còn thiếu mô tả ngắn.')).toBeInTheDocument();
  });

  it('ẩn di sản đang xuất bản qua hộp xác nhận: trạng thái thành Đã ẩn, nút thành Hiện lại', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ status: 'PUBLISHED' }) }, (call) =>
      call.path === '/admin/heritages/1/archive'
        ? envelope(200, { data: heritageDetailOf({ status: 'ARCHIVED' }), message: 'Ẩn di sản thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    await user.click(await screen.findByRole('button', { name: 'Ẩn' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ẩn di sản' });
    expect(within(dialog).getByText(MESSAGES.confirm('ẩn di sản', 'Quần thể di tích Cố đô Huế'))).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ẩn di sản' }));

    expect(await screen.findByText('Ẩn di sản thành công.')).toBeInTheDocument();
    expect(await screen.findByText('Đã ẩn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hiện lại' })).toBeInTheDocument();
  });

  it('di sản không tồn tại: báo không tìm thấy, không có nút Thử lại', async () => {
    signInAs('ADMIN');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      return envelope(404, { errorCode: 'BLOCKED', message: 'Không thể xem di sản. Không tìm thấy di sản.' });
    });
    renderApp('/quan-tri/di-san/999');

    expect(await screen.findByText('Không thể xem di sản. Không tìm thấy di sản.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
  });

  it('chọn ảnh đại diện trong thư viện ảnh của di sản', async () => {
    signInAs('ADMIN');
    const media = [heritageMediaOf(1), heritageMediaOf(2, { caption: 'Ngọ Môn' })];
    const withThumb = heritageDetailOf({ media: [media[0]!, { ...media[1]!, isThumbnail: true }], thumbnailUrl: media[1]!.url });
    const calls = api({ detail: heritageDetailOf({ media }) }, (call) =>
      call.path === '/admin/heritages/1/thumbnail' ? envelope(200, { data: withThumb, message: 'Chọn ảnh đại diện thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    await user.click(await screen.findByRole('button', { name: 'Chọn ảnh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chọn ảnh đại diện' });
    await user.click(within(dialog).getByRole('radio', { name: /Ngọ Môn/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Lưu ảnh đại diện' }));

    expect(await screen.findByText('Chọn ảnh đại diện thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/thumbnail'))?.body).toEqual({ mediaId: 2 });
    expect(await screen.findByRole('button', { name: 'Đổi ảnh' })).toBeInTheDocument();
  });
});

describe('Biên tập di sản — chọn tọa độ trên bản đồ', () => {
  const lat = () => screen.getByLabelText('Vĩ độ') as HTMLInputElement;
  const lng = () => screen.getByLabelText('Kinh độ') as HTMLInputElement;
  const mapOf = async () => {
    await waitFor(() => expect(document.querySelector('.leaflet-container')).not.toBeNull());
    return document.querySelector('.leaflet-container') as HTMLElement;
  };

  it('có bản đồ OpenStreetMap kèm Hoàng Sa, Trường Sa; đặt ghim đúng tọa độ đã lưu và ghi công bản đồ', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ latitude: 16.4637, longitude: 107.5909 }) });
    renderApp('/quan-tri/di-san/1');

    await screen.findByLabelText('Vĩ độ');
    await waitFor(() => expect(document.querySelector('.dsv-pin--selected')).not.toBeNull());
    const map = await mapOf();
    expect(map.textContent).toContain('Quần đảo Hoàng Sa (Việt Nam)');
    expect(map.textContent).toContain('Quần đảo Trường Sa (Việt Nam)');
    expect(map.querySelector('.leaflet-control-attribution')?.textContent).toContain('Những người đóng góp OpenStreetMap');
    expect(screen.getByRole('region', { name: 'Bản đồ chọn tọa độ' })).toBeInTheDocument();
  });

  it('bấm lên bản đồ điền hai ô số bằng tọa độ làm tròn 6 chữ số, ô số vẫn nhập tay được và lưu gửi đúng số', async () => {
    signInAs('ADMIN');
    const state = { detail: heritageDetailOf({ latitude: 16.4637, longitude: 107.5909 }) };
    const calls = api(state, (call) =>
      call.path === '/admin/heritages/1' && call.method === 'PUT' ? envelope(200, { data: state.detail, message: 'Lưu di sản thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    await screen.findByLabelText('Vĩ độ');
    await waitFor(() => expect(document.querySelector('.dsv-pin--selected')).not.toBeNull());
    const map = await mapOf();
    // Bản đồ đang đặt tâm ở ghim: bấm lệch khỏi tâm 60 điểm ảnh sang phải và 40 xuống dưới.
    fireEvent.click(map, { clientX: 180 + 60, clientY: 144 + 40 });

    await waitFor(() => expect(lat().value).not.toBe('16.4637'));
    const pickedLat = Number(lat().value);
    const pickedLng = Number(lng().value);
    expect(pickedLat).toBeLessThan(16.4637);
    expect(pickedLat).toBeGreaterThan(16.3);
    expect(pickedLng).toBeGreaterThan(107.5909);
    expect(pickedLng).toBeLessThan(107.7);
    expect(lat().value).toMatch(/^\d+(\.\d{1,6})?$/);

    // Ô số vẫn là nơi nhập chính xác.
    await user.clear(lat());
    await user.type(lat(), '16,5');
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));

    expect(await screen.findByText('Lưu di sản thành công.')).toBeInTheDocument();
    const body = calls.find((c) => c.method === 'PUT')?.body as { latitude: number; longitude: number };
    expect(body.latitude).toBe(16.5);
    expect(body.longitude).toBe(pickedLng);
  });

  it('chưa có tọa độ: bản đồ chưa có ghim; bấm lên bản đồ đặt tọa độ đầu tiên, nút Xóa tọa độ bỏ cả hai ô', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ latitude: null, longitude: null }) });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    await screen.findByLabelText('Vĩ độ');
    const map = await mapOf();
    await waitFor(() => expect(map.querySelector('.leaflet-control-attribution')).not.toBeNull());
    expect(document.querySelector('.dsv-pin--selected')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xóa tọa độ' })).not.toBeInTheDocument();

    fireEvent.click(map, { clientX: 180, clientY: 144 });
    await waitFor(() => expect(lat().value).not.toBe(''));
    expect(Number(lat().value)).toBeGreaterThanOrEqual(8);
    expect(Number(lat().value)).toBeLessThanOrEqual(23.5);
    expect(Number(lng().value)).toBeGreaterThanOrEqual(102);
    expect(Number(lng().value)).toBeLessThanOrEqual(117.5);
    await waitFor(() => expect(document.querySelector('.dsv-pin--selected')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'Xóa tọa độ' }));
    expect(lat()).toHaveValue('');
    expect(lng()).toHaveValue('');
    await waitFor(() => expect(document.querySelector('.dsv-pin--selected')).toBeNull());
  });

  it('gõ tọa độ vào ô số thì ghim trên bản đồ theo ngay; gõ ngoài lãnh thổ thì bản đồ không đặt ghim', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ latitude: null, longitude: null }) });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1');

    await screen.findByLabelText('Vĩ độ');
    await user.type(lat(), '21,0285');
    await user.type(lng(), '105,8542');
    await waitFor(() => expect(document.querySelector('.dsv-pin--selected')).not.toBeNull());

    await user.clear(lat());
    await user.type(lat(), '40');
    await waitFor(() => expect(document.querySelector('.dsv-pin--selected')).toBeNull());
  });
});

describe('Biên tập di sản — tab Ảnh và media', () => {
  it('thêm ảnh: ghi công đủ ba phần, giấy phép hạn chế bị chặn, gửi đúng thân yêu cầu', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf({ media: [heritageMediaOf(1, { isThumbnail: true })] }) }, (call) =>
      call.path === '/admin/heritages/1/media' && call.method === 'POST'
        ? envelope(201, { data: heritageMediaOf(2), message: 'Thêm ảnh thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=anh');

    const first = (await screen.findByText('Ảnh số 1')).closest('li')!;
    expect(within(first).getByText('Ảnh đại diện')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thêm bằng đường dẫn' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm ảnh và media' });

    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByText('Vui lòng nhập đường dẫn.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập tác giả.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập giấy phép.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập nguồn ảnh.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Đường dẫn'), 'https://upload.wikimedia.org/ngo-mon.jpg');
    await user.type(within(dialog).getByLabelText('Chú thích'), 'Ngọ Môn');
    await user.type(within(dialog).getByLabelText('Tác giả'), 'Vyacheslav Argenberg');
    await user.type(within(dialog).getByLabelText('Giấy phép'), 'CC BY-NC 4.0');
    await user.type(within(dialog).getByLabelText('Nguồn'), 'Wikimedia Commons');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(
      await within(dialog).findByText('Giấy phép không hợp lệ: chỉ dùng CC0, CC BY, CC BY-SA, phạm vi công cộng (public domain) hoặc ảnh nhóm tự chụp.'),
    ).toBeInTheDocument();

    const license = within(dialog).getByLabelText('Giấy phép');
    await user.clear(license);
    await user.type(license, 'CC BY 4.0');
    await user.click(within(dialog).getByLabelText('Dùng làm ảnh đại diện của di sản'));
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Thêm ảnh thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/media'))?.body).toEqual({
      mediaType: 'IMAGE',
      url: 'https://upload.wikimedia.org/ngo-mon.jpg',
      caption: 'Ngọ Môn',
      author: 'Vyacheslav Argenberg',
      license: 'CC BY 4.0',
      source: 'Wikimedia Commons',
      sortOrder: null,
      setAsThumbnail: true,
    });
  });

  describe('tải ảnh lên', () => {
    const jpg = () => new File([new Uint8Array(2048)], 'ngo-mon.jpg', { type: 'image/jpeg' });

    const openUpload = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByRole('button', { name: 'Tải ảnh lên' }));
      return screen.findByRole('dialog', { name: 'Tải ảnh lên' });
    };

    const fillCredit = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) => {
      await user.type(within(dialog).getByLabelText('Chú thích'), 'Ngọ Môn');
      await user.type(within(dialog).getByLabelText('Tác giả'), 'Nhóm sản phẩm');
      await user.type(within(dialog).getByLabelText('Giấy phép'), 'Ảnh nhóm tự chụp');
      await user.type(within(dialog).getByLabelText('Nguồn'), 'Chuyến thực địa');
    };

    it('chưa chọn tệp và chưa ghi công thì báo từng ô, không gọi API', async () => {
      signInAs('ADMIN');
      const calls = api({ detail: heritageDetailOf({ media: [heritageMediaOf(1, { isThumbnail: true })] }) });
      const user = userEvent.setup();
      renderApp('/quan-tri/di-san/1?tab=anh');

      const dialog = await openUpload(user);
      expect(within(dialog).queryByLabelText('Đường dẫn')).not.toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));

      expect(await within(dialog).findByText('Vui lòng nhập tệp ảnh.')).toBeInTheDocument();
      expect(within(dialog).getByText('Vui lòng nhập tác giả.')).toBeInTheDocument();
      expect(within(dialog).getByText('Vui lòng nhập giấy phép.')).toBeInTheDocument();
      expect(within(dialog).getByText('Vui lòng nhập nguồn ảnh.')).toBeInTheDocument();
      expect(calls.some((c) => c.path.endsWith('/media/upload'))).toBe(false);
    });

    it('tệp sai định dạng hoặc quá 5 MB bị từ chối ngay khi chọn, kèm câu giống backend', async () => {
      signInAs('ADMIN');
      const calls = api({ detail: heritageDetailOf({ media: [heritageMediaOf(1, { isThumbnail: true })] }) });
      const user = userEvent.setup({ applyAccept: false });
      renderApp('/quan-tri/di-san/1?tab=anh');

      const dialog = await openUpload(user);
      const input = within(dialog).getByLabelText('Chọn tệp ảnh');
      await user.upload(input, new File(['GIF89a'], 'anh-dong.gif', { type: 'image/gif' }));
      expect(await within(dialog).findByText('Tệp ảnh không hợp lệ: chỉ nhận định dạng JPG, PNG hoặc WEBP.')).toBeInTheDocument();

      await user.upload(input, new File(['MZ'], 'ung-dung.jpg', { type: 'application/x-msdownload' }));
      expect(await within(dialog).findByText('Tệp ảnh không hợp lệ: chỉ nhận định dạng JPG, PNG hoặc WEBP.')).toBeInTheDocument();

      const big = new File([new Uint8Array(6 * 1024 * 1024)], 'to.png', { type: 'image/png' });
      await user.upload(input, big);
      expect(await within(dialog).findByText('Tệp ảnh không hợp lệ: tối đa 5 MB, tệp này 6,0 MB.')).toBeInTheDocument();

      await fillCredit(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));
      expect(within(dialog).getByText('Tệp ảnh không hợp lệ: tối đa 5 MB, tệp này 6,0 MB.')).toBeInTheDocument();
      expect(calls.some((c) => c.path.endsWith('/media/upload'))).toBe(false);
    });

    it('tải một ảnh JPG: gửi multipart đủ tệp và ghi công, chọn luôn làm ảnh đại diện khi chưa có, rồi đóng và làm mới danh sách', async () => {
      signInAs('ADMIN');
      const state = { detail: heritageDetailOf({ media: [] }) };
      const calls = api(state, (call) => {
        if (call.path === '/admin/heritages/1/media/upload' && call.method === 'POST') {
          state.detail = heritageDetailOf({
            media: [heritageMediaOf(5, { url: '/files/images/ab12.jpg', previewUrl: '/files/images/ab12-thumb.webp', caption: 'Ngọ Môn', isThumbnail: true })],
          });
          return envelope(201, { data: state.detail.media[0], message: 'Tải ảnh lên thành công.' });
        }
        return undefined;
      });
      const user = userEvent.setup();
      renderApp('/quan-tri/di-san/1?tab=anh');

      const dialog = await openUpload(user);
      await user.upload(within(dialog).getByLabelText('Chọn tệp ảnh'), jpg());
      expect(await within(dialog).findByText('ngo-mon.jpg')).toBeInTheDocument();
      expect(within(dialog).getByText('2 KB')).toBeInTheDocument();
      // Chưa có ảnh đại diện: mặc định đề nghị chọn ảnh vừa tải.
      expect(within(dialog).getByLabelText('Dùng làm ảnh đại diện của di sản')).toBeChecked();
      await fillCredit(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));

      expect(await screen.findByText('Tải ảnh lên thành công.')).toBeInTheDocument();
      expect(calls.find((c) => c.path.endsWith('/media/upload'))?.body).toEqual({
        file: { fileName: 'ngo-mon.jpg', size: 2048 },
        author: 'Nhóm sản phẩm',
        license: 'Ảnh nhóm tự chụp',
        source: 'Chuyến thực địa',
        caption: 'Ngọ Môn',
        setAsThumbnail: 'true',
      });
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tải ảnh lên' })).not.toBeInTheDocument());
      // Danh sách dùng ảnh thu nhỏ, ghép với địa chỉ máy chủ API vì đường dẫn trong kho là tương đối.
      const row = (await screen.findByText('Ngọ Môn')).closest('li')!;
      expect(row.querySelector('img')).toHaveAttribute('src', 'http://api.test/files/images/ab12-thumb.webp');
      expect(within(row).getByText('Ảnh đại diện')).toBeInTheDocument();
    });

    it('đã có ảnh đại diện thì không tự chọn ảnh mới làm ảnh đại diện', async () => {
      signInAs('ADMIN');
      const calls = api({ detail: heritageDetailOf({ media: [heritageMediaOf(1, { isThumbnail: true })] }) }, (call) =>
        call.path.endsWith('/media/upload') ? envelope(201, { data: heritageMediaOf(2), message: 'Tải ảnh lên thành công.' }) : undefined,
      );
      const user = userEvent.setup();
      renderApp('/quan-tri/di-san/1?tab=anh');

      const dialog = await openUpload(user);
      expect(within(dialog).getByLabelText('Dùng làm ảnh đại diện của di sản')).not.toBeChecked();
      await user.upload(within(dialog).getByLabelText('Chọn tệp ảnh'), jpg());
      await fillCredit(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));

      await screen.findByText('Tải ảnh lên thành công.');
      expect(calls.find((c) => c.path.endsWith('/media/upload'))?.body).not.toHaveProperty('setAsThumbnail');
    });

    it('backend từ chối tệp (nội dung không phải ảnh) thì báo dưới ô tệp và giữ hộp thoại để chọn lại', async () => {
      signInAs('ADMIN');
      const message = 'Tệp ảnh không hợp lệ: không đọc được, tệp không phải ảnh hoặc đã bị hỏng.';
      api({ detail: heritageDetailOf({ media: [heritageMediaOf(1, { isThumbnail: true })] }) }, (call) =>
        call.path.endsWith('/media/upload') ? envelope(400, { errorCode: 'INVALID', message, errors: { file: message } }) : undefined,
      );
      const user = userEvent.setup();
      renderApp('/quan-tri/di-san/1?tab=anh');

      const dialog = await openUpload(user);
      await user.upload(within(dialog).getByLabelText('Chọn tệp ảnh'), jpg());
      await fillCredit(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }));

      expect(await within(dialog).findByText(message)).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Tải ảnh lên' })).toBeInTheDocument();
      expect(within(dialog).getByText('ngo-mon.jpg')).toBeInTheDocument();
    });
  });

  it('đổi thứ tự bằng phím mũi tên gửi đủ danh sách id; chọn ảnh đại diện và xóa ảnh có hộp xác nhận', async () => {
    signInAs('ADMIN');
    const calls = api(
      { detail: heritageDetailOf({ media: [heritageMediaOf(1), heritageMediaOf(2), heritageMediaOf(3)] }) },
      (call) => {
        if (call.path === '/admin/heritages/1/media/order') return envelope(200, { data: [], message: 'Đổi thứ tự ảnh thành công.' });
        if (call.path === '/admin/heritages/1/thumbnail') return envelope(200, { data: heritageDetailOf() });
        if (call.path === '/admin/media/3' && call.method === 'DELETE') return envelope(200, { message: 'Xóa ảnh thành công.' });
        return undefined;
      },
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=anh');

    fireEvent.keyDown(await screen.findByRole('button', { name: /Đổi thứ tự "Ảnh số 1"/ }), { key: 'ArrowDown' });
    await waitFor(() => expect(calls.some((c) => c.path === '/admin/heritages/1/media/order')).toBe(true));
    expect(calls.find((c) => c.path.endsWith('/media/order'))?.body).toEqual({ ids: [2, 1, 3] });

    const buttons = screen.getAllByRole('button', { name: 'Chọn làm ảnh đại diện' });
    await user.click(buttons[1]!);
    await waitFor(() => expect(calls.find((c) => c.path.endsWith('/thumbnail'))?.body).toEqual({ mediaId: 2 }));

    await user.click(screen.getByRole('button', { name: 'Xóa Ảnh số 3' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa ảnh' });
    await user.click(within(dialog).getByRole('button', { name: 'Xóa ảnh' }));
    expect(await screen.findByText('Xóa ảnh thành công.')).toBeInTheDocument();
  });

  it('di sản đang xuất bản không xóa được ảnh đại diện', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ status: 'PUBLISHED', media: [heritageMediaOf(1, { isThumbnail: true })] }) });
    renderApp('/quan-tri/di-san/1?tab=anh');

    expect(await screen.findByRole('button', { name: 'Xóa Ảnh số 1' })).toBeDisabled();
  });
});

describe('Biên tập di sản — tab Dòng thời gian', () => {
  const timelines = () => [
    heritageTimelineOf(10, {
      name: 'Thời chúa Nguyễn',
      startYear: 1558,
      endYear: 1775,
      description: 'Huế là thủ phủ Đàng Trong.',
      events: [
        heritageEventOf(100, 10, { name: 'Nguyễn Hoàng vào trấn thủ đất Thuận Hóa', startYear: 1558 }),
        heritageEventOf(101, 10, { name: 'Dời phủ về Phú Xuân', startYear: 1687, endYear: 1700 }),
      ],
    }),
    heritageTimelineOf(11, { name: 'Xây dựng Kinh thành', startYear: 1802, endYear: null, events: [] }),
  ];

  it('hiện giai đoạn, khoảng năm, số sự kiện, sự kiện theo mức chi tiết và bản xem trước', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf({ timelines: timelines() }) });
    renderApp('/quan-tri/di-san/1?tab=dong-thoi-gian');

    expect(await screen.findByText('2 giai đoạn, 2 sự kiện.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('1558 – 1775 · 2 sự kiện')).toBeInTheDocument();
    expect(screen.getByText('Từ 1802 · 0 sự kiện')).toBeInTheDocument();
    expect(screen.getByText('1687 – 1700')).toBeInTheDocument();
    const preview = screen.getByRole('complementary', { name: 'Xem trước trên trang công khai' });
    expect(within(preview).getByText('Thời chúa Nguyễn')).toBeInTheDocument();
    expect(within(preview).getByText('1802')).toBeInTheDocument();
  });

  it('chưa có giai đoạn: trạng thái rỗng, không có nút Thêm sự kiện', async () => {
    signInAs('ADMIN');
    api({ detail: heritageDetailOf() });
    renderApp('/quan-tri/di-san/1?tab=dong-thoi-gian');

    expect(await screen.findByText('Di sản chưa có giai đoạn nào.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm sự kiện' })).not.toBeInTheDocument();
  });

  it('thêm giai đoạn: kiểm năm bắt đầu / kết thúc, gửi năm âm và thứ tự đúng kiểu số', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf({ timelines: timelines() }) }, (call) =>
      call.path === '/admin/heritages/1/timelines' && call.method === 'POST'
        ? envelope(201, { data: heritageTimelineOf(12), message: 'Thêm giai đoạn thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=dong-thoi-gian');

    await user.click(await screen.findByRole('button', { name: 'Thêm giai đoạn' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm giai đoạn' });
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByText('Vui lòng nhập tên giai đoạn.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Tên'), 'Thời Bắc thuộc');
    await user.type(within(dialog).getByLabelText('Năm bắt đầu'), '-179');
    await user.type(within(dialog).getByLabelText('Năm kết thúc'), '-200');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(
      await within(dialog).findByText('Năm kết thúc không hợp lệ: không được nhỏ hơn năm bắt đầu.'),
    ).toBeInTheDocument();

    const end = within(dialog).getByLabelText('Năm kết thúc');
    await user.clear(end);
    await user.type(end, '938');
    await user.type(within(dialog).getByLabelText('Thứ tự'), '3');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Thêm giai đoạn thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      name: 'Thời Bắc thuộc',
      description: null,
      startYear: -179,
      endYear: 938,
      sortOrder: 3,
    });
  });

  it('thêm sự kiện: kết thúc không trước bắt đầu, ngày phải có thật; gửi kèm ảnh minh họa có ghi công', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf({ timelines: timelines() }) }, (call) => {
      if (call.path === '/admin/timelines/11/events' && call.method === 'POST')
        return envelope(201, { data: heritageEventOf(200, 11), message: 'Thêm sự kiện thành công.' });
      if (call.path === '/admin/events/200/media' && call.method === 'POST')
        return envelope(201, { data: heritageMediaOf(9, { heritageId: null, eventId: 200 }) });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=dong-thoi-gian');

    const addButtons = await screen.findAllByRole('button', { name: 'Thêm sự kiện' });
    await user.click(addButtons[addButtons.length - 1]!); // nút của giai đoạn "Xây dựng Kinh thành"
    const dialog = await screen.findByRole('dialog', { name: 'Thêm sự kiện' });
    expect(within(dialog).getByLabelText('Giai đoạn')).toHaveValue('11');

    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByText('Vui lòng nhập tên sự kiện.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập năm bắt đầu.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Tên'), 'Khởi công xây dựng Kinh thành Huế');
    await user.type(within(dialog).getByLabelText('Năm bắt đầu'), '1805');
    await user.type(within(dialog).getByLabelText('Ngày bắt đầu'), '5');
    await user.type(within(dialog).getByLabelText('Năm kết thúc'), '1803');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByText(/Ngày bắt đầu không hợp lệ/)).toBeInTheDocument();
    expect(within(dialog).getByText('Thời điểm kết thúc không hợp lệ: không được trước thời điểm bắt đầu.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.type(within(dialog).getByLabelText('Tháng bắt đầu'), '6');
    const end = within(dialog).getByLabelText('Năm kết thúc');
    await user.clear(end);
    await user.type(end, '1832');
    await user.click(within(dialog).getByRole('button', { name: 'Thêm ảnh minh họa' }));
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByText('Vui lòng nhập đường dẫn.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Đường dẫn'), 'https://upload.wikimedia.org/kinh-thanh.jpg');
    await user.type(within(dialog).getByLabelText('Tác giả'), 'Nhóm tự chụp');
    await user.type(within(dialog).getByLabelText('Giấy phép'), 'Ảnh nhóm tự chụp');
    await user.type(within(dialog).getByLabelText('Nguồn'), 'Chuyến thực địa');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Thêm sự kiện thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/admin/timelines/11/events')?.body).toEqual({
      name: 'Khởi công xây dựng Kinh thành Huế',
      description: null,
      startYear: 1805,
      startMonth: 6,
      startDay: 5,
      endYear: 1832,
      endMonth: null,
      endDay: null,
      sortOrder: null,
    });
    expect(calls.find((c) => c.path === '/admin/events/200/media')?.body).toEqual({
      mediaType: 'IMAGE',
      url: 'https://upload.wikimedia.org/kinh-thanh.jpg',
      caption: null,
      author: 'Nhóm tự chụp',
      license: 'Ảnh nhóm tự chụp',
      source: 'Chuyến thực địa',
      sortOrder: null,
    });
  });

  it('đổi thứ tự giai đoạn và sự kiện bằng phím mũi tên gửi đủ danh sách id', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf({ timelines: timelines() }) }, (call) =>
      call.path.endsWith('/order') ? envelope(200, { data: [] }) : undefined,
    );
    renderApp('/quan-tri/di-san/1?tab=dong-thoi-gian');

    fireEvent.keyDown(await screen.findByRole('button', { name: /Đổi thứ tự "Thời chúa Nguyễn"/ }), { key: 'ArrowDown' });
    await waitFor(() => expect(calls.find((c) => c.path === '/admin/heritages/1/timelines/order')?.body).toEqual({ ids: [11, 10] }));

    fireEvent.keyDown(screen.getByRole('button', { name: /Đổi thứ tự "Dời phủ về Phú Xuân"/ }), { key: 'ArrowUp' });
    await waitFor(() => expect(calls.find((c) => c.path === '/admin/timelines/10/events/order')?.body).toEqual({ ids: [101, 100] }));
  });

  it('xóa giai đoạn cảnh báo kéo theo sự kiện; xóa sự kiện gọi đúng endpoint', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf({ timelines: timelines() }) }, (call) =>
      call.method === 'DELETE' ? envelope(200, { message: 'Đã xóa.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=dong-thoi-gian');

    await user.click(await screen.findByRole('button', { name: 'Xóa giai đoạn Thời chúa Nguyễn' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa giai đoạn' });
    expect(within(dialog).getByText(/2 sự kiện của giai đoạn và ảnh minh họa/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Xóa giai đoạn' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/admin/timelines/10')).toBe(true));

    await user.click(screen.getByRole('button', { name: 'Xóa sự kiện Dời phủ về Phú Xuân' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Xóa sự kiện' })).getByRole('button', { name: 'Xóa sự kiện' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/admin/events/101')).toBe(true));
  });
});

describe('Biên tập di sản — tab Nguồn tham chiếu', () => {
  it('thêm nguồn: ghép tiêu đề theo mẫu của nhóm, website bắt buộc có đường dẫn', async () => {
    signInAs('ADMIN');
    const calls = api({ detail: heritageDetailOf({ references: [heritageReferenceOf(1)] }) }, (call) =>
      call.path === '/admin/heritages/1/references' && call.method === 'POST'
        ? envelope(201, { data: heritageReferenceOf(2), message: 'Thêm nguồn tham chiếu thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=nguon');

    await user.click(await screen.findByRole('button', { name: 'Thêm nguồn' }));
    const row = await screen.findByRole('form', { name: 'Thêm nguồn tham chiếu' });
    await user.click(within(row).getByRole('button', { name: 'Lưu nguồn' }));
    expect(await within(row).findByText('Vui lòng nhập tên tài liệu.')).toBeInTheDocument();

    await user.selectOptions(within(row).getByLabelText('Loại nguồn'), 'Website');
    await user.type(within(row).getByLabelText('Tên tài liệu'), 'Festival Huế');
    await user.type(within(row).getByLabelText('Cơ quan hoặc tác giả'), 'Bộ Văn hóa, Thể thao và Du lịch');
    await user.type(within(row).getByLabelText('Ngày truy cập'), '31/02/2026');
    await user.click(within(row).getByRole('button', { name: 'Lưu nguồn' }));
    expect(
      await within(row).findByText('Ngày truy cập không hợp lệ: nhập theo dạng ngày/tháng/năm, ví dụ 26/09/2026.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Vui lòng nhập đường dẫn của nguồn website.')).toBeInTheDocument();

    const date = within(row).getByLabelText('Ngày truy cập');
    await user.clear(date);
    await user.type(date, '26/09/2026');
    await user.type(within(row).getByLabelText('Đường dẫn'), 'https://bvhttdl.gov.vn/festival-hue');
    await user.click(within(row).getByRole('button', { name: 'Lưu nguồn' }));

    expect(await screen.findByText('Thêm nguồn tham chiếu thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      title: 'Festival Huế — Bộ Văn hóa, Thể thao và Du lịch, truy cập 26/09/2026',
      url: 'https://bvhttdl.gov.vn/festival-hue',
      sourceType: 'WEBSITE',
    });
  });

  it('sửa nguồn tại chỗ: tách tiêu đề đã ghép ra các ô, lưu gửi lại đúng tiêu đề', async () => {
    signInAs('ADMIN');
    const reference = heritageReferenceOf(4, {
      title: 'Quyết định 1272/QĐ-TTg — Thủ tướng Chính phủ, truy cập 26/09/2026',
      sourceType: 'GOV_DOC',
      sourceTypeLabel: 'Văn bản nhà nước',
      url: null,
    });
    const calls = api({ detail: heritageDetailOf({ references: [reference] }) }, (call) =>
      call.path === '/admin/heritage-references/4' && call.method === 'PUT'
        ? envelope(200, { data: reference, message: 'Lưu nguồn tham chiếu thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=nguon');

    await user.click(await screen.findByRole('button', { name: /^Sửa nguồn Quyết định/ }));
    const row = await screen.findByRole('form', { name: 'Sửa nguồn tham chiếu' });
    expect(within(row).getByLabelText('Tên tài liệu')).toHaveValue('Quyết định 1272/QĐ-TTg');
    expect(within(row).getByLabelText('Cơ quan hoặc tác giả')).toHaveValue('Thủ tướng Chính phủ');
    expect(within(row).getByLabelText('Ngày truy cập')).toHaveValue('26/09/2026');
    await user.click(within(row).getByRole('button', { name: 'Lưu nguồn' }));

    expect(await screen.findByText('Lưu nguồn tham chiếu thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
      title: 'Quyết định 1272/QĐ-TTg — Thủ tướng Chính phủ, truy cập 26/09/2026',
      url: null,
      sourceType: 'GOV_DOC',
    });
  });

  it('xóa nguồn cuối của di sản đang xuất bản bị máy chủ chặn: hiện lý do', async () => {
    signInAs('ADMIN');
    const blocked = 'Không thể xóa nguồn tham chiếu. Di sản đang xuất bản cần ít nhất một nguồn.';
    api({ detail: heritageDetailOf({ status: 'PUBLISHED', references: [heritageReferenceOf(1)] }) }, (call) =>
      call.method === 'DELETE' ? envelope(422, { errorCode: 'BLOCKED', message: blocked }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san/1?tab=nguon');

    await user.click(await screen.findByRole('button', { name: /^Xóa nguồn Tài liệu/ }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Xóa nguồn tham chiếu' })).getByRole('button', { name: 'Xóa nguồn' }));
    expect(await screen.findByText(blocked)).toBeInTheDocument();
  });

  it('nhắc theo quy trình của nhóm bằng thông báo, không chặn', async () => {
    signInAs('ADMIN');
    const warning = 'Chưa có nguồn là văn bản nhà nước.';
    api({
      detail: heritageDetailOf({
        references: [heritageReferenceOf(1)],
        readiness: { isReady: true, missing: [], warnings: [warning] },
      }),
    });
    renderApp('/quan-tri/di-san/1?tab=nguon');

    expect(await screen.findByText(warning)).toBeInTheDocument();
  });
});
