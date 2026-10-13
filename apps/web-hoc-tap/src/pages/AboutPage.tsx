import { Icon, TextLink, type IconName } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { ANDROID_APP_URL } from '../config/env';
import { useI18n } from '../i18n/context';
import { HeroLink, IntroHero, RevealList, SectionTitle } from '../intro/IntroParts';
import { IntroVideo } from '../intro/IntroVideo';
import { revealItem } from '../intro/reveal';

// Trang Giới thiệu (công khai, 5 ngôn ngữ, không cần đăng nhập): lời giới thiệu ngắn cho khách tham quan, ba tính năng
// chính (bản đồ và "Gần bạn", nghe thuyết minh, mô hình 3D và dòng thời gian) hiện lên một lần khi cuộn tới, dòng nguồn
// thông tin, lối tải app Android (khi đã có tệp cài đặt) và lối sang trang Dành cho nhà trường. Video chỉ hiện khi đã cấu
// hình địa chỉ video. Nói thật: tóm tắt và nghe mở bằng một quảng cáo ngắn trong 24 giờ; bản Hàn, Trung, Nhật là bản dịch máy.

interface Feature {
  key: string;
  icon: IconName;
  title: string;
  text: string;
  note?: string;
  link: { to: string; label: string };
}

export function AboutPage() {
  const { language, t } = useI18n();
  const a = t.about;
  const features: Feature[] = [
    { key: 'nearby', icon: 'map-pin', title: a.nearbyTitle, text: a.nearbyText, link: { to: pathOf('map'), label: a.nearbyLink } },
    {
      key: 'listen',
      icon: 'headphones',
      title: a.listenTitle,
      text: a.listenText,
      note: a.listenNote,
      link: { to: pathOf('search'), label: a.listenLink },
    },
    { key: 'model', icon: 'box', title: a.modelTitle, text: a.modelText, link: { to: pathOf('timeline'), label: a.modelLink } },
  ];

  return (
    <>
      <title>{t.documentTitle(a.title)}</title>
      <meta name="description" content={a.heroText} />
      <IntroHero
        headingId="gioi-thieu-tieu-de"
        kicker={a.kicker}
        title={a.heroTitle}
        text={a.heroText}
        actions={
          <>
            <HeroLink to={pathOf('search')}>
              <Icon name="search" size={20} />
              {a.start}
            </HeroLink>
            <HeroLink to={pathOf('map')} secondary>
              <Icon name="map" size={20} />
              {a.openMap}
            </HeroLink>
          </>
        }
      />

      <section aria-labelledby="gioi-thieu-tinh-nang" className="bg-background py-12 dsvmd:py-16">
        <div className="dsv-content flex flex-col gap-8">
          <SectionTitle id="gioi-thieu-tinh-nang" title={a.featuresTitle} />
          <RevealList className="grid gap-6 dsvlg:grid-cols-3">
            {features.map((feature, index) => (
              <li key={feature.key} {...revealItem(index)} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
                <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                  <Icon name={feature.icon} size={24} />
                </span>
                <h3 className="type-h3 text-on-surface">{feature.title}</h3>
                <p className="type-body-m text-on-surface-variant">{feature.text}</p>
                {feature.note && (
                  <p role="note" className="flex items-start gap-2 rounded-sm bg-surface-container-low px-3 py-2 type-body-s text-on-surface-variant">
                    <Icon name="info" size={16} className="mt-[3px] shrink-0" />
                    <span>{feature.note}</span>
                  </p>
                )}
                <TextLink to={feature.link.to} className="mt-auto inline-flex w-fit items-center gap-1 pt-2">
                  {feature.link.label}
                  <Icon name="chevron-right" size={16} />
                </TextLink>
              </li>
            ))}
          </RevealList>
        </div>
      </section>

      <IntroVideo
        name="du-khach-60s"
        edition={language}
        captions={[language]}
        defaultCaption={language === 'vi' ? null : language}
        title={a.videoTitle}
        label={a.videoLabel}
        noSupport={a.videoNoSupport}
        headingId="gioi-thieu-video"
      />

      <div className="bg-surface-container-low py-12 dsvmd:py-16">
        <RevealList className="dsv-content grid gap-6 dsvmd:grid-cols-2">
          <li {...revealItem(0)} className="flex flex-col items-start gap-3 rounded-md bg-primary-container p-6 text-on-primary-container dsvmd:p-10">
            <Icon name="download" size={28} />
            <h2 className="type-h2">{a.appTitle}</h2>
            <p className="type-body-m">{a.appText}</p>
            {ANDROID_APP_URL ? (
              <a
                href={ANDROID_APP_URL}
                className="mt-auto inline-flex h-12 items-center gap-2.5 rounded-sm bg-primary px-6 type-control text-on-primary transition-colors hover:bg-primary-hover active:bg-primary-active"
              >
                <Icon name="download" size={20} />
                {t.home.appDownload}
              </a>
            ) : (
              <p className="mt-auto type-body-s">{a.appWeb}</p>
            )}
          </li>
          <li {...revealItem(1)} className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6 dsvmd:p-10">
            <Icon name="building" size={28} className="text-primary" />
            <h2 className="type-h2 text-on-surface">{a.schoolsTitle}</h2>
            <p className="type-body-m text-on-surface-variant">{a.schoolsText}</p>
            <TextLink to={pathOf('forSchools')} className="mt-auto inline-flex items-center gap-1">
              {a.schoolsLink}
              <Icon name="chevron-right" size={16} />
            </TextLink>
          </li>
        </RevealList>
      </div>

      <section aria-labelledby="gioi-thieu-nguon" className="bg-background py-12">
        <div className="dsv-content">
          <div className="flex max-w-[860px] flex-col gap-3 dsvmd:flex-row dsvmd:gap-6">
            <Icon name="book-open" size={28} className="shrink-0 text-(--color-brand-gold)" />
            <div className="flex flex-col gap-2">
              <h2 id="gioi-thieu-nguon" className="type-h3 text-on-background">
                {a.sourceTitle}
              </h2>
              <p className="type-body-m text-on-surface-variant">{a.sourceText}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
