import { parseEmbedMessage } from '@dsvhvn/dung-chung/embed';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STRINGS } from '../i18n/strings';
import { mockApi } from '../test/fixtures';
import { publicApi } from '../test/discoveryFixtures';
import { renderApp } from '../test/renderApp';

// Trang video giới thiệu nhúng cho app: chỉ có trình phát video khách theo ngôn ngữ trên địa chỉ, không thanh điều hướng, không tự phát,
// phụ đề bật sẵn khi không phải tiếng Việt. Chưa cấu hình địa chỉ video thì báo chưa có video bằng ngôn ngữ trên địa chỉ.

const config = vi.hoisted(() => ({ base: 'https://video.test/gioi-thieu' as string | null }));

vi.mock('../config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/env')>()),
  get INTRO_VIDEO_BASE_URL() {
    return config.base;
  },
}));

afterEach(() => {
  config.base = 'https://video.test/gioi-thieu';
  delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
});

function mockNativeBridge() {
  const sent: string[] = [];
  (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = { postMessage: (data: string) => void sent.push(data) };
  return () => sent.map((raw) => parseEmbedMessage(raw));
}

function theVideo(): HTMLVideoElement {
  const video = document.querySelector('video');
  if (!video) throw new Error('Không thấy video');
  return video;
}

describe('Trang video giới thiệu nhúng', () => {
  it('chỉ có trình phát video khách theo ngôn ngữ trên địa chỉ, phụ đề bật sẵn, không tự phát, báo sẵn sàng cho app', async () => {
    const messages = mockNativeBridge();
    mockApi(publicApi());
    renderApp('/nhung/video-gioi-thieu?lang=en');

    await waitFor(() => expect(document.querySelector('video')).not.toBeNull());
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    const video = theVideo();
    expect(video).toHaveAttribute('preload', 'none');
    expect(video).toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).not.toHaveAttribute('loop');
    expect(video).toHaveAttribute('poster', 'https://video.test/gioi-thieu/du-khach-60s.en.720.jpg');
    expect(video).toHaveAttribute('aria-label', STRINGS.en.about.videoLabel);
    expect([...video.querySelectorAll('source')].map((source) => source.getAttribute('src'))).toEqual([
      'https://video.test/gioi-thieu/du-khach-60s.en.720.webm',
      'https://video.test/gioi-thieu/du-khach-60s.en.720.mp4',
    ]);
    const track = video.querySelector('track');
    expect(track).toHaveAttribute('src', '/video/du-khach-60s.en.vtt');
    expect(track).toHaveAttribute('default');
    expect(video.closest('[lang]')).toHaveAttribute('lang', 'en');
    await waitFor(() => expect(messages()).toContainEqual({ type: 'ready', version: 1 }));
  });

  it('tiếng Việt thì phụ đề không bật sẵn; thiếu hoặc sai ngôn ngữ thì dùng tiếng Việt', async () => {
    mockApi(publicApi());
    renderApp('/nhung/video-gioi-thieu?lang=xx');

    await waitFor(() => expect(document.querySelector('video')).not.toBeNull());
    const video = theVideo();
    expect(video.querySelector('source')).toHaveAttribute('src', 'https://video.test/gioi-thieu/du-khach-60s.vi.720.webm');
    expect(video.querySelector('track')).not.toHaveAttribute('default');
    expect(video.closest('[lang]')).toHaveAttribute('lang', 'vi');
  });

  it.each(['vi', 'en', 'ko', 'zh-Hans', 'ja'] as const)('chưa cấu hình địa chỉ video thì báo chưa có video bằng %s', async (lang) => {
    config.base = null;
    mockApi(publicApi());
    renderApp(`/nhung/video-gioi-thieu?lang=${lang}`);

    expect(await screen.findByText(STRINGS[lang].about.videoUnavailable)).toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();
  });
});
