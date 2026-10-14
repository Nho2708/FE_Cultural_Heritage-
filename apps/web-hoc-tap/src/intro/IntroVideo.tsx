import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { INTRO_VIDEO_BASE_URL } from '../config/env';
import { useI18n } from '../i18n/context';

// Khung video giới thiệu của trang Giới thiệu và trang Dành cho nhà trường. Chưa cấu hình VITE_INTRO_VIDEO_BASE_URL thì
// không hiện gì: trang vẫn đủ nội dung bằng chữ. Video chỉ tải khi người xem bấm phát (preload="none"), không tự phát,
// không lặp. Tệp video nằm trên kho lưu tệp (`<tên>.<ngôn ngữ>.720.webm|mp4`); phụ đề cùng nguồn gốc với web trong
// `public/video/<tên>.<ngôn ngữ>.vtt`, bật sẵn khi ngôn ngữ giao diện không phải tiếng Việt.

export type IntroVideoName = 'du-khach-60s' | 'nha-truong-90s';

export interface IntroVideoPlayerProps {
  name: IntroVideoName;
  /** Bản dựng của video (video khách có 5 bản theo ngôn ngữ; video nhà trường chỉ có tiếng Việt). */
  edition: LanguageCode;
  /** Ngôn ngữ có tệp phụ đề (ít nhất một). */
  captions: readonly [LanguageCode, ...LanguageCode[]];
  /** Phụ đề bật sẵn; null là tắt. */
  defaultCaption: LanguageCode | null;
  label: string;
  noSupport: string;
  /** Kho lưu tệp trả ảnh từ khung hình đầu của video khi đổi đuôi thành .jpg; bật thì dùng làm ảnh bìa. */
  withPoster?: boolean;
  className?: string;
}

/** Chỉ riêng thẻ video (không có tiêu đề hay khung trang): dùng chung cho trang Giới thiệu, Dành cho nhà trường và trang nhúng của app. */
export function IntroVideoPlayer({ name, edition, captions, defaultCaption, label, noSupport, withPoster = false, className }: IntroVideoPlayerProps) {
  const { t } = useI18n();
  if (!INTRO_VIDEO_BASE_URL) return null;
  const file = `${INTRO_VIDEO_BASE_URL}/${name}.${edition}.720`;
  const [first, ...others] = captions;
  const track = (code: LanguageCode) => ({
    src: `/video/${name}.${code}.vtt`,
    srcLang: code,
    label: t.language.names[code],
    default: code === defaultCaption,
  });
  return (
    <video
      controls
      preload="none"
      playsInline
      aria-label={label}
      poster={withPoster ? `${file}.jpg` : undefined}
      className={className ?? 'aspect-video w-full max-w-[960px] rounded-md bg-(--color-brand-navy)'}
    >
      <source src={`${file}.webm`} type="video/webm" />
      <source src={`${file}.mp4`} type="video/mp4" />
      <track kind="captions" {...track(first)} />
      {others.map((code) => (
        <track key={code} kind="captions" {...track(code)} />
      ))}
      {noSupport}
    </video>
  );
}

export interface IntroVideoProps extends Omit<IntroVideoPlayerProps, 'withPoster' | 'className'> {
  title: string;
  headingId: string;
}

export function IntroVideo({ title, headingId, ...player }: IntroVideoProps) {
  if (!INTRO_VIDEO_BASE_URL) return null;
  return (
    <section aria-labelledby={headingId} className="bg-surface py-12 dsvmd:py-16">
      <div className="dsv-content flex flex-col gap-6">
        <h2 id={headingId} className="type-h2 text-on-background">
          {title}
        </h2>
        <IntroVideoPlayer {...player} />
      </div>
    </section>
  );
}
