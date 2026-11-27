// Giọng đọc tiếng Việt:
// 1. Giọng do máy chủ tạo (qua Backend API /tts): chỉ có khi đã đăng nhập; chữ mới có thể mất vài giây để tạo, lần sau có ngay.
// 2. Máy chủ chưa trả tiếng (chưa đăng nhập, dịch vụ giọng tắt, quá chậm, mất mạng) thì lùi về giọng của trình duyệt, nhưng CHỈ khi trình duyệt có giọng
//    tiếng Việt. Máy không có giọng tiếng Việt thì không đọc bằng giọng khác (giọng tiếng Anh đọc chữ Việt nghe sai hoàn toàn) mà báo ngắn một lần.

import { createApiClient, type ApiClient, createTtsApi } from '../api';
import { resolveFileUrl } from '../files';
import { createSpeechPrefetcher, isSpeakableText, normalizeSpeechText } from '../speech/ttsPrefetch';

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

function isVietnameseVoice(voice: SpeechSynthesisVoice): boolean {
  const lang = (voice.lang || '').replaceAll('_', '-').toLowerCase();
  return lang === 'vi' || lang.startsWith('vi-');
}

export function getBestVietnameseVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;

  const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices?.() ?? []);

  // Chỉ lấy các giọng có mã ngôn ngữ tiếng Việt (vi, vi-VN, vi_VN)
  const viVoices = voices.filter(isVietnameseVoice);

  if (viVoices.length === 0) {
    return undefined;
  }

  // 1. Ưu tiên giọng Nữ Natural / Neural của Microsoft Edge (Microsoft HoaiMy Online Natural)
  const femaleNatural = viVoices.find((v) => /natural|neural/i.test(v.name) && /hoaimy|female|nữ|woman/i.test(v.name));
  if (femaleNatural) return femaleNatural;

  // 2. Ưu tiên giọng Nữ bất kỳ
  const female = viVoices.find((v) => /female|nữ|woman|hoaimy/i.test(v.name));
  if (female) return female;

  // 3. Ưu tiên giọng Natural / Neural khác (NamMinh Online Natural)
  const natural = viVoices.find((v) => /natural|neural/i.test(v.name));
  if (natural) return natural;

  // 4. Ưu tiên giọng Google Vietnamese
  const google = viVoices.find((v) => /google/i.test(v.name));
  if (google) return google;

  // 5. Ưu tiên giọng tiếng Việt khác không phải Microsoft An (SAPI5 offline cũ)
  const nonAn = viVoices.find((v) => !/\ban\b/i.test(v.name));
  if (nonAn) return nonAn;

  return viVoices[0];
}

/** Trình duyệt có giọng tiếng Việt không (bản tin biết lúc gọi; trình duyệt nạp danh sách giọng chậm thì xem `waitForVoices`). */
export function hasVietnameseVoice(): boolean {
  return getBestVietnameseVoice() !== undefined;
}

/** Thời gian chờ tối đa trình duyệt nạp danh sách giọng khi danh sách còn rỗng (Chrome nạp chậm ở lần gọi đầu). */
const VOICES_WAIT_MS = 1000;

/** Trình duyệt đã nạp danh sách giọng (có ít nhất một giọng) hoặc không có Web Speech để chờ. */
function voicesLoaded(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return true;
  return cachedVoices.length > 0 || (window.speechSynthesis.getVoices?.() ?? []).length > 0;
}

/** Danh sách giọng còn rỗng thì chờ trình duyệt nạp xong (tối đa ~1 giây) trước khi kết luận máy không có giọng tiếng Việt. */
function waitForVoices(): Promise<void> {
  if (voicesLoaded()) return Promise.resolve();
  const synth = window.speechSynthesis;
  if (typeof synth.addEventListener !== 'function') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', done);
      resolve();
    };
    const timer = setTimeout(done, VOICES_WAIT_MS);
    synth.addEventListener('voiceschanged', done);
  });
}

export const VI_SPEECH_OPTIONS = {
  lang: 'vi-VN',
  rate: 0.92,
  pitch: 1.05,
} as const;

// --- Báo "máy này chưa đọc được tiếng Việt": một lần mỗi lần mở trang, không chặn thao tác, tự tắt ---

export const NO_VIETNAMESE_VOICE_NOTICE = 'Máy này chưa đọc được tiếng Việt';

