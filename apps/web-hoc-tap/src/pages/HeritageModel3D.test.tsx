import type { PublicModel } from '@dsvhvn/dung-chung/api';
import { PREVIEW_TOKEN_REPLY, PREVIEW_TOKEN_REQUEST } from '@dsvhvn/dung-chung/auth';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languages';
import { detailOf, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi, type FetchCall } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Nút "Xem 3D" ở chi tiết di sản và trang xem trước, trình xem 3D dùng chung (miễn phí, không đăng nhập), ghi công, cảnh báo dung lượng trên mạng di động,
// quay về bộ ảnh khi không có mô hình, tải lỗi hoặc thiết bị không hỗ trợ; năm ngôn ngữ ở phần công khai.

vi.mock('../discovery/LocationMap', () => ({ default: () => <div data-testid="ban-do-nho" /> }));

// Trình xem thật cần WebGL; ở đây thay bằng khung giả có nút "Gây lỗi" để thử đường quay về bộ ảnh. Trình xem thật chạy ở smoke test.
vi.mock('@dsvhvn/dung-chung/model3d', async () => {
  const { createElement, useState } = await import('react');
  return {
    ModelViewer: ({ src, poster, labels, fallback }: { src: string; poster?: string | null; labels: { viewerAria: string; resetView: string; hint: string }; fallback: unknown }) => {
      const [failed, setFailed] = useState(false);
      if (failed) return fallback as never;
      return createElement(
        'div',
        { 'data-testid': 'trinh-xem', 'data-src': src, 'data-poster': poster ?? '' },
        createElement('p', null, labels.viewerAria),
        createElement('p', null, labels.hint),
        createElement('button', { type: 'button' }, labels.resetView),
        createElement('button', { type: 'button', onClick: () => setFailed(true) }, 'Gây lỗi'),
      );
    },
  };
});

const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const CREDIT = 'Nguyễn Văn An · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon';

const modelOf = (overrides: Partial<PublicModel> = {}): PublicModel => ({
  id: 1,
  title: 'Cổng Ngọ Môn',
  fileUrl: `/files/models/${KEY}.glb`,
  contentType: 'model/gltf-binary',
  fileSizeBytes: 4_404_019,
  posterUrl: null,
  author: 'Nguyễn Văn An',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://sketchfab.com/3d-models/ngo-mon',
  credit: CREDIT,
  ...overrides,
});

const MODEL_PATH = `/public/heritages/${HUE.slug}/model`;
const UNAVAILABLE = 'Không tải được mô hình 3D. Bạn có thể xem bộ ảnh của di sản.';
const unavailable = () => envelope(404, { errorCode: 'MODEL_UNAVAILABLE', message: UNAVAILABLE });

/** Chi tiết di sản có (hoặc không có) mô hình đang hiển thị, và API của mô hình. */
function api({ hasModel = true, model = () => envelope(200, { data: modelOf() }) }: { hasModel?: boolean; model?: () => Response } = {}) {
  return mockApi(
    (call) => {
      const path = call.path.split('?')[0];
      if (path === `/public/heritages/${HUE.slug}`) return envelope(200, { data: detailOf({ hasModel }) });
      if (path === MODEL_PATH) return model();
      return undefined;
    },
    publicApi(),
  );
}

function chooseLanguage(code: string) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

function setConnection(connection: Record<string, unknown> | undefined) {
  Object.defineProperty(window.navigator, 'connection', { value: connection, configurable: true });
}

afterEach(() => {
  setConnection(undefined);
  Object.defineProperty(window, 'opener', { value: null, configurable: true });
  document.querySelectorAll('iframe').forEach((frame) => frame.remove());
});

