import { AbsoluteFill, Html5Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { MAU, mo } from './brand';
import { LogoChuyenDong, THOI_LUONG_LOGO } from './Logo';

/** Đoạn logo 2,4 giây trên nền xanh than, giữ thêm 0,6 giây rồi mờ dần để ghép đầu video. */
export function DoanLogo() {
  const f = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const canh = Math.min(width, height) * 0.62;
  const het = interpolate(f, [durationInFrames - 9, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: mo });
  return (
    <AbsoluteFill style={{ backgroundColor: MAU.navy, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: f > THOI_LUONG_LOGO ? het : 1 }}>
        <LogoChuyenDong canh={canh} />
      </div>
      <Html5Audio src={staticFile('nhac/logo-3s.wav')} />
    </AbsoluteFill>
  );
}