const NOTICE_VISIBLE_MS = 6000;

let noticeShown = false;
let noticeVisible = false;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
const noticeListeners = new Set<() => void>();

function setNoticeVisible(visible: boolean) {
  if (noticeVisible === visible) return;
  noticeVisible = visible;
  for (const listener of noticeListeners) listener();
}

/** Hiện lời báo "Máy này chưa đọc được tiếng Việt" nếu trong lần mở trang này chưa báo. */
export function announceNoVietnameseVoice(): void {
  if (noticeShown) return;
  noticeShown = true;
  setNoticeVisible(true);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => setNoticeVisible(false), NOTICE_VISIBLE_MS);
}

export function dismissSpeechNotice(): void {
  clearTimeout(noticeTimer);
  setNoticeVisible(false);
}

export function subscribeSpeechNotice(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

export function getSpeechNoticeVisible(): boolean {
  return noticeVisible;
}

/** Chỉ cho test: đưa lời báo về như mới mở trang. */
export function resetSpeechNotice(): void {
  clearTimeout(noticeTimer);
  noticeShown = false;
  setNoticeVisible(false);
}

// --- Cấu hình và dịch vụ giọng của máy chủ (/api/v1/tts): cần phiên đăng nhập ---

let ttsBaseUrl = 'http://localhost:5080/api/v1';
let ttsClient: ApiClient | null = null;

export function setTtsBaseUrl(url: string) {
  ttsBaseUrl = url.replace(/\/+$/, '');
  ttsClient = null;
}

export function getTtsBaseUrl(): string {
  return ttsBaseUrl;
}

let ttsAccessTokenProvider: () => string | null = () => null;

/** Khai báo nơi lấy access token của phiên đăng nhập hiện tại; không có token thì không gọi giọng máy chủ (dùng giọng của trình duyệt). */
export function setTtsAccessTokenProvider(provider: () => string | null) {
  ttsAccessTokenProvider = provider;
}

function ttsApi() {
  ttsClient ??= createApiClient({ baseUrl: ttsBaseUrl, getAccessToken: () => ttsAccessTokenProvider() });
  return createTtsApi(ttsClient);
}

/** Chờ tối đa bấy nhiêu giây một yêu cầu tiếng (máy chủ tự chờ khoảng 30 giây rồi trả null). */
const TTS_REQUEST_TIMEOUT_MS = 45_000;

/** Tiếng đã có, theo chữ đã chuẩn hóa → địa chỉ tệp. */
const ttsAudioCache = new Map<string, string>();
/** Yêu cầu đang chạy, theo chữ: nghe và xin trước cùng một chữ chỉ gọi máy chủ một lần. */
const ttsInflight = new Map<string, Promise<string | null>>();

async function requestAudioUrl(text: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_REQUEST_TIMEOUT_MS);
  try {
    const url = await ttsApi().synthesize(text, { signal: controller.signal });
    if (!url) return null;
    const resolved = resolveFileUrl(url, ttsBaseUrl) ?? url;
    ttsAudioCache.set(text, resolved);
    return resolved;
  } finally {
    clearTimeout(timer);
  }
}

/** Đã đăng nhập và trình duyệt phát được tệp âm thanh: có thể xin giọng máy chủ. */
function canUseServerVoice(): boolean {
  return typeof Audio !== 'undefined' && ttsAccessTokenProvider() !== null;
}

/**
 * Xin địa chỉ tiếng của máy chủ cho một đoạn chữ. null khi chưa đăng nhập, chữ rỗng hoặc quá dài, máy chủ chưa có giọng, quá chậm hoặc lỗi mạng
 * (nơi gọi lùi về giọng của trình duyệt nếu máy có giọng tiếng Việt). Kết quả được nhớ; null không được nhớ nên lần sau thử lại.
 */
export function fetchCloudTtsAudioUrl(text: string): Promise<string | null> {
  const key = normalizeSpeechText(text);
  if (!isSpeakableText(key) || ttsAccessTokenProvider() === null) return Promise.resolve(null);
  const cached = ttsAudioCache.get(key);
  if (cached) return Promise.resolve(cached);
  let pending = ttsInflight.get(key);
  if (!pending) {
    pending = requestAudioUrl(key)
      .catch(() => null)
      .finally(() => ttsInflight.delete(key));
    ttsInflight.set(key, pending);
  }
  return pending;
}