describe('Nút Xem 3D ở chi tiết di sản', () => {
  it('di sản không có mô hình hiển thị: không có nút "Xem 3D", chỉ có bộ ảnh; không gọi API mô hình', async () => {
    const calls = api({ hasModel: false });
    renderApp(`/di-san/${HUE.slug}`);

    await screen.findByRole('heading', { level: 1, name: HUE.name });
    expect(screen.getByRole('button', { name: 'Tóm tắt' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem 3D' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Thư viện ảnh' })).toBeInTheDocument();
    expect(calls.some((c) => c.path.includes('/model'))).toBe(false);
  });

  it('di sản có mô hình: nút "Xem 3D" nằm cùng hàng với "Tóm tắt" và "Nghe"; chưa bấm thì chưa tải mô hình', async () => {
    const calls = api();
    renderApp(`/di-san/${HUE.slug}`);

    const group = await screen.findByRole('group', { name: 'Tóm tắt và nghe thuyết minh' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tóm tắt', 'Nghe', 'Xem 3D']);
    expect(calls.some((c) => c.path.includes('/model'))).toBe(false);
  });

  it('bấm "Xem 3D": mở trình xem toàn màn hình miễn phí (không gửi token), đúng tệp, ghi công và liên kết giấy phép, nguồn', async () => {
    signInAs();
    const calls = api({ model: () => envelope(200, { data: modelOf({ posterUrl: '/files/images/poster.jpg' }) }) });
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    expect(await within(dialog).findByText('Cổng Ngọ Môn')).toBeInTheDocument();
    const viewer = within(dialog).getByTestId('trinh-xem');
    expect(viewer).toHaveAttribute('data-src', `http://api.test/files/models/${KEY}.glb`);
    expect(viewer).toHaveAttribute('data-poster', 'http://api.test/files/images/poster.jpg');
    expect(within(dialog).getByText('Mô hình 3D của Cổng Ngọ Môn')).toBeInTheDocument();
    expect(within(dialog).getByText('Đặt lại góc nhìn')).toBeInTheDocument();
    expect(within(dialog).getByText(`${HUE.name}`)).toBeInTheDocument();
    expect(within(dialog).getByText(CREDIT)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Xem giấy phép/ })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
    expect(within(dialog).getByRole('link', { name: /Xem nguồn/ })).toHaveAttribute('href', 'https://sketchfab.com/3d-models/ngo-mon');

    // Miễn phí, không cần đăng nhập, không qua quảng cáo: kể cả khi học sinh đã đăng nhập, lời gọi không mang token.
    const call = calls.find((c) => c.path.startsWith(MODEL_PATH));
    expect(call?.authorization).toBeUndefined();
    expect(screen.queryByText(/quảng cáo/i)).not.toBeInTheDocument();
  });

  it('mô hình không đặt tên thì dùng tên di sản làm tiêu đề', async () => {
    api({ model: () => envelope(200, { data: modelOf({ title: null }) }) });
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    expect(await within(dialog).findByText(`Mô hình 3D của ${HUE.name}`)).toBeInTheDocument();
  });

  it('đóng hộp thoại rồi mở lại vẫn xem được', async () => {
    api();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    await within(dialog).findByTestId('trinh-xem');
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'MÔ HÌNH 3D' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Xem 3D' }));
    expect(await screen.findByTestId('trinh-xem')).toBeInTheDocument();
  });
});

describe('Quay về bộ ảnh', () => {
  it('mô hình vừa bị ẩn (404 MODEL_UNAVAILABLE): hiện đúng câu thông báo và bộ ảnh kèm ghi công, không có trình xem', async () => {
    api({ model: unavailable });
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    expect(await within(dialog).findByText(UNAVAILABLE)).toBeInTheDocument();
    expect(within(dialog).queryByTestId('trinh-xem')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Bộ ảnh của di sản' })).toBeInTheDocument();
    expect(within(dialog).getAllByRole('figure').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Tháp Phước Duyên')).toBeInTheDocument();
    expect(within(dialog).getByText('Ảnh: Lưu Ly · Public domain · Wikimedia Commons')).toBeInTheDocument();
  });

  it('trình xem tải lỗi hoặc thiết bị không hỗ trợ: thay trình xem bằng câu thông báo và bộ ảnh', async () => {
    api();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    await user.click(await within(dialog).findByRole('button', { name: 'Gây lỗi' }));

    expect(within(dialog).getByText(UNAVAILABLE)).toBeInTheDocument();
    expect(within(dialog).queryByTestId('trinh-xem')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Tháp Phước Duyên')).toBeInTheDocument();
    // Ghi công của mô hình vẫn hiện.
    expect(within(dialog).getByText(CREDIT)).toBeInTheDocument();
  });

  it('di sản không có ảnh nào thì nói rõ', async () => {
    mockApi(
      (call) => {
        const path = call.path.split('?')[0];
        if (path === `/public/heritages/${HUE.slug}`) return envelope(200, { data: detailOf({ hasModel: true, media: [] }) });
        if (path === MODEL_PATH) return unavailable();
        return undefined;
      },
      publicApi(),
    );
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    expect(await screen.findByText('Di sản này chưa có ảnh.')).toBeInTheDocument();
  });

  it('lỗi máy chủ hoặc mạng (không phải 404): báo lỗi, cho thử lại, vẫn có bộ ảnh', async () => {
    let fail = true;
    api({ model: () => (fail ? envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Đã có lỗi xảy ra.' }) : envelope(200, { data: modelOf() })) });
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    expect(await within(dialog).findByText(UNAVAILABLE)).toBeInTheDocument();
    expect(within(dialog).getByText('Tháp Phước Duyên')).toBeInTheDocument();
    fail = false;
    const retries = within(dialog).getAllByRole('button', { name: 'Thử lại' });
    await user.click(retries[0]!);
    expect(await within(dialog).findByTestId('trinh-xem')).toBeInTheDocument();
  });
});

describe('Cảnh báo dung lượng trên mạng di động', () => {
  it('mô hình nặng mà đang dùng mạng di động: hỏi trước, chưa dựng trình xem; "Vẫn tải mô hình" thì tải', async () => {
    setConnection({ type: 'cellular', effectiveType: '4g' });
    api({ model: () => envelope(200, { data: modelOf({ fileSizeBytes: 9_437_184 }) }) });
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    expect(await within(dialog).findByText('Mô hình này khá nặng')).toBeInTheDocument();
    expect(within(dialog).getByText(/Mô hình nặng khoảng 9,0 MB/)).toBeInTheDocument();
    expect(within(dialog).queryByTestId('trinh-xem')).not.toBeInTheDocument();
    // Ghi công vẫn hiện trong lúc chờ quyết định.
    expect(within(dialog).getByText(CREDIT)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Vẫn tải mô hình' }));
    expect(await within(dialog).findByTestId('trinh-xem')).toBeInTheDocument();
    expect(within(dialog).queryByText('Mô hình này khá nặng')).not.toBeInTheDocument();
  });

  it('mô hình nặng trên mạng thường hoặc không biết tình trạng mạng thì tải luôn; mô hình nhẹ trên mạng di động cũng tải luôn', async () => {
    api({ model: () => envelope(200, { data: modelOf({ fileSizeBytes: 12_000_000 }) }) });
    const user = userEvent.setup();
    const first = renderApp(`/di-san/${HUE.slug}`);
    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    expect(await screen.findByTestId('trinh-xem')).toBeInTheDocument();
    first.unmount();

    setConnection({ type: 'cellular' });
    api({ model: () => envelope(200, { data: modelOf({ fileSizeBytes: 800_000 }) }) });
    renderApp(`/di-san/${HUE.slug}`);
    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    expect(await screen.findByTestId('trinh-xem')).toBeInTheDocument();
  });
});

describe('Xem 3D bằng năm ngôn ngữ', () => {
  it.each([
    ['en', 'View in 3D', '3D MODEL', 'The 3D model could not be loaded. You can view the photo gallery of this heritage site instead.', 'Photo gallery of the heritage site'],
    ['ko', '3D로 보기', '3D 모델', '3D 모델을 불러올 수 없습니다. 유산의 사진 모음을 대신 볼 수 있습니다.', '유산 사진 모음'],
    ['zh-Hans', '查看 3D', '3D 模型', '无法加载 3D 模型。您可以改为查看该遗产的图片集。', '遗产图片集'],
    ['ja', '3Dで見る', '3Dモデル', '3Dモデルを読み込めませんでした。代わりに遺産の写真ギャラリーをご覧いただけます。', '遺産の写真ギャラリー'],
  ])('%s: nút, tiêu đề hộp thoại, câu thông báo và bộ ảnh theo ngôn ngữ', async (code, button, title, message, photos) => {
    chooseLanguage(code!);
    api({ model: unavailable });
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: button }));
    const dialog = await screen.findByRole('dialog', { name: title });
    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { level: 3, name: photos })).toBeInTheDocument();
  });

  it('tiếng Anh: chữ của trình xem theo ngôn ngữ, còn ghi công (tác giả, giấy phép, nguồn) giữ nguyên', async () => {
    chooseLanguage('en');
    api();
    const user = userEvent.setup();
    renderApp(`/di-san/${HUE.slug}`);

    await user.click(await screen.findByRole('button', { name: 'View in 3D' }));
    const dialog = await screen.findByRole('dialog', { name: '3D MODEL' });
    expect(await within(dialog).findByText('Reset view')).toBeInTheDocument();
    expect(within(dialog).getByText('3D model of Cổng Ngọ Môn')).toBeInTheDocument();
    expect(within(dialog).getByText(/Drag to rotate/)).toBeInTheDocument();
    expect(within(dialog).getByText(CREDIT)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /View license/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /View source/ })).toBeInTheDocument();
  });

  it('học sinh đã đăng nhập luôn xem tiếng Việt dù máy nhớ ngôn ngữ khác', async () => {
    chooseLanguage('ko');
    signInAs();
    api();
    renderApp(`/di-san/${HUE.slug}`);
    expect(await screen.findByRole('button', { name: 'Xem 3D' })).toBeInTheDocument();
  });
});

describe('Xem 3D ở trang xem trước bản nháp', () => {
  const ADMIN = 'http://quantri.test';
  const CODE = 'MA-XEM-TRUOC';

  function adminOpener(token: string) {
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const opener = frame.contentWindow!;
    vi.spyOn(opener, 'postMessage').mockImplementation(((message: { type: string }) => {
      if (message.type !== PREVIEW_TOKEN_REQUEST) return;
      window.dispatchEvent(new MessageEvent('message', { data: { type: PREVIEW_TOKEN_REPLY, token }, origin: ADMIN, source: opener }));
    }) as typeof opener.postMessage);
    Object.defineProperty(window, 'opener', { value: opener, configurable: true });
  }

  const previewServer = (model: () => Response, hasModel = true) => (call: FetchCall) => {
    const path = call.path.split('?')[0];
    if (path === `/preview/heritages/${CODE}`) {
      return envelope(200, { data: { expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), status: 'DRAFT', heritage: detailOf({ name: 'Bản nháp Cố đô Huế', hasModel }) } });
    }
    if (path === `/preview/heritages/${CODE}/model`) return model();
    return undefined;
  };

  it('nháp có mô hình: có nút "Xem 3D" (không có "Tóm tắt" và "Nghe"), đọc mô hình của bản nháp bằng token quản trị', async () => {
    adminOpener('token-quan-tri');
    const calls = mockApi(previewServer(() => envelope(200, { data: modelOf() })), publicApi());
    const user = userEvent.setup();
    renderApp(`/xem-truoc/di-san/${CODE}`);

    await screen.findByRole('heading', { level: 1, name: 'Bản nháp Cố đô Huế' });
    expect(screen.queryByRole('button', { name: 'Tóm tắt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nghe' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xem 3D' }));

    const dialog = await screen.findByRole('dialog', { name: 'MÔ HÌNH 3D' });
    expect(await within(dialog).findByTestId('trinh-xem')).toHaveAttribute('data-src', `http://api.test/files/models/${KEY}.glb`);
    expect(within(dialog).getByText(CREDIT)).toBeInTheDocument();
    const call = calls.find((c) => c.path.startsWith(`/preview/heritages/${CODE}/model`));
    expect(call?.authorization).toBe('Bearer token-quan-tri');
    expect(calls.some((c) => c.path === MODEL_PATH)).toBe(false);
  });

  it('nháp chưa có mô hình: không có nút "Xem 3D"', async () => {
    adminOpener('token-quan-tri');
    mockApi(previewServer(() => unavailable(), false), publicApi());
    renderApp(`/xem-truoc/di-san/${CODE}`);

    await screen.findByRole('heading', { level: 1, name: 'Bản nháp Cố đô Huế' });
    expect(screen.queryByRole('button', { name: 'Xem 3D' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('mô hình của bản nháp không còn (404): quay về bộ ảnh', async () => {
    adminOpener('token-quan-tri');
    mockApi(previewServer(() => unavailable()), publicApi());
    const user = userEvent.setup();
    renderApp(`/xem-truoc/di-san/${CODE}`);

    await user.click(await screen.findByRole('button', { name: 'Xem 3D' }));
    expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();
  });
});
