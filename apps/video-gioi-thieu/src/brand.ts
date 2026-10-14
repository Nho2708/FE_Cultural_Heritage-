import { Easing } from 'remotion';
import { loadFont as napBeVietnamPro } from '@remotion/google-fonts/BeVietnamPro';
import { loadFont as napPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as napNotoKR } from '@remotion/google-fonts/NotoSansKR';
import { loadFont as napNotoSC } from '@remotion/google-fonts/NotoSansSC';
import { loadFont as napNotoJP } from '@remotion/google-fonts/NotoSansJP';

// Màu logo (kế hoạch chuyển động, mục màu): video và màn hình chờ dùng màu logo, không dùng màu giao diện.
export const MAU = {
  navy: '#292B38',
  navyDam: '#1D1F29',
  navyNhat: '#363949',
  kem: '#DFCFB6',
  son: '#D9573A',
  vang: '#C18D48',
  trang: '#FFFFFF',
} as const;

export const FPS = 30;
/** Đổi mili giây sang số khung hình ở 30 khung mỗi giây. */
export const ms = (giaTri: number) => Math.round((giaTri / 1000) * FPS);

// Đường cong lấy từ token chuyển động của dự án.
export const expoOut = Easing.bezier(0.19, 1, 0.22, 1);
export const mo = Easing.bezier(0, 0, 0.25, 1);
export const ra = Easing.bezier(0.4, 0, 1, 1);

export type NgonNgu = 'vi' | 'en' | 'ko' | 'zh-Hans' | 'ja';
export const NGON_NGU: NgonNgu[] = ['vi', 'en', 'ko', 'zh-Hans', 'ja'];

const sans = napBeVietnamPro('normal', { weights: ['400', '500', '700'], subsets: ['latin', 'latin-ext', 'vietnamese'] }).fontFamily;
const serif = napPlayfair('normal', { weights: ['500', '700'], subsets: ['latin', 'latin-ext', 'vietnamese'] }).fontFamily;

const daNap: Partial<Record<NgonNgu, string>> = {};

/** Phông theo ngôn ngữ: Playfair và Be Vietnam Pro không có chữ Hàn, Trung, Nhật nên ba tiếng này dùng bộ Noto tương ứng. */
export function phong(ngonNgu: NgonNgu): { tieuDe: string; chu: string } {
  if (ngonNgu === 'vi' || ngonNgu === 'en') return { tieuDe: `${serif}, serif`, chu: `${sans}, sans-serif` };
  if (!daNap[ngonNgu]) {
    const nap = ngonNgu === 'ko' ? napNotoKR : ngonNgu === 'ja' ? napNotoJP : napNotoSC;
    daNap[ngonNgu] = nap('normal', { weights: ['500', '700'] }).fontFamily;
  }
  const cjk = `${daNap[ngonNgu]}, ${sans}, sans-serif`;
  return { tieuDe: cjk, chu: cjk };
}

export const PHONG_CHU = `${sans}, sans-serif`;
export const PHONG_TIEU_DE = `${serif}, serif`;
