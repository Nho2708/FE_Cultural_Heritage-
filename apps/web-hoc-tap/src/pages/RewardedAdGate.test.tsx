import type { PublicSummary } from '@dsvhvn/dung-chung/api';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languages';
import { DEVICE_KEY_STORAGE_KEY } from '../lib/guest/deviceKey';
import { adsServer, AD_UNIT, installGoogletag, removeGoogletag, TRANSACTION, type FakeGoogletag } from '../test/adsFixtures';
import { detailOf, HUE, publicApi } from '../test/discoveryFixtures';
import { envelope, mockApi, type FetchCall } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Cổng quảng cáo Google có thưởng ở web học tập: khách bấm "Tóm tắt" hoặc "Nghe" ở di sản chưa mở khóa thì thấy lời mời xem quảng cáo; quảng cáo chỉ chạy sau khi bấm;
// xem đủ thì máy chủ ghi mở khóa 24 giờ và nội dung hiện ra; hết hạn thì hỏi lại; học sinh không thấy quảng cáo. Google Publisher Tag và máy chủ đều là bản giả.

vi.mock('../discovery/LocationMap', () => ({ default: () => <div data-testid="ban-do-nho" /> }));

const DEVICE_KEY = '3f1c2a4e-5b6d-4c8e-9a1b-2c3d4e5f6a7b';
const SUMMARY_TEXT = 'Đoạn chi tiết thứ nhất về Cố đô Huế.';

const summaryOf = (): PublicSummary => ({
  heritageId: 1,
  slug: HUE.slug,
  name: HUE.name,
  localization: { requestedLanguage: 'vi', language: 'vi', isFallback: false, isMachineTranslated: false },
  shortText: 'Kinh thành Huế khởi công năm 1805. Đây là trung tâm của triều Nguyễn.',
  detailedText: `${SUMMARY_TEXT}\n\nĐoạn chi tiết thứ hai về lăng tẩm.`,
});

const base = (path: string) => path.split('?')[0] ?? path;
const adCalls = (calls: FetchCall[]) => calls.filter((call) => base(call.path).startsWith('/public/ads/'));
const callsTo = (calls: FetchCall[], path: string) => calls.filter((call) => base(call.path) === path);
const START = '/public/ads/web/start';
const REWARDED = '/public/ads/web/rewarded';

function setup(server = adsServer(summaryOf()), { guest = true }: { guest?: boolean } = {}) {
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, DEVICE_KEY);
  if (!guest) signInAs();
  const calls = mockApi(
    server.handler,
    publicApi({ [`/public/heritages/${HUE.slug}`]: () => envelope(200, { data: detailOf({ hasSummary: true }) }) }),
  );
  renderApp(`/di-san/${HUE.slug}`);
  return { calls, server };
}

/** Quảng cáo sẵn sàng ngay khi trang gọi `display`; test tự phát các sự kiện tiếp theo. */
const readyOnDisplay = () => (fake: FakeGoogletag) => fake.emit('rewardedSlotReady');

async function openGate(user: ReturnType<typeof userEvent.setup>, button = 'Tóm tắt') {
  await user.click(await screen.findByRole('button', { name: button }));
  return screen.findByRole('dialog', { name: 'TÓM TẮT VÀ THUYẾT MINH' });
}

afterEach(() => {
  removeGoogletag();
});

describe('lời mời xem quảng cáo', () => {
  it('di sản chưa mở khóa: hộp thoại nói rõ xem quảng cáo để mở tóm tắt và nghe thuyết minh trong 24 giờ, không hiện nội dung, chưa nạp quảng cáo nào', async () => {
    installGoogletag();
    const { calls } = setup();
    const user = userEvent.setup();
    const dialog = await openGate(user);

    expect(await within(dialog).findByRole('heading', { name: 'Xem quảng cáo để mở tóm tắt và nghe thuyết minh' })).toBeInTheDocument();
    expect(within(dialog).getByText(/Xem một quảng cáo ngắn để mở tóm tắt và nghe thuyết minh của "Quần thể di tích Cố đô Huế" trong 24 giờ/)).toBeInTheDocument();
    expect(within(dialog).getByText('Xem ảnh, bản đồ, dòng thời gian và mô hình 3D vẫn miễn phí.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Quảng cáo do Google cung cấp/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Xem quảng cáo' })).toBeEnabled();
    expect(screen.queryByText(SUMMARY_TEXT)).not.toBeInTheDocument();
    // Chưa bấm thì chưa xin mã giao dịch, chưa chạm tới máy chủ quảng cáo.
    expect(callsTo(calls, START)).toHaveLength(0);
    expect(callsTo(calls, REWARDED)).toHaveLength(0);
  });

  it('"Để sau" đóng hộp thoại, không xin mã giao dịch, không nạp quảng cáo', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const { calls } = setup();
    const user = userEvent.setup();
    const dialog = await openGate(user);

    await user.click(await within(dialog).findByRole('button', { name: 'Để sau' }));

    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(false));
    expect(callsTo(calls, START)).toHaveLength(0);
    expect(fake.defined).toHaveLength(0);
  });

  it('"Nghe" cũng dẫn tới lời mời; di sản đã mở khóa thì hiện nội dung và không mời', async () => {
    installGoogletag();
    const server = adsServer(summaryOf());
    server.unlockedUntil = Date.now() + 3600_000;
    const { calls } = setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user, 'Nghe');

    expect(await within(dialog).findByRole('tab', { name: 'Nghe', selected: true })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Xem quảng cáo' })).not.toBeInTheDocument();
    expect(callsTo(calls, START)).toHaveLength(0);
  });
});

