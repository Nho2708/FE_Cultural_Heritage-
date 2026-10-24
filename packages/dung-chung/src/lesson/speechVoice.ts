// Lựa chọn giọng đọc tiếng Việt chất lượng cao:
// 1. Dịch vụ Cloud TTS (FPT.AI Voice Ban Mai) qua Backend API; máy chủ chỉ phục vụ người đã đăng nhập và chỉ có tiếng khi máy chủ có khóa FPT.AI.
// 2. Fallback tự động sang Web Speech API của trình duyệt (với bộ lọc ưu tiên Natural / Neural / Nữ) nếu chưa đăng nhập, máy chủ không có khóa, mất kết nối hoặc hết hạn ngạch Cloud.

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getBestVietnameseVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;

  const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices?.() ?? []);

  // Chỉ lấy các giọng có mã ngôn ngữ tiếng Việt (vi, vi-VN, vi_VN)
  const viVoices = voices.filter((v) => {
    const lang = (v.lang || '').replaceAll('_', '-').toLowerCase();
    return lang === 'vi' || lang.startsWith('vi-') || lang.startsWith('vi_');
  });

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

export const VI_SPEECH_OPTIONS = {
  lang: 'vi-VN',
  rate: 0.92,
  pitch: 1.05,
} as const;

// --- Cấu hình và dịch vụ Cloud TTS (FPT.AI qua backend /api/v1/tts): cần phiên đăng nhập, máy chủ chưa có khóa FPT.AI thì trả null ---

let ttsBaseUrl = 'http://localhost:5080/api/v1';

export function setTtsBaseUrl(url: string) {
  ttsBaseUrl = url.replace(/\/+$/, '');
}

export function getTtsBaseUrl(): string {
  return ttsBaseUrl;
}

let ttsAccessTokenProvider: () => string | null = () => null;

/** Khai báo nơi lấy access token của phiên đăng nhập hiện tại; không có token thì không gọi Cloud TTS (dùng giọng trình duyệt). */
export function setTtsAccessTokenProvider(provider: () => string | null) {
  ttsAccessTokenProvider = provider;
}

const ttsAudioCache = new Map<string, string>();
let currentPlayingAudio: HTMLAudioElement | null = null;

const proc = typeof globalThis !== 'undefined' ? (globalThis as { process?: { env?: Record<string, string> } }).process : undefined;
const isTestEnv = proc?.env?.NODE_ENV === 'test' || Boolean(proc?.env?.VITEST);

export async function fetchCloudTtsAudioUrl(text: string, signal?: AbortSignal): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed || isTestEnv) return null;

  // Máy chủ chỉ phục vụ người đã đăng nhập: chưa có phiên thì khỏi gọi, lùi về giọng trình duyệt.
  const token = ttsAccessTokenProvider();
  if (!token) return null;

  if (ttsAudioCache.has(trimmed)) {
    return ttsAudioCache.get(trimmed)!;
  }

  try {
    const res = await fetch(`${ttsBaseUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: trimmed }),
      signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    let audioUrl = json?.data?.audioUrl;
    if (typeof audioUrl === 'string' && audioUrl.length > 0) {
      if (audioUrl.startsWith('/')) {
        audioUrl = `${ttsBaseUrl}${audioUrl.replace(/^\/api\/v1/, '')}`;
      }
      ttsAudioCache.set(trimmed, audioUrl);
      return audioUrl;
    }
    return null;
  } catch {
    return null;
  }
}

export function stopAllSpeech(): void {
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

/**
 * Phát giọng đọc tiếng Việt:
 * Thử gọi FPT.AI qua backend trước (cần đã đăng nhập); nếu có audioUrl thì phát bằng Audio element;
 * Nếu không khả dụng (chưa đăng nhập, máy chủ không có khóa FPT.AI, hết hạn ngạch, lỗi mạng, môi trường test), tự động lùi về Web Speech API của trình duyệt.
 */
export async function speakVietnamese(
  text: string,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
): Promise<() => void> {
  stopAllSpeech();

  const trimmed = text.trim();
  if (!trimmed) return () => {};

  if (!isTestEnv && typeof Audio !== 'undefined') {
    try {
      const audioUrl = await fetchCloudTtsAudioUrl(trimmed);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        currentPlayingAudio = audio;

        audio.onended = () => {
          if (currentPlayingAudio === audio) currentPlayingAudio = null;
          callbacks?.onEnd?.();
        };
        audio.onerror = () => {
          if (currentPlayingAudio === audio) currentPlayingAudio = null;
          speakWithBrowserVoice(trimmed, callbacks);
        };

        callbacks?.onStart?.();
        await audio.play();
        return () => {
          audio.pause();
          audio.currentTime = 0;
          if (currentPlayingAudio === audio) currentPlayingAudio = null;
        };
      }
    } catch {
      // Rơi xuống giọng trình duyệt
    }
  }

  return speakWithBrowserVoice(trimmed, callbacks);
}
