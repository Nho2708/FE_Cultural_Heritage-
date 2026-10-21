import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nContext } from '../i18n/context';
import { STRINGS } from '../i18n/strings';
import { IntroVideo } from './IntroVideo';

// Khi đã cấu hình địa chỉ video: video chỉ tải khi bấm phát, không tự phát, không lặp, có phụ đề theo ngôn ngữ và bật sẵn
// phụ đề khi ngôn ngữ giao diện không phải tiếng Việt.

vi.mock('../config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/env')>()),
  INTRO_VIDEO_BASE_URL: 'https://video.test/gioi-thieu',
}));

describe('khung video giới thiệu', () => {
  it('đã cấu hình: phát khi bấm, chọn bản dựng và phụ đề theo ngôn ngữ', () => {
    render(
      <I18nContext value={{ language: 'ko', t: STRINGS.ko, canChoose: true, setLanguage: () => {} }}>
        <IntroVideo
          name="du-khach-60s"
          edition="ko"
          captions={['ko']}
          defaultCaption="ko"
          title="소개 영상"
          label="DiViet 소개 영상"
          noSupport="이 브라우저에서는 영상을 재생할 수 없습니다."
          headingId="video"
        />
      </I18nContext>,
    );

    expect(screen.getByRole('heading', { level: 2, name: '소개 영상' })).toBeInTheDocument();
    const video = document.querySelector('video');
    if (!video) throw new Error('Không thấy video');
    expect(video).toHaveAttribute('aria-label', 'DiViet 소개 영상');
    expect(video).toHaveAttribute('preload', 'none');
    expect(video).toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).not.toHaveAttribute('loop');
    expect([...video.querySelectorAll('source')].map((source) => source.getAttribute('src'))).toEqual([
      'https://video.test/gioi-thieu/du-khach-60s.ko.720.webm',
      'https://video.test/gioi-thieu/du-khach-60s.ko.720.mp4',
    ]);
    const track = video.querySelector('track');
    expect(track).toHaveAttribute('src', '/video/du-khach-60s.ko.vtt');
    expect(track).toHaveAttribute('srclang', 'ko');
    expect(track).toHaveAttribute('label', STRINGS.ko.language.names.ko);
    expect(track).toHaveAttribute('default');
  });
});
