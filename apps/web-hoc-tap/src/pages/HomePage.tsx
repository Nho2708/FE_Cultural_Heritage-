import { cn } from '@dsvhvn/dung-chung';
import type { CountItem, DiscoveryHome, HeritageCard, HeritageType } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon, type IconName } from '@dsvhvn/dung-chung/ui';
import { Link, useNavigate } from 'react-router';
import { pathOf } from '../access/screens';
import { ListNotes } from '../components/ListNotes';
import { PublicErrorState } from '../components/PublicErrorState';
import { ANDROID_APP_URL } from '../config/env';
import { FILTER_PARAM, paramsFromFilter, toSearch } from '../discovery/filters';
import { creditLine } from '../discovery/format';
import { FeaturedTile } from '../discovery/HeritageCard';
import { heritagePath } from '../discovery/paths';
import { KeywordSearch } from '../discovery/KeywordSearch';
import { useHeritageDetail, useHome } from '../discovery/queries';
import { Thumbnail } from '../discovery/Thumbnail';
import { useI18n } from '../i18n/context';
import { formatCount, listFlags } from '../i18n/format';
import { HERITAGE_TYPE_NAME, REGION_LONG_NAME, type RegionValue } from '../i18n/taxonomy';
import { useAuth } from '../lib/auth/context';

// Trang chủ khám phá (công khai): ảnh lớn đầu trang, ô tìm kiếm, lối vào bản đồ và dòng thời gian, di sản nổi bật (tối
// đa 8, do máy chủ chọn), khám phá theo vùng và loại, giới thiệu app mobile. Không có ô nhập mã bài học: mã chỉ nhập
// sau khi học sinh đăng nhập. Chữ giao diện và tên, mô tả di sản theo ngôn ngữ khách đã chọn.

const TYPE_ICON: Record<HeritageType, IconName> = {
  TANGIBLE: 'building',
  INTANGIBLE: 'users',
  NATURAL: 'star',
  MIXED: 'map-pin',
  DOCUMENTARY: 'file-text',
};

function isHeritageType(value: string): value is HeritageType {
  return value in TYPE_ICON;
}

function isRegion(value: string): value is RegionValue {
  return value === 'Bắc' || value === 'Trung' || value === 'Nam';
}

function SectionHeading({ title, subtitle, id }: { title: string; subtitle?: string; id: string }) {
  return (
    <div className="max-w-[760px] pb-6 dsvmd:pb-10">
      <h2 id={id} className="type-display-l text-(--dsv-section-heading-fg)">
        {title}
      </h2>
      {subtitle && <p className="mt-2 type-body-m text-(--dsv-section-subheading-fg)">{subtitle}</p>}
    </div>
  );
}

