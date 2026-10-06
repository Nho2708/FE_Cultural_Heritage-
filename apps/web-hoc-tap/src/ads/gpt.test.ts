import { afterEach, describe, expect, it, vi } from 'vitest';
import { installGoogletag, removeGoogletag } from '../test/adsFixtures';
import { loadGpt, playRewardedAd } from './gpt';

// Google Publisher Tag: nạp thư viện đúng một lần và chỉ khi được gọi, kết quả của từng lượt quảng cáo có thưởng, gỡ sạch sự kiện khi xong hoặc khi hủy.

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.head.querySelectorAll('script[src*="doubleclick"]').forEach((script) => script.remove());
  removeGoogletag();
});

/** Chặn việc chèn thẻ script (jsdom không tải script ngoài) và cho test quyết định nạp được hay lỗi. */
function interceptScripts() {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
    if (node instanceof HTMLScriptElement) scripts.push(node);
    return node;
  });
  return scripts;
}

describe('nạp thư viện', () => {
  it('chưa ai gọi thì không nạp gì; gọi thì chèn đúng một thẻ script của Google, gọi nhiều lần vẫn một thẻ', async () => {
    const scripts = interceptScripts();
    expect(scripts).toHaveLength(0);

    const first = loadGpt();
    const second = loadGpt();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.src).toBe('https://securepubads.g.doubleclick.net/tag/js/gpt.js');
    expect(scripts[0]!.async).toBe(true);

    // Thư viện nạp xong: API sẵn sàng và xử lý hàng đợi lệnh.
    const fake = installGoogletag();
    scripts[0]!.onload?.(new Event('load'));
    await expect(first).resolves.toBe(fake.tag);
    await expect(second).resolves.toBe(fake.tag);
  });

  it('API đã sẵn sàng thì dùng ngay, không chèn thẻ script', async () => {
    const scripts = interceptScripts();
    const fake = installGoogletag();
    await expect(loadGpt()).resolves.toBe(fake.tag);
    expect(scripts).toHaveLength(0);
  });

  it('nạp lỗi (mất mạng, trình chặn quảng cáo) thì lượt quảng cáo báo "blocked"; lần bấm sau thử nạp lại', async () => {
    const scripts = interceptScripts();
    const play = playRewardedAd('/1/test');
    scripts[0]!.onerror?.(new Event('error'));
    await expect(play.result).resolves.toBe('blocked');

    const again = playRewardedAd('/1/test');
    expect(scripts).toHaveLength(2);
    scripts[1]!.onerror?.(new Event('error'));
    await expect(again.result).resolves.toBe('blocked');
  });
});

describe('một lượt quảng cáo có thưởng', () => {
  it('xem đủ rồi đóng thì "granted"; đóng khi chưa được cấp thưởng thì "closed"; cả hai gỡ hết sự kiện và hủy ô quảng cáo', async () => {
    const fake = installGoogletag({ onDisplay: (f) => f.emit('rewardedSlotReady') });
    const onVisible = vi.fn<() => void>();
    const granted = playRewardedAd('/1/test', { onVisible });
    await vi.waitFor(() => expect(onVisible).toHaveBeenCalledTimes(1));
    fake.emit('rewardedSlotGranted');
    fake.emit('rewardedSlotClosed');
    await expect(granted.result).resolves.toBe('granted');
    expect(fake.listenerCount()).toBe(0);
    expect(fake.destroySlots).toHaveBeenCalledTimes(1);

    const second = installGoogletag({ onDisplay: (f) => f.emit('rewardedSlotReady') });
    const closed = playRewardedAd('/1/test');
    await vi.waitFor(() => expect(second.makeRewardedVisible).toHaveBeenCalled());
    second.emit('rewardedSlotClosed');
    await expect(closed.result).resolves.toBe('closed');
    expect(second.listenerCount()).toBe(0);
  });

  it('không có quảng cáo để hiện thì "noFill"; ô quảng cáo không dựng được thì "unsupported"; quảng cáo không bật được thì "unsupported"', async () => {
    installGoogletag({ onDisplay: (f) => f.emit('slotRenderEnded', { isEmpty: true }) });
    await expect(playRewardedAd('/1/test').result).resolves.toBe('noFill');

    installGoogletag({ unsupported: true });
    await expect(playRewardedAd('/1/test').result).resolves.toBe('unsupported');

    const fake = installGoogletag({ onDisplay: (f) => f.emit('rewardedSlotReady') });
    fake.makeRewardedVisible.mockReturnValue(false);
    await expect(playRewardedAd('/1/test').result).resolves.toBe('unsupported');
  });

  it('ô quảng cáo có kết xuất nhưng không rỗng thì không coi là hết quảng cáo; chờ quá lâu thì "timeout"', async () => {
    vi.useFakeTimers();
    const fake = installGoogletag({ onDisplay: (f) => f.emit('slotRenderEnded', { isEmpty: false }) });
    const play = playRewardedAd('/1/test', { timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(4999);
    let outcome: string | undefined;
    void play.result.then((value) => (outcome = value));
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome).toBe('timeout');
    expect(fake.listenerCount()).toBe(0);
  });

  it('sự kiện của ô quảng cáo khác bị bỏ qua', async () => {
    const fake = installGoogletag({ onDisplay: (f) => f.emit('rewardedSlotReady') });
    const play = playRewardedAd('/1/test');
    await vi.waitFor(() => expect(fake.makeRewardedVisible).toHaveBeenCalled());
    fake.emit('rewardedSlotClosed', { slot: { khac: true } });
    let outcome: string | undefined;
    void play.result.then((value) => (outcome = value));
    await Promise.resolve();
    expect(outcome).toBeUndefined();
    fake.emit('rewardedSlotClosed');
    await expect(play.result).resolves.toBe('closed');
  });

  it('quảng cáo đóng xong thì dấu #goog_rewarded của Google được gỡ khỏi địa chỉ trang, trạng thái lịch sử giữ nguyên', async () => {
    vi.useFakeTimers();
    window.history.replaceState({ idx: 3, key: 'abc' }, '', '/di-san/co-do-hue#goog_rewarded');
    const fake = installGoogletag({ onDisplay: (f) => f.emit('rewardedSlotReady') });
    const play = playRewardedAd('/1/test');
    await vi.advanceTimersByTimeAsync(0);
    fake.emit('rewardedSlotClosed');
    await expect(play.result).resolves.toBe('closed');
    // Chưa tới lúc dọn: Google còn đang đóng.
    expect(window.location.hash).toBe('#goog_rewarded');
    await vi.advanceTimersByTimeAsync(600);
    expect(window.location.pathname + window.location.hash).toBe('/di-san/co-do-hue');
    expect(window.history.state).toEqual({ idx: 3, key: 'abc' });
    window.history.replaceState(null, '', '/');
  });

  it('hủy giữa chừng (rời trang) thì gỡ sự kiện và hủy ô quảng cáo', async () => {
    const fake = installGoogletag({ onDisplay: (f) => f.emit('rewardedSlotReady') });
    const play = playRewardedAd('/1/test');
    await vi.waitFor(() => expect(fake.makeRewardedVisible).toHaveBeenCalled());
    play.cancel();
    expect(fake.listenerCount()).toBe(0);
    expect(fake.destroySlots).toHaveBeenCalledTimes(1);
  });
});
