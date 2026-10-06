// Google Publisher Tag (Ad Manager) cho quảng cáo có thưởng trên web: nạp thư viện của Google khi khách chủ động bấm "Xem quảng cáo", dựng một ô quảng cáo
// có thưởng ngoài trang, chờ sự kiện của Google và trả kết quả. Mã đơn vị quảng cáo do máy chủ cấp (đơn vị thử của Google khi phát triển), không viết cứng ở đây.
// Thư viện chỉ nạp ở lần bấm đầu tiên: khách không xem quảng cáo thì trang không gọi tới máy chủ quảng cáo nào.

const GPT_SRC = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';

/** Chờ quảng cáo sẵn sàng hoặc báo rỗng tối đa chừng này; quá thì coi là tải không được. */
export const READY_TIMEOUT_MS = 15_000;

interface GptSlot {
  addService(service: GptPubAds): GptSlot;
}

interface GptEvent {
  slot: GptSlot;
}

interface RewardedReadyEvent extends GptEvent {
  makeRewardedVisible(): boolean;
}

interface RenderEndedEvent extends GptEvent {
  isEmpty: boolean;
}

interface EventMap {
  rewardedSlotReady: RewardedReadyEvent;
  rewardedSlotGranted: GptEvent;
  rewardedSlotClosed: GptEvent;
  slotRenderEnded: RenderEndedEvent;
}

type Listener<K extends keyof EventMap> = (event: EventMap[K]) => void;

interface GptPubAds {
  addEventListener<K extends keyof EventMap>(type: K, listener: Listener<K>): GptPubAds;
  removeEventListener<K extends keyof EventMap>(type: K, listener: Listener<K>): void;
  setPrivacySettings?(settings: { nonPersonalizedAds?: boolean }): GptPubAds;
}

export interface GoogleTag {
  apiReady?: boolean;
  cmd: Array<() => void> | { push(callback: () => void): void };
  enums: { OutOfPageFormat: { REWARDED: unknown } };
  defineOutOfPageSlot(adUnitPath: string, format: unknown): GptSlot | null;
  pubads(): GptPubAds;
  enableServices(): void;
  display(slot: GptSlot): void;
  destroySlots(slots?: GptSlot[]): boolean;
}

declare global {
  interface Window {
    googletag?: Partial<GoogleTag>;
  }
}

/** Google đặt dấu này vào địa chỉ trang khi hiện quảng cáo có thưởng (để nút Quay lại đóng được quảng cáo) và không gỡ sau khi quảng cáo đóng. */
const REWARDED_HASH = '#goog_rewarded';
const HASH_CLEANUP_DELAY_MS = 500;

/** Gỡ dấu của quảng cáo khỏi địa chỉ trang sau khi quảng cáo đã đóng, giữ nguyên trạng thái lịch sử của bộ định tuyến. */
function removeRewardedHash() {
  if (window.location.hash !== REWARDED_HASH) return;
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
}

let loading: Promise<GoogleTag> | null = null;

function ready(): GoogleTag | null {
  const tag = window.googletag;
  return tag?.apiReady ? (tag as GoogleTag) : null;
}

/** Nạp Google Publisher Tag một lần cho cả trang. Lỗi (mạng, trình chặn quảng cáo) thì thử lại được ở lần bấm sau. */
export function loadGpt(): Promise<GoogleTag> {
  const existing = ready();
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;
  loading = new Promise<GoogleTag>((resolve, reject) => {
    window.googletag = window.googletag ?? {};
    window.googletag.cmd = window.googletag.cmd ?? [];
    const script = document.createElement('script');
    script.async = true;
    script.src = GPT_SRC;
    script.onload = () => {
      // Thư viện xử lý hàng đợi `cmd` khi nạp xong; chờ cho tới khi API sẵn sàng.
      const tag = window.googletag as GoogleTag;
      tag.cmd.push(() => resolve(window.googletag as GoogleTag));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Không tải được thư viện quảng cáo.'));
    };
    document.head.appendChild(script);
  }).finally(() => {
    // Chỉ giữ lời hứa khi đang nạp: nạp xong thì `ready()` trả thẳng API, nạp lỗi thì lần bấm sau thử lại.
    loading = null;
  });
  return loading;
}

