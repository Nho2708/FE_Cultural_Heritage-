import { Composition, Folder } from 'remotion';
import { FPS, NGON_NGU, type NgonNgu } from './brand';
import { DuKhach } from './DuKhach';
import { DoanLogo } from './DoanLogo';
import { NhaTruong } from './NhaTruong';

const MA: Record<NgonNgu, string> = { vi: 'vi', en: 'en', ko: 'ko', 'zh-Hans': 'zh', ja: 'ja' };

export function Root() {
  return (
    <>
      <Folder name="doan-logo">
        <Composition id="logo-16x9" component={DoanLogo} durationInFrames={FPS * 3} fps={FPS} width={1920} height={1080} />
        <Composition id="logo-1x1" component={DoanLogo} durationInFrames={FPS * 3} fps={FPS} width={1080} height={1080} />
        <Composition id="logo-9x16" component={DoanLogo} durationInFrames={FPS * 3} fps={FPS} width={1080} height={1920} />
      </Folder>
      <Folder name="du-khach">
        {NGON_NGU.map((ngonNgu) => (
          <Composition
            key={`ngang-${ngonNgu}`}
            id={`du-khach-60s-${MA[ngonNgu]}`}
            component={DuKhach}
            durationInFrames={FPS * 60}
            fps={FPS}
            width={1920}
            height={1080}
            defaultProps={{ ngonNgu, doc: false }}
          />
        ))}
        {NGON_NGU.map((ngonNgu) => (
          <Composition
            key={`doc-${ngonNgu}`}
            id={`du-khach-45s-doc-${MA[ngonNgu]}`}
            component={DuKhach}
            durationInFrames={FPS * 45}
            fps={FPS}
            width={1080}
            height={1920}
            defaultProps={{ ngonNgu, doc: true }}
          />
        ))}
      </Folder>
      <Composition id="nha-truong-90s" component={NhaTruong} durationInFrames={FPS * 90} fps={FPS} width={1920} height={1080} />
    </>
  );
}