describe('xem quảng cáo để mở', () => {
  it('bấm "Xem quảng cáo": xin mã giao dịch với mã thiết bị, hiện quảng cáo của Google, hộp thoại nhường chỗ; xem đủ thì báo máy chủ và nội dung hiện ra', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const { calls, server } = setup();
    const user = userEvent.setup();
    const dialog = await openGate(user);

    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));

    await waitFor(() => expect(fake.makeRewardedVisible).toHaveBeenCalledTimes(1));
    const start = callsTo(calls, START)[0]!;
    expect(start.method).toBe('POST');
    expect(start.body).toEqual({ slug: HUE.slug });
    expect(start.deviceKey).toBe(DEVICE_KEY);
    expect(fake.defined).toEqual([{ path: AD_UNIT, format: 'REWARDED' }]);
    // Quảng cáo hiện trên trang: hộp thoại ở lớp trên cùng phải đóng để không che nó.
    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(false));
    expect(callsTo(calls, REWARDED)).toHaveLength(0);

    // Google cấp thưởng rồi khách đóng quảng cáo.
    act(() => fake.emit('rewardedSlotGranted'));
    expect(callsTo(calls, REWARDED)).toHaveLength(0);
    act(() => fake.emit('rewardedSlotClosed'));

    await waitFor(() => expect(callsTo(calls, REWARDED)).toHaveLength(1));
    const report = callsTo(calls, REWARDED)[0]!;
    expect(report.body).toEqual({ slug: HUE.slug, transactionId: TRANSACTION, adUnit: AD_UNIT });
    expect(report.deviceKey).toBe(DEVICE_KEY);
    expect(server.unlockedUntil).toBeGreaterThan(Date.now());

    expect(await screen.findByText(SUMMARY_TEXT)).toBeInTheDocument();
    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(true));
    expect(screen.queryByRole('heading', { name: 'Xem quảng cáo để mở tóm tắt và nghe thuyết minh' })).not.toBeInTheDocument();
    // Gọn gàng sau khi xong: ô quảng cáo bị hủy, không còn bộ lắng nghe nào; quảng cáo không cá nhân hóa.
    expect(fake.destroySlots).toHaveBeenCalled();
    expect(fake.listenerCount()).toBe(0);
    expect(fake.setPrivacySettings).toHaveBeenCalledWith({ nonPersonalizedAds: true });
  });

  it('đóng quảng cáo khi chưa được cấp thưởng: báo chưa xem hết, không báo máy chủ, cho xem lại', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const { calls } = setup();
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));
    await waitFor(() => expect(fake.makeRewardedVisible).toHaveBeenCalled());

    act(() => fake.emit('rewardedSlotClosed'));

    expect(await within(dialog).findByText(/Bạn chưa xem hết quảng cáo nên chưa mở được tóm tắt/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Xem lại quảng cáo' })).toBeEnabled();
    expect(callsTo(calls, REWARDED)).toHaveLength(0);
    expect(screen.queryByText(SUMMARY_TEXT)).not.toBeInTheDocument();
    expect(fake.listenerCount()).toBe(0);
  });

  it('Google không có quảng cáo để hiện: báo thử lại sau, không báo máy chủ', async () => {
    const fake = installGoogletag({ onDisplay: (f) => f.emit('slotRenderEnded', { isEmpty: true }) });
    const { calls } = setup();
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));

    expect(await within(dialog).findByText(/Hiện chưa có quảng cáo để hiện/)).toBeInTheDocument();
    expect(fake.makeRewardedVisible).not.toHaveBeenCalled();
    expect(callsTo(calls, REWARDED)).toHaveLength(0);
  });

  it('thiết bị không hiện được quảng cáo có thưởng: báo rõ và gợi ý dùng điện thoại hoặc app', async () => {
    installGoogletag({ unsupported: true });
    const { calls } = setup();
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));

    expect(await within(dialog).findByText(/chưa hiện được quảng cáo có thưởng/)).toBeInTheDocument();
    expect(callsTo(calls, REWARDED)).toHaveLength(0);
  });

  it('môi trường không có đơn vị quảng cáo cho web (422): báo chưa có quảng cáo, không nạp thư viện của Google', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const server = adsServer(summaryOf(), {
      start: () => envelope(422, { errorCode: 'AD_UNAVAILABLE', message: 'Hiện chưa có quảng cáo để hiện. Bạn hãy thử lại sau ít phút.' }),
    });
    setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));

    expect(await within(dialog).findByText(/Hiện chưa có quảng cáo để hiện/)).toBeInTheDocument();
    expect(fake.defined).toHaveLength(0);
  });

  it('máy chủ từ chối phần thưởng (400): báo chưa mở được, cho xem lại', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const server = adsServer(summaryOf(), { rewarded: () => envelope(400, { errorCode: 'AD_REWARD_REJECTED', message: 'Chưa mở được tóm tắt.' }) });
    setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));
    await waitFor(() => expect(fake.makeRewardedVisible).toHaveBeenCalled());
    act(() => {
      fake.emit('rewardedSlotGranted');
      fake.emit('rewardedSlotClosed');
    });

    expect(await within(dialog).findByText(/Chưa mở được tóm tắt\. Bạn hãy xem hết quảng cáo hoặc thử lại sau ít phút/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Xem lại quảng cáo' })).toBeEnabled();
    expect(screen.queryByText(SUMMARY_TEXT)).not.toBeInTheDocument();
  });

  it('xem quá nhiều quảng cáo (429): báo thử lại sau ít phút', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const server = adsServer(summaryOf(), { rewarded: () => envelope(429, { errorCode: 'AD_REWARD_RATE_LIMITED', message: 'Bạn đã xem quá nhiều quảng cáo.' }) });
    setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));
    await waitFor(() => expect(fake.makeRewardedVisible).toHaveBeenCalled());
    act(() => {
      fake.emit('rewardedSlotGranted');
      fake.emit('rewardedSlotClosed');
    });

    expect(await within(dialog).findByText(/Bạn đã xem quá nhiều quảng cáo trong thời gian ngắn\. Hãy thử lại sau ít phút/)).toBeInTheDocument();
  });

  it('mất mạng lúc báo thưởng: giữ mã giao dịch, "Gửi lại" báo lại mà không bắt xem quảng cáo lần nữa', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    let failing = true;
    const server = adsServer(summaryOf());
    const original = server.handler;
    server.handler = (call) => (base(call.path) === REWARDED && failing ? new Response('lỗi', { status: 502 }) : original(call));
    const { calls } = setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));
    await waitFor(() => expect(fake.makeRewardedVisible).toHaveBeenCalled());
    act(() => {
      fake.emit('rewardedSlotGranted');
      fake.emit('rewardedSlotClosed');
    });

    expect(await within(dialog).findByText(/Chưa báo được cho máy chủ là bạn đã xem xong quảng cáo/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Xem quảng cáo|Xem lại quảng cáo/ })).not.toBeInTheDocument();

    failing = false;
    await user.click(within(dialog).getByRole('button', { name: 'Gửi lại' }));

    expect(await screen.findByText(SUMMARY_TEXT)).toBeInTheDocument();
    const reports = callsTo(calls, REWARDED);
    expect(reports).toHaveLength(2);
    expect(reports[1]!.body).toEqual(reports[0]!.body);
    expect(callsTo(calls, START)).toHaveLength(1);
    expect(fake.defined).toHaveLength(1);
  });

  it('máy chủ báo di sản đã mở khóa lúc bắt đầu (tab khác vừa xem xong): không chạy quảng cáo, hiện nội dung', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const server = adsServer(summaryOf());
    server.start = () => {
      server.unlockedUntil = Date.now() + 3600_000;
      return envelope(200, {
        data: { alreadyUnlocked: true, transactionId: null, transactionExpiresAt: null, adUnitPath: null, status: { heritageId: 1, slug: HUE.slug, gateRequired: true, unlocked: true, expiresAt: null, openReason: null } },
      });
    };
    const { calls } = setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Xem quảng cáo' }));

    expect(await screen.findByText(SUMMARY_TEXT)).toBeInTheDocument();
    expect(fake.defined).toHaveLength(0);
    expect(callsTo(calls, REWARDED)).toHaveLength(0);
  });
});

