import { loadFont as napNotoKR } from '@remotion/google-fonts/NotoSansKR';
import { loadFont as napNotoSC } from '@remotion/google-fonts/NotoSansSC';
import { loadFont as napNotoJP } from '@remotion/google-fonts/NotoSansJP';
import { PHONG_CHU } from '../brand';

// Phông cho tên ngôn ngữ viết bằng chữ của chính ngôn ngữ đó (chip đổi ngôn ngữ). Be Vietnam Pro không có chữ Hàn, Trung, Nhật.
const daNap: Record<string, string> = {};

export function phongTheoMa(ma: string): string {
  const nap = ma === 'ko' ? napNotoKR : ma === 'zh-Hans' ? napNotoSC : ma === 'ja' ? napNotoJP : null;
  if (!nap) return PHONG_CHU;
  daNap[ma] ??= nap('normal', { weights: ['500'] }).fontFamily;
  return `${daNap[ma]}, ${PHONG_CHU}`;
}