// --- Tải trước tệp âm thanh (câu kế tiếp khi đọc từng câu) ---

const PRELOADED_MAX = 8;
const preloadedAudio = new Map<string, HTMLAudioElement>();

function preloadAudio(url: string) {
  if (typeof Audio === 'undefined' || preloadedAudio.has(url)) return;
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    audio.load?.();
    preloadedAudio.set(url, audio);
    if (preloadedAudio.size > PRELOADED_MAX) preloadedAudio.delete(preloadedAudio.keys().next().value!);
  } catch {
    // Tải trước chỉ là tiện, không được thì lúc phát tải sau.
  }
}

/** Phần tử phát cho một địa chỉ: lấy bản đã tải trước nếu có (dùng một lần), không thì tạo mới. */
function takeAudio(url: string): HTMLAudioElement {
  const ready = preloadedAudio.get(url);
  if (ready) {
    preloadedAudio.delete(url);
    return ready;
  }
  return new Audio(url);
}

/**
 * Xin sẵn tiếng của một đoạn chữ rồi tải trước tệp, để lúc cần phát không phải chờ. Chạy ngầm, không phát gì; chưa đăng nhập hoặc xem trước thì không làm gì.
 * Dùng cho câu kế tiếp trong lúc đang đọc câu hiện tại.
 */
export function preloadSpeech(text: string): void {
  if (!canUseServerVoice()) return;
  void fetchCloudTtsAudioUrl(text).then((url) => {
    if (url) preloadAudio(url);
  });
}

// --- Nhờ máy chủ tạo trước tiếng ---

const prefetchOnServer = createSpeechPrefetcher(
  (texts) => ttsApi().prefetch(texts),
  (text) => ttsAudioCache.has(text),
);

/**
 * Nhờ máy chủ tạo trước tiếng cho các chữ sắp đọc (chạy ngầm, lỗi bỏ qua, chữ đã gửi không gửi lại). Chỉ khi đã đăng nhập. Màn xem trước của giáo viên
 * không gọi hàm này.
 */
export function prefetchSpeech(texts: readonly (string | null | undefined)[]): void {
  if (ttsAccessTokenProvider() === null) return;
  prefetchOnServer(texts);
}

// --- Trạng thái đọc chung: nút loa nào cũng biết "đang chuẩn bị" / "đang đọc" đoạn chữ của mình ---

export interface SpeechActivity {
  status: 'idle' | 'preparing' | 'speaking';
  /** Chữ đang chuẩn bị hoặc đang đọc (đã chuẩn hóa); null khi rảnh. */
  text: string | null;
}

const IDLE_ACTIVITY: SpeechActivity = { status: 'idle', text: null };
let activity: SpeechActivity = IDLE_ACTIVITY;
const activityListeners = new Set<() => void>();

function setActivity(next: SpeechActivity) {
  if (activity.status === next.status && activity.text === next.text) return;
  activity = next;
  for (const listener of activityListeners) listener();
}