function Hero({ home }: { home: DiscoveryHome | undefined }) {
  const { user } = useAuth();
  const { language, t } = useI18n();
  const lead = home?.featured[0];
  const detail = useHeritageDetail(lead?.slug);
  const thumbnail = detail.data?.media.find((m) => m.isThumbnail) ?? detail.data?.media.find((m) => m.mediaType === 'IMAGE');
  const credit = thumbnail ? creditLine(thumbnail, t.common.photoCredit) : null;
  const total = home?.totalHeritages;

  return (
    <section aria-labelledby="tieu-de-trang-chu" className="relative flex min-h-[520px] items-end overflow-hidden bg-inverse-surface dsvmd:min-h-[600px]">
      {lead && <Thumbnail url={lead.thumbnailUrl} width={1280} priority />}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[440px] bg-gradient-to-b from-(--dsv-card-scrim-top) to-(--dsv-card-scrim-strong)" />
      <div className="dsv-content relative flex flex-col gap-4 pt-24 pb-14 text-on-image">
        <p className="type-label-kicker">{t.home.kicker}</p>
        <h1 id="tieu-de-trang-chu" className="type-display-xl">
          {t.home.heroTitle}
        </h1>
        <p className="max-w-[720px] type-body-l">{t.home.heroText(total ? formatCount(total, language) : null)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {user ? (
            <ButtonLink to={pathOf('learnHome')} size="lg" className="on-image">
              {t.home.goLearn}
            </ButtonLink>
          ) : (
            <ButtonLink to={pathOf('login')} size="lg" className="on-image">
              <Icon name="log-in" size={20} />
              {t.nav.studentSignIn}
            </ButtonLink>
          )}
          <Link
            to={pathOf('search')}
            className="on-image inline-flex h-12 items-center rounded-sm border-[1.5px] border-on-image px-6 type-control text-on-image transition-colors hover:bg-white/15"
          >
            {t.home.viewAll}
          </Link>
        </div>
        {lead && credit && (
          <p className="type-label text-on-image-variant">
            <Link to={heritagePath(lead.slug)} className="underline underline-offset-2">
              {lead.name}
            </Link>{' '}
            — {credit}
          </p>
        )}
      </div>
    </section>
  );
}

function ExploreEntries({ featured }: { featured: HeritageCard[] }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  // Từ gợi ý tìm bằng tên tiếng Việt: luôn khớp bản tiếng Việt của di sản, ở mọi ngôn ngữ giao diện.
  const suggestions = [
    { label: t.home.suggestionLabels.hue, search: toSearch(paramsFromFilter({ keyword: 'Cố đô Huế' })) },
    { label: t.home.suggestionLabels.halong, search: toSearch(paramsFromFilter({ keyword: 'Vịnh Hạ Long' })) },
    { label: t.home.suggestionLabels.quanHo, search: toSearch(paramsFromFilter({ keyword: 'Quan họ' })) },
    { label: t.home.suggestionLabels.intangible, search: toSearch(paramsFromFilter({ heritageType: 'INTANGIBLE' })) },
  ];
  const tiles = [
    { to: pathOf('map'), icon: 'map', title: t.home.mapTile.title, text: t.home.mapTile.text, image: featured[1]?.thumbnailUrl },
    { to: pathOf('timeline'), icon: 'clock', title: t.home.timelineTile.title, text: t.home.timelineTile.text, image: featured[2]?.thumbnailUrl },
  ] as const;

  return (
    <section aria-label={t.home.entries} className="bg-surface py-12">
      <div className="dsv-content grid gap-6 dsvlg:grid-cols-[1fr_300px_300px]">
        <div className="flex min-w-0 flex-col justify-center gap-4">
          <h2 className="type-h2 text-on-background">{t.home.findTitle}</h2>
          <KeywordSearch
            value=""
            placeholder={t.home.findPlaceholder}
            onSearch={(keyword) => void navigate({ pathname: pathOf('search'), search: toSearch(paramsFromFilter({ keyword })) })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="type-body-s text-on-surface-variant">{t.home.suggestions}</p>
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.search}
                to={{ pathname: pathOf('search'), search: suggestion.search }}
                className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 type-body-s text-on-background transition-colors hover:bg-surface-container-low"
              >
                {suggestion.label}
              </Link>
            ))}
          </div>
        </div>
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className="group relative flex min-h-[220px] flex-col justify-end gap-2 overflow-hidden rounded-md bg-inverse-surface p-6"
          >
            <Thumbnail url={tile.image} className="transition-transform duration-(--dsv-duration-control) ease-out group-hover:scale-105" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-(--dsv-card-scrim-top) to-(--dsv-card-scrim-strong)" />
            <span className="relative flex w-fit rounded-full bg-surface p-2 text-primary">
              <Icon name={tile.icon} size={20} />
            </span>
            <span className="relative type-h3 text-on-image">{tile.title}</span>
            <span className="relative type-body-s text-on-image-variant">{tile.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedMosaic({ featured, total }: { featured: HeritageCard[]; total: number }) {
  const { language, t } = useI18n();
  if (featured.length === 0) return null;
  const [lead, ...rest] = featured as [HeritageCard, ...HeritageCard[]];
  const upper = rest.slice(0, 4);
  const lower = rest.slice(4, 7);
  const flags = listFlags(featured);
  return (
    <section aria-labelledby="di-san-noi-bat" className="bg-background py-16">
      <div className="dsv-content">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading id="di-san-noi-bat" title={t.home.featuredTitle} subtitle={t.home.featuredText} />
          <Link to={pathOf('search')} className="mb-6 inline-flex h-11 items-center gap-1 rounded-xs type-control text-link hover:bg-link-hover-bg dsvmd:mb-10">
            {t.home.viewAllCount(formatCount(total, language))}
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
        <ListNotes flags={flags} />
        <div className="grid gap-6 dsvsm:grid-cols-2 dsvlg:grid-cols-[520fr_356fr_356fr] dsvlg:grid-rows-2">
          <FeaturedTile card={lead} large className="min-h-[300px] dsvsm:col-span-2 dsvlg:col-span-1 dsvlg:row-span-2 dsvlg:min-h-[528px]" />
          {upper.map((card) => (
            <FeaturedTile key={card.id} card={card} className="dsvlg:min-h-[252px]" />
          ))}
        </div>
        {lower.length > 0 && (
          <div className={cn('mt-6 grid gap-6 dsvsm:grid-cols-2', lower.length >= 3 && 'dsvmd:grid-cols-3')}>
            {lower.map((card) => (
              <FeaturedTile key={card.id} card={card} className="dsvmd:min-h-[280px]" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CircleLink({ item, label, to, icon }: { item: CountItem; label: string; to: string; icon: IconName }) {
  const { language, t } = useI18n();
  return (
    <li>
      <Link to={to} className="group flex w-[160px] flex-col items-center gap-3 rounded-md text-center dsvmd:w-[252px]">
        <span className="flex size-[160px] items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-colors group-hover:bg-secondary-container dsvmd:size-[252px]">
          <Icon name={icon} size={56} />
        </span>
        <span className="type-label-kicker text-(--dsv-circle-kicker-fg)">{t.home.circleCount(formatCount(item.count, language))}</span>
        <span className="type-h4 text-(--dsv-circle-title-fg)">{label}</span>
      </Link>
    </li>
  );
}

function RegionAndType({ home }: { home: DiscoveryHome }) {
  const { language, t } = useI18n();
  return (
    <section aria-labelledby="theo-vung-va-loai" className="bg-surface-container-low py-16">
      <div className="dsv-content flex flex-col gap-12">
        <SectionHeading id="theo-vung-va-loai" title={t.home.regionTypeTitle} subtitle={t.home.regionTypeText} />
        <div className="flex flex-col gap-6 dsvlg:flex-row dsvlg:items-center dsvlg:gap-16">
          <div className="max-w-[240px] shrink-0">
            <h3 className="type-h2 text-on-background">{t.home.byRegion}</h3>
            <p className="mt-2 type-body-s text-on-surface-variant">{t.home.byRegionText}</p>
          </div>
          <ul className="flex flex-wrap gap-x-10 gap-y-8">
            {home.byRegion.map((item) => (
              <CircleLink
                key={item.value}
                item={item}
                label={language !== 'vi' && isRegion(item.value) ? REGION_LONG_NAME[language][item.value] : item.label}
                icon="map-pin"
                to={`${pathOf('search')}?${FILTER_PARAM.region}=${encodeURIComponent(item.value)}`}
              />
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-6 dsvlg:flex-row dsvlg:items-center dsvlg:gap-16">
          <div className="max-w-[240px] shrink-0">
            <h3 className="type-h2 text-on-background">{t.home.byType}</h3>
            <p className="mt-2 type-body-s text-on-surface-variant">{t.home.byTypeText}</p>
          </div>
          <ul className="flex flex-wrap gap-x-10 gap-y-8">
            {home.byType
              .filter(isKnownType)
              .map((item) => (
                <CircleLink
                  key={item.value}
                  item={item}
                  label={language === 'vi' ? item.label : HERITAGE_TYPE_NAME[language][item.value]}
                  icon={TYPE_ICON[item.value]}
                  to={`${pathOf('search')}?${FILTER_PARAM.type}=${item.value}`}
                />
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function isKnownType(item: CountItem): item is CountItem & { value: HeritageType } {
  return isHeritageType(item.value);
}

/** Hình minh họa màn hình app của học sinh: app chỉ có tiếng Việt nên chữ trong hình giữ tiếng Việt ở mọi ngôn ngữ. */
function PhoneIllustration() {
  return (
    <div
      aria-hidden="true"
      lang="vi"
      className="hidden h-[440px] w-[240px] shrink-0 flex-col gap-3 overflow-hidden rounded-[36px] border-[6px] border-on-background bg-background px-4 py-5 dsvlg:flex"
    >
      <div className="flex items-center justify-between type-label text-on-background">
        <span>9:41</span>
        <span className="text-primary">Học di sản</span>
      </div>
      <p className="type-h3 text-on-background">Chào em!</p>
      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-3">
        <span className="type-label text-on-surface-variant">Nhập mã bài học</span>
        <span className="rounded-sm bg-surface-container-low px-2.5 py-2 type-mono-label text-on-background">BH7F3K2Q</span>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3">
        <span className="type-h4 text-on-background">Bài học về một di sản</span>
        <span className="type-label text-on-surface-variant">1 bài kiểm tra đang chờ em</span>
      </div>
      <span className="rounded-sm bg-primary px-3 py-2.5 text-center type-control text-on-primary">Mở bài học</span>
    </div>
  );
}

function AppIntro() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="app-di-dong" className="bg-background py-16">
      <div className="dsv-content">
        <div className="flex items-center gap-16 rounded-md bg-primary-container px-6 py-10 text-on-primary-container dsvmd:px-16 dsvmd:py-14">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
            <p className="type-label-kicker">{t.home.appKicker}</p>
            <h2 id="app-di-dong" className="type-display-l">
              {t.home.appTitle}
            </h2>
            <p className="max-w-[640px] type-body-l">{t.home.appText}</p>
            {ANDROID_APP_URL ? (
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={ANDROID_APP_URL}
                  className="inline-flex h-12 items-center gap-2.5 rounded-sm bg-primary px-6 type-control text-on-primary transition-colors hover:bg-primary-hover active:bg-primary-active"
                >
                  <Icon name="download" size={20} />
                  {t.home.appDownload}
                </a>
                <p className="type-body-s">{t.home.appFileNote}</p>
              </div>
            ) : (
              <p className="type-body-s">{t.home.appSoon}</p>
            )}
          </div>
          <PhoneIllustration />
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const home = useHome();
  const { t } = useI18n();
  return (
    <>
      <title>{t.home.title}</title>
      <Hero home={home.data} />
      <ExploreEntries featured={home.data?.featured ?? []} />
      {home.isError && !home.data ? (
        <div className="dsv-content py-12">
          <PublicErrorState error={home.error} onRetry={() => void home.refetch()} />
        </div>
      ) : (
        home.data && (
          <>
            <FeaturedMosaic featured={home.data.featured} total={home.data.totalHeritages} />
            <RegionAndType home={home.data} />
          </>
        )
      )}
      <AppIntro />
    </>
  );
}
