import { useEffect } from 'react';
import { INTRO_VIDEO_BASE_URL } from '../config/env';
import { useI18n } from '../i18n/context';
import { IntroVideoPlayer } from '../intro/IntroVideo';
import { postToHost } from './hostMessages';

// Trang video giới thiệu nhúng cho app mobile: chỉ có trình phát video khách 60 giây theo ngôn ngữ trên địa chỉ (`?lang=`), kín cả khung WebView.
// Video nằm trên kho lưu tệp, không đóng gói vào app; chỉ tải khi khách bấm phát, không tự phát. Phụ đề bật sẵn khi không phải tiếng Việt.
// Chưa cấu hình địa chỉ video thì hiện câu báo chưa có video.

export function EmbedIntroVideoPage() {
  const { language, t } = useI18n();
  const hasVideo = INTRO_VIDEO_BASE_URL !== null;

  useEffect(() => {
    postToHost({ type: 'ready', version: 1 });
  }, []);

  if (!hasVideo) {
    return (
      <div className="flex size-full items-center justify-center p-6">
        <output className="type-body-m block text-center text-on-surface-variant">
          {t.about.videoUnavailable}
        </output>
      </div>
    );
  }
  return (
    <div className="flex size-full items-center justify-center bg-(--color-brand-navy)">
      <title>{t.documentTitle(t.about.videoTitle)}</title>
      <IntroVideoPlayer
        name="du-khach-60s"
        edition={language}
        captions={[language]}
        defaultCaption={language === 'vi' ? null : language}
        label={t.about.videoLabel}
        noSupport={t.about.videoNoSupport}
        withPoster
        className="max-h-full w-full bg-(--color-brand-navy)"
      />
    </div>
  );
}