export function subscribeSpeechActivity(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

export function getSpeechActivity(): SpeechActivity {
  return activity;
}

// --- Phát tiếng ---

let currentPlayingAudio: HTMLAudioElement | null = null;
/** Tăng mỗi khi dừng hoặc bắt đầu đọc đoạn mới; lượt đọc cũ (đang chờ máy chủ hay đang phát) thấy số đã đổi thì thôi, không phát chồng lên. */
let generation = 0;

export function stopAllSpeech(): void {
  generation += 1;
  if (currentPlayingAudio) {
    try {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    } catch {
      // Bỏ qua lỗi dừng audio
    }
    currentPlayingAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  setActivity(IDLE_ACTIVITY);
}

export function speakWithBrowserVoice(
  text: string,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    callbacks?.onError?.();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = VI_SPEECH_OPTIONS.lang;
  const voice = getBestVietnameseVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = VI_SPEECH_OPTIONS.rate;
  utterance.pitch = VI_SPEECH_OPTIONS.pitch;
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => callbacks?.onError?.();
  callbacks?.onStart?.();
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

export interface SpeakCallbacks {
  /** Đang chờ máy chủ tạo tiếng (nút loa hiện trạng thái đang chuẩn bị). */
  onPreparing?: () => void;
  /** Bắt đầu có tiếng. */
  onStart?: () => void;
  onEnd?: () => void;
  /** Không đọc được (kể cả khi máy không có giọng tiếng Việt). */
  onError?: () => void;
  /** Không đọc được vì không có nguồn giọng tiếng Việt nào (máy chủ chưa trả tiếng và máy không có giọng tiếng Việt). Gọi trước `onError`. */
  onUnavailable?: () => void;
}

/**
 * Đọc to một đoạn chữ tiếng Việt:
 * 1. Xin tiếng của máy chủ (cần đã đăng nhập). Chờ thì báo `onPreparing`; có thì phát bằng thẻ âm thanh.
 * 2. Máy chủ không trả tiếng thì lùi về giọng của trình duyệt, nhưng chỉ khi trình duyệt có giọng tiếng Việt.
 * 3. Không có giọng nào thì không đọc: hiện lời báo "Máy này chưa đọc được tiếng Việt" (một lần) và báo `onUnavailable`, `onError`.
 * Bắt đầu đọc đoạn mới hay `stopAllSpeech` thì lượt đọc đang chờ bị bỏ, không phát chồng lên nhau.
 */
export async function speakVietnamese(text: string, callbacks?: SpeakCallbacks): Promise<() => void> {
  stopAllSpeech();
  const mine = generation;

  const trimmed = normalizeSpeechText(text);
  if (!trimmed) return () => {};

  const live = () => mine === generation;
  const settle = () => {
    if (live()) setActivity(IDLE_ACTIVITY);
  };
  const guarded = {
    onStart: () => {
      if (!live()) return;
      setActivity({ status: 'speaking', text: trimmed });
      callbacks?.onStart?.();
    },
    onEnd: () => {
      if (!live()) return;
      settle();
      callbacks?.onEnd?.();
    },
    onError: () => {
      if (!live()) return;
      settle();
      callbacks?.onError?.();
    },
  };
  const cancel = () => {
    if (live()) stopAllSpeech();
  };

  const speakWithDeviceVoice = async (): Promise<() => void> => {
    if (!voicesLoaded()) {
      await waitForVoices();
      if (!live()) return () => {};
    }
    if (!hasVietnameseVoice()) {
      announceNoVietnameseVoice();
      callbacks?.onUnavailable?.();
      guarded.onError();
      return () => {};
    }
    speakWithBrowserVoice(trimmed, guarded);
    return cancel;
  };

  if (!canUseServerVoice()) return speakWithDeviceVoice();

  // Tiếng đã có sẵn (đã nghe hoặc đã xin trước) thì phát ngay, không hiện trạng thái đang chuẩn bị.
  if (!ttsAudioCache.has(trimmed)) {
    setActivity({ status: 'preparing', text: trimmed });
    callbacks?.onPreparing?.();
  }
  const audioUrl = await fetchCloudTtsAudioUrl(trimmed);
  if (!live()) return () => {};
  if (!audioUrl) return speakWithDeviceVoice();

  // Tệp hỏng báo cả bằng sự kiện lỗi lẫn lúc phát bị từ chối: chỉ lùi về giọng của trình duyệt một lần.
  let fellBack = false;
  const fallBack = (): Promise<() => void> => {
    if (fellBack) return Promise.resolve(() => {});
    fellBack = true;
    return speakWithDeviceVoice();
  };

  const audio = takeAudio(audioUrl);
  currentPlayingAudio = audio;
  audio.onended = () => {
    if (currentPlayingAudio === audio) currentPlayingAudio = null;
    guarded.onEnd();
  };
  audio.onerror = () => {
    if (currentPlayingAudio === audio) currentPlayingAudio = null;
    if (!live()) return;
    // Tệp hỏng: bỏ tiếng đã nhớ để lần sau xin lại, và đọc bằng giọng của trình duyệt nếu có giọng tiếng Việt.
    ttsAudioCache.delete(trimmed);
    void fallBack();
  };
  try {
    await audio.play();
  } catch (error) {
    if (currentPlayingAudio === audio) currentPlayingAudio = null;
    if (!live()) return () => {};
    // Trình duyệt chưa cho tự phát tiếng (chưa chạm vào trang): bỏ qua, em bấm loa là nghe.
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      guarded.onError();
      return () => {};
    }
    return fallBack();
  }
  if (!live()) return () => {};
  guarded.onStart();
  return cancel;
}