describe('hết hạn mở khóa', () => {
  it('khách thấy dòng "Đã mở khóa đến {giờ}" khi di sản còn mở khóa (học sinh không có dòng này, xem test bên dưới)', async () => {
    installGoogletag();
    const server = adsServer(summaryOf());
    server.unlockedUntil = new Date('2026-10-08T07:05:00Z').getTime() + 10 * 365 * 24 * 3600_000;
    setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);

    expect(await within(dialog).findByText(/Đã mở khóa đến .*2036/)).toBeInTheDocument();
  });

  it('đúng hạn thì hộp thoại đang mở quay về lời mời xem quảng cáo, nội dung cũ biến mất', async () => {
    installGoogletag();
    const server = adsServer(summaryOf());
    server.unlockedUntil = Date.now() + 1200;
    setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);

    expect(await within(dialog).findByText(SUMMARY_TEXT)).toBeInTheDocument();
    expect(await within(dialog).findByRole('heading', { name: 'Xem quảng cáo để mở tóm tắt và nghe thuyết minh' }, { timeout: 4000 })).toBeInTheDocument();
    expect(within(dialog).queryByText(SUMMARY_TEXT)).not.toBeInTheDocument();
  });

  it('đóng rồi mở lại sau khi hết hạn: hỏi lại máy chủ và thấy lời mời, không hiện nội dung đã giữ', async () => {
    installGoogletag();
    const server = adsServer(summaryOf());
    server.unlockedUntil = Date.now() + 3600_000;
    setup(server);
    const user = userEvent.setup();
    const dialog = await openGate(user);
    expect(await within(dialog).findByText(SUMMARY_TEXT)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect((dialog as HTMLDialogElement).open).toBe(false));

    server.unlockedUntil = 0;
    await user.click(screen.getByRole('button', { name: 'Tóm tắt' }));

    expect(await screen.findByRole('heading', { name: 'Xem quảng cáo để mở tóm tắt và nghe thuyết minh' })).toBeInTheDocument();
    expect(screen.queryByText(SUMMARY_TEXT)).not.toBeInTheDocument();
  });
});

