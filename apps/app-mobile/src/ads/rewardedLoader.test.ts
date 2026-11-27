import { createRewardedLoader, errorReason, LOADED_AD_MAX_AGE_MS, type RewardedAdInstance, type RewardedAdsApi } from './rewardedLoader';

// Mô-đun quảng cáo giả: mỗi quảng cáo ghi lại số lần tải, chiếu, hủy; bài kiểm thử tự phát sự kiện LOADED, ERROR, EARNED_REWARD, CLOSED.
class FakeAd implements RewardedAdInstance {
  listeners = new Map<string, Set<(payload?: unknown) => void>>();
  loads = 0;
  shows = 0;
  destroyed = false;
  constructor(readonly unitId: string, readonly options: Record<string, unknown>) {}
  addAdEventListener(type: string, listener: (payload?: unknown) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    return () => set.delete(listener);
  }
  emit(type: string, payload?: unknown) {
    [...(this.listeners.get(type) ?? [])].forEach((listener) => listener(payload));
  }
  load() {
    this.loads += 1;
  }
  async show() {
    this.shows += 1;
  }
  destroy() {
    this.destroyed = true;
  }
}

function setup() {
  const created: FakeAd[] = [];
  let clock = 0;
  const api: RewardedAdsApi = {
    RewardedAd: {
      createForAdRequest: (unitId, options) => {
        const ad = new FakeAd(unitId, options);
        created.push(ad);
        return ad;
      },
    },
    RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned' },
    AdEventType: { CLOSED: 'closed', ERROR: 'error' },
  };
  const loader = createRewardedLoader(api, () => clock);
  const ad = (index: number) => {
    const found = created[index];
    if (!found) throw new Error(`chưa tạo quảng cáo thứ ${index + 1}`);
    return found;
  };
  return { loader, created, ad, advance: (ms: number) => (clock += ms) };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Chiếu xong theo kịch bản xem đủ: được thưởng rồi đóng. */
async function watchToEnd(ad: FakeAd) {
  await flush();
  ad.emit('earned');
  ad.emit('closed');
}

describe('tải trước và chiếu quảng cáo có thưởng', () => {
  it('dùng lại quảng cáo đã tải sẵn, gắn mã thiết bị và mã di sản để Google xác minh', async () => {
    const { loader, created, ad } = setup();
    loader.preload('unit', 'device', 12);
    loader.preload('unit', 'device', 12);
    ad(0).emit('loaded');
    const outcome = loader.show('unit', 'device', 12);
    await watchToEnd(ad(0));
    expect(await outcome).toBe('earned');
    expect(created).toHaveLength(1);
    expect(ad(0).options).toEqual({ serverSideVerificationOptions: { userId: 'device', customData: '12' } });
    expect(ad(0).shows).toBe(1);
    expect(ad(0).destroyed).toBe(true);
  });

  it('bấm xem khi quảng cáo đang tải thì chờ lượt tải đó, không tải lại', async () => {
    const { loader, created, ad } = setup();
    loader.preload('unit', 'device', 12);
    const outcome = loader.show('unit', 'device', 12);
    await flush();
    expect(ad(0).shows).toBe(0);
    ad(0).emit('loaded');
    await watchToEnd(ad(0));
    expect(await outcome).toBe('earned');
    expect(created).toHaveLength(1);
  });

  it('tải hỏng vì hết hạn (lỗi nội bộ) thì tự thử lại một lần', async () => {
    const { loader, created, ad } = setup();
    const outcome = loader.show('unit', 'device', 12);
    ad(0).emit('error', { code: 'googleMobileAds/internal-error', reason: 'internal-error' });
    await flush();
    expect(created).toHaveLength(2);
    expect(ad(0).destroyed).toBe(true);
    ad(1).emit('loaded');
    await watchToEnd(ad(1));
    expect(await outcome).toBe('earned');
  });

  it('hỏng hai lần liền thì báo hỏng, không thử thêm', async () => {
    const { loader, created, ad } = setup();
    const outcome = loader.show('unit', 'device', 12);
    ad(0).emit('error', { reason: 'network-error' });
    await flush();
    ad(1).emit('error', { reason: 'internal-error' });
    expect(await outcome).toBe('failed');
    expect(created).toHaveLength(2);
  });

  it('Google không có quảng cáo thì báo ngay, không thử lại', async () => {
    const { loader, created, ad } = setup();
    const outcome = loader.show('unit', 'device', 12);
    ad(0).emit('error', { code: 'googleMobileAds/no-fill' });
    expect(await outcome).toBe('noFill');
    expect(created).toHaveLength(1);
  });

  it('khách đóng quảng cáo trước khi được thưởng', async () => {
    const { loader, ad } = setup();
    const outcome = loader.show('unit', 'device', 12);
    ad(0).emit('loaded');
    await flush();
    ad(0).emit('closed');
    expect(await outcome).toBe('closed');
  });

  it('chuyển sang di sản khác thì bỏ quảng cáo của di sản trước', () => {
    const { loader, created, ad } = setup();
    loader.preload('unit', 'device', 12);
    loader.preload('unit', 'device', 13);
    expect(created).toHaveLength(2);
    expect(ad(0).destroyed).toBe(true);
    expect(ad(1).options).toEqual({ serverSideVerificationOptions: { userId: 'device', customData: '13' } });
  });

  it('quảng cáo tải sẵn quá lâu thì bỏ và tải lại', async () => {
    const { loader, ad, advance } = setup();
    loader.preload('unit', 'device', 12);
    ad(0).emit('loaded');
    advance(LOADED_AD_MAX_AGE_MS + 1);
    const outcome = loader.show('unit', 'device', 12);
    expect(ad(0).destroyed).toBe(true);
    ad(1).emit('loaded');
    await watchToEnd(ad(1));
    expect(await outcome).toBe('earned');
  });

  it('tải sẵn hỏng thì bỏ, lần bấm sau tải mới', async () => {
    const { loader, created, ad } = setup();
    loader.preload('unit', 'device', 12);
    ad(0).emit('error', { reason: 'no-fill' });
    await flush();
    expect(ad(0).destroyed).toBe(true);
    const outcome = loader.show('unit', 'device', 12);
    expect(created).toHaveLength(2);
    ad(1).emit('loaded');
    await watchToEnd(ad(1));
    expect(await outcome).toBe('earned');
  });

  it('tải sẵn hỏng vì hết hạn thì tự tải lại một lần, bấm xem thì dùng lượt tải lại đó', async () => {
    const { loader, created, ad } = setup();
    loader.preload('unit', 'device', 12);
    ad(0).emit('error', { reason: 'internal-error' });
    await flush();
    expect(ad(0).destroyed).toBe(true);
    expect(created).toHaveLength(2);
    const outcome = loader.show('unit', 'device', 12);
    ad(1).emit('loaded');
    await watchToEnd(ad(1));
    expect(await outcome).toBe('earned');
    expect(created).toHaveLength(2);
  });

  it('lượt tải lại của tải sẵn cũng hỏng thì bấm xem không tải thêm lần nữa', async () => {
    const { loader, created, ad } = setup();
    loader.preload('unit', 'device', 12);
    ad(0).emit('error', { reason: 'internal-error' });
    await flush();
    const outcome = loader.show('unit', 'device', 12);
    ad(1).emit('error', { reason: 'internal-error' });
    expect(await outcome).toBe('failed');
    expect(created).toHaveLength(2);
  });

  it('chiếu không được thì báo hỏng', async () => {
    const { loader, ad } = setup();
    const outcome = loader.show('unit', 'device', 12);
    ad(0).emit('loaded');
    await flush();
    ad(0).emit('error', { reason: 'internal-error' });
    expect(await outcome).toBe('failed');
    expect(ad(0).destroyed).toBe(true);
  });
});

describe('lý do lỗi của thư viện quảng cáo', () => {
  it('ưu tiên reason, không có thì suy từ code', () => {
    expect(errorReason({ reason: 'no-fill', code: 'googleMobileAds/internal-error' })).toBe('no-fill');
    expect(errorReason({ code: 'googleMobileAds/error-code-no-fill' })).toBe('no-fill');
    expect(errorReason(undefined)).toBe('unknown');
  });
});