/**
 * Kết quả của một lượt quảng cáo có thưởng:
 * - `granted`: khách xem đủ và Google cấp thưởng (báo sau khi khách đóng quảng cáo);
 * - `closed`: khách đóng khi chưa được cấp thưởng;
 * - `noFill`: Google không có quảng cáo để hiện;
 * - `unsupported`: thiết bị hoặc trang này không hiện được quảng cáo có thưởng;
 * - `blocked`: không nạp được thư viện (mất mạng, trình chặn quảng cáo);
 * - `timeout`: chờ quá lâu mà quảng cáo không sẵn sàng.
 */
export type RewardedOutcome = 'granted' | 'closed' | 'noFill' | 'unsupported' | 'blocked' | 'timeout';

export interface RewardedHandle {
  result: Promise<RewardedOutcome>;
  /** Hủy khi rời trang hoặc đóng hộp thoại: gỡ sự kiện và hủy ô quảng cáo. Gọi sau khi xong cũng được. */
  cancel(): void;
}

interface PlayOptions {
  /** Gọi khi quảng cáo bắt đầu hiện trên màn hình (hộp thoại của trang phải nhường chỗ: lớp trên cùng của hộp thoại che mất quảng cáo). */
  onVisible?: () => void;
  timeoutMs?: number;
}

/**
 * Hiện một quảng cáo có thưởng ở đơn vị `adUnitPath`. Gọi sau khi khách đã chủ động đồng ý xem (bấm "Xem quảng cáo"): quảng cáo hiện ngay khi sẵn sàng.
 * Chỉ yêu cầu quảng cáo không cá nhân hóa: web chưa có hộp đồng ý quyền riêng tư của Google, nên không dùng dữ liệu cá nhân để chọn quảng cáo.
 */
export function playRewardedAd(adUnitPath: string, { onVisible, timeoutMs = READY_TIMEOUT_MS }: PlayOptions = {}): RewardedHandle {
  let cleanup: () => void = () => undefined;
  let cancelled = false;
  let settle: (outcome: RewardedOutcome) => void = () => undefined;
  const result = new Promise<RewardedOutcome>((resolve) => {
    settle = resolve;
  });

  void loadGpt().then(
    (googletag) => {
      if (cancelled) return;
      googletag.cmd.push(() => {
        if (cancelled) return;
        const slot = googletag.defineOutOfPageSlot(adUnitPath, googletag.enums.OutOfPageFormat.REWARDED);
        if (!slot) {
          settle('unsupported');
          return;
        }
        const pubads = googletag.pubads();
        let granted = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const mine = (event: GptEvent) => event.slot === slot;

        const onReady: Listener<'rewardedSlotReady'> = (event) => {
          if (!mine(event)) return;
          clearTimeout(timer);
          if (event.makeRewardedVisible()) onVisible?.();
          else settle('unsupported');
        };
        const onGranted: Listener<'rewardedSlotGranted'> = (event) => {
          if (mine(event)) granted = true;
        };
        const onClosed: Listener<'rewardedSlotClosed'> = (event) => {
          if (mine(event)) settle(granted ? 'granted' : 'closed');
        };
        const onRendered: Listener<'slotRenderEnded'> = (event) => {
          if (mine(event) && event.isEmpty) settle('noFill');
        };

        cleanup = () => {
          clearTimeout(timer);
          pubads.removeEventListener('rewardedSlotReady', onReady);
          pubads.removeEventListener('rewardedSlotGranted', onGranted);
          pubads.removeEventListener('rewardedSlotClosed', onClosed);
          pubads.removeEventListener('slotRenderEnded', onRendered);
          googletag.destroySlots([slot]);
        };

        slot.addService(pubads);
        pubads.setPrivacySettings?.({ nonPersonalizedAds: true });
        pubads.addEventListener('rewardedSlotReady', onReady);
        pubads.addEventListener('rewardedSlotGranted', onGranted);
        pubads.addEventListener('rewardedSlotClosed', onClosed);
        pubads.addEventListener('slotRenderEnded', onRendered);
        timer = setTimeout(() => settle('timeout'), timeoutMs);
        googletag.enableServices();
        googletag.display(slot);
      });
    },
    () => settle('blocked'),
  );

  void result.then(() => {
    cleanup();
    // Chờ Google đóng xong phần của nó rồi mới dọn địa chỉ, để hai bên không giẫm lên nhau.
    setTimeout(removeRewardedHash, HASH_CLEANUP_DELAY_MS);
  });
  return {
    result,
    cancel: () => {
      cancelled = true;
      cleanup();
      settle('closed');
    },
  };
}