describe('học sinh và ngôn ngữ', () => {
  it('học sinh đã đăng nhập mở tóm tắt thẳng: không gọi API quảng cáo nào, không nạp thư viện quảng cáo', async () => {
    const fake = installGoogletag({ onDisplay: readyOnDisplay() });
    const { calls } = setup(adsServer(summaryOf()), { guest: false });
    const user = userEvent.setup();
    await openGate(user);

    expect(await screen.findByText(SUMMARY_TEXT)).toBeInTheDocument();
    // Máy chủ nhận ra học sinh theo phiên đăng nhập: yêu cầu tóm tắt mang token, không mang mã thiết bị.
    const summaryCall = calls.find((c) => base(c.path) === `/public/heritages/${HUE.slug}/summary`)!;
    expect(summaryCall.authorization).toBe('Bearer access-hoc-sinh');
    expect(summaryCall.deviceKey).toBeUndefined();
    expect(screen.queryByText(/Đã mở khóa đến/)).not.toBeInTheDocument();
    expect(adCalls(calls)).toEqual([]);
    expect(fake.defined).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /quảng cáo/i })).not.toBeInTheDocument();
  });

  it('khách (chưa đăng nhập) gửi tóm tắt không kèm token, chỉ kèm mã thiết bị', async () => {
    installGoogletag();
    const { calls } = setup();
    const user = userEvent.setup();
    await openGate(user);

    await screen.findByRole('heading', { name: 'Xem quảng cáo để mở tóm tắt và nghe thuyết minh' });
    const summaryCall = calls.find((c) => base(c.path) === `/public/heritages/${HUE.slug}/summary`)!;
    expect(summaryCall.authorization).toBeUndefined();
    expect(summaryCall.deviceKey).toBe(DEVICE_KEY);
  });

  it('khách chọn tiếng Anh thì lời mời, nút và lời giải thích bằng tiếng Anh', async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    installGoogletag();
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Summary' }));
    const dialog = await screen.findByRole('dialog');

    expect(await within(dialog).findByRole('heading', { name: 'Watch an ad to unlock the summary and audio guide' })).toBeInTheDocument();
    expect(within(dialog).getByText(/for 24 hours on this device/)).toBeInTheDocument();
    expect(within(dialog).getByText('Photos, the map, the timeline and the 3D model stay free.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Not now' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Watch an ad' })).toBeEnabled();
    expect(within(dialog).getByText(/Ads are provided by Google and are not personalized/)).toBeInTheDocument();
  });
});
