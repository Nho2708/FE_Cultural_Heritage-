// Lựa chọn giọng đọc tiếng Việt chất lượng cao (Natural/Neural/Online) từ trình duyệt
// Tránh giọng robot "Microsoft An" mặc định trên Windows nếu có các giọng tốt hơn.

export function getBestVietnameseVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const voices: SpeechSynthesisVoice[] = window.speechSynthesis.getVoices?.() ?? [];
  const viVoices = voices.filter((v) => {
    const lang = v.lang.replaceAll('_', '-').toLowerCase();
    return lang === 'vi-vn' || lang.startsWith('vi');
  });

  if (viVoices.length === 0) return undefined;

  // 1. Ưu tiên giọng Natural / Neural của Microsoft Edge (Microsoft HoaiMy / NamMinh Online Natural)
  const natural = viVoices.find((v) => /natural|neural/i.test(v.name));
  if (natural) return natural;

  // 2. Ưu tiên giọng Online (Edge)
  const online = viVoices.find((v) => /online/i.test(v.name));
  if (online) return online;

  // 3. Ưu tiên giọng Google tiếng Việt (Chrome)
  const google = viVoices.find((v) => /google/i.test(v.name));
  if (google) return google;

  // 4. Ưu tiên giọng khác không phải Microsoft An (giọng SAPI5 offline cũ)
  const nonAn = viVoices.find((v) => !/\ban\b/i.test(v.name));
  if (nonAn) return nonAn;

  return viVoices[0];
}

/** Tốc độ và cao độ tối ưu cho học sinh tiểu học nghe rõ ràng, tự nhiên */
export const VI_SPEECH_OPTIONS = {
  rate: 0.92,
  pitch: 1.05,
} as const;
