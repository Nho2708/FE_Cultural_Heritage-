import type { PublicHeritageDetail, PublicMedia } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router';
import { pathOf } from '../access/screens';
import { LocalizationNotice } from '../components/LocalizationNotice';
import { ModelDialog, type ModelSource } from '../components/ModelDialog';
import { SummaryDialog, type SummaryTab } from '../components/SummaryDialog';
import { citationsOf, creditLine, parseContent, parseInline, safeUrl, sourceSummary } from '../discovery/format';
import { HeritageLoadError } from '../discovery/HeritageNotFound';
import { RecommendationsSection } from '../guest/RecommendationsSection';
import { mapPathOf, timelinePath } from '../discovery/paths';
import { useHeritageDetail } from '../discovery/queries';
import { Thumbnail } from '../discovery/Thumbnail';
import { useI18n } from '../i18n/context';
import { coordinatesText, localizeDateText } from '../i18n/format';
import { HERITAGE_TYPE_NAME, provinceName, RECOGNITION_LEVEL_NAME } from '@dsvhvn/dung-chung/i18n';

// Chi tiết di sản (công khai): ảnh đại diện có ghi công, nhãn, nội dung, thông tin, bản đồ nhỏ, thư viện ảnh kèm ghi công
// tách ba phần, dòng thời gian rút gọn và nguồn tham khảo. `:diSan` là slug. Di sản nháp, đã ẩn hoặc không có → 404.
// Tên, mô tả, nội dung, giai đoạn, chú thích ảnh theo ngôn ngữ khách đã chọn; chưa có bản dịch thì hiện tiếng Việt kèm thông báo, bản
// Hàn, Trung, Nhật kèm nhãn "bản dịch máy". Nút "Tóm tắt" và "Nghe" mở hộp thoại tóm tắt (đọc, nghe bằng giọng của trình duyệt).

const LocationMap = lazy(() => import('../discovery/LocationMap'));

const CHIP = 'inline-flex items-center rounded-full bg-surface px-3.5 py-1.5 type-body-s text-on-background';

function Chips({ detail }: { detail: PublicHeritageDetail }) {
  const { language, t } = useI18n();
  const level = detail.recognitionLevel && detail.recognitionLevel !== 'NONE' ? RECOGNITION_LEVEL_NAME[language][detail.recognitionLevel] : null;
  const chips = [
    detail.heritageType ? HERITAGE_TYPE_NAME[language][detail.heritageType] : null,
    level,
    detail.recognizedYear ? t.detail.recognizedYear(detail.recognizedYear) : null,
    provinceName(detail.province?.name, language),
  ].filter((chip): chip is string => Boolean(chip));
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip} className={CHIP}>
          {chip}
        </li>
      ))}
    </ul>
  );
}

const ACTION =
  'inline-flex h-12 items-center gap-2 rounded-sm border-[1.5px] border-on-image px-5 type-control text-on-image transition-colors hover:bg-white/15';

/**
 * Nút "Tóm tắt", "Nghe" và "Xem 3D" dưới tên di sản. "Tóm tắt" và "Nghe" mở hộp thoại tóm tắt (di sản chưa có tóm tắt tiếng Việt đã duyệt thì báo một câu,
 * không mở gì) và không có ở trang xem trước. "Xem 3D" chỉ hiện khi di sản có mô hình đang hiển thị, luôn miễn phí, có cả ở trang xem trước (đọc mô hình của
 * bản nháp theo mã xem trước).
 */
function HeroActions({ detail, previewCode }: { detail: PublicHeritageDetail; previewCode?: string }) {
  const { t } = useI18n();
  const preview = previewCode !== undefined;
  const [dialog, setDialog] = useState<SummaryTab | null>(null);
  const [lastTab, setLastTab] = useState<SummaryTab>('doc');
  const [missing, setMissing] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const modelSource: ModelSource = preview ? { kind: 'preview', code: previewCode } : { kind: 'public' };
  const has3d = detail.hasModel === true;
  if (preview && !has3d) return null;

  const open = (tab: SummaryTab) => {
    if (detail.hasSummary === false) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setLastTab(tab);
    setDialog(tab);
  };

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-3 border-0 p-0">
        <legend className="sr-only">{t.detail.actionsAria}</legend>
        {!preview && (
          <>
            <button type="button" onClick={() => open('doc')} className={ACTION}>
              <Icon name="file-text" size={20} />
              {t.detail.summary}
            </button>
            <button type="button" onClick={() => open('nghe')} className={ACTION}>
              <Icon name="headphones" size={20} />
              {t.detail.listen}
            </button>
          </>
        )}
        {has3d && (
          <button type="button" onClick={() => setModelOpen(true)} className={ACTION}>
            <Icon name="box" size={20} />
            {t.detail.view3d}
          </button>
        )}
      </fieldset>
      {missing && (
        <output className="flex max-w-[640px] items-start gap-2 rounded-sm bg-surface px-4 py-3 type-body-s text-on-surface">
          <Icon name="info" size={16} className="mt-[3px] shrink-0" />
          <span>{t.detail.noSummary}</span>
        </output>
      )}
      {!preview && <SummaryDialog slug={detail.slug} open={dialog !== null} tab={dialog ?? lastTab} onTabChange={setDialog} onClose={() => setDialog(null)} />}
      {has3d && <ModelDialog detail={detail} source={modelSource} open={modelOpen} onClose={() => setModelOpen(false)} />}
    </div>
  );
}

function Hero({ detail, previewCode }: { detail: PublicHeritageDetail; previewCode?: string }) {
  const { t } = useI18n();
  const cover = detail.media.find((m) => m.isThumbnail) ?? detail.media.find((m) => m.url && m.url === detail.thumbnailUrl);
  const credit = cover ? creditLine(cover, t.common.photoCredit) : null;
  return (
    <section aria-labelledby="ten-di-san" className="relative flex min-h-[420px] items-end overflow-hidden bg-inverse-surface dsvmd:min-h-[560px]">
      <Thumbnail url={detail.thumbnailUrl} alt={cover?.caption ?? ''} width={1280} priority />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[400px] bg-gradient-to-b from-(--dsv-card-scrim-top) to-(--dsv-card-scrim-strong)" />
      <div className="dsv-content relative flex flex-col gap-4 pt-24 pb-14 text-on-image">
        <nav aria-label={t.detail.breadcrumb} className="flex items-center gap-2 type-body-s">
          <Link to={pathOf('search')} className="on-image rounded-xs underline-offset-4 hover:underline">
            {t.detail.explore}
          </Link>
          <Icon name="chevron-right" size={14} />
          <span aria-current="page">{detail.name}</span>
        </nav>
        <h1 id="ten-di-san" className="type-display-xl">
          {detail.name}
        </h1>
        <Chips detail={detail} />
        <HeroActions detail={detail} previewCode={previewCode} />
        {credit && <p className="type-label text-on-image-variant">{credit}</p>}
      </div>
    </section>
  );
}

/** Đoạn văn có chữ đậm **…**; dựng bằng phần tử React, không chèn HTML thô. */
function Inline({ text }: { text: string }) {
  return parseInline(text).map((run, index) => (run.bold ? <strong key={index}>{run.text}</strong> : run.text));
}

function Content({ detail }: { detail: PublicHeritageDetail }) {
  const { t } = useI18n();
  const blocks = parseContent(detail.content);
  const startsWithHeading = blocks[0]?.kind === 'heading';
  const firstHeading = blocks.findIndex((block) => block.kind === 'heading');
  return (
    <div className="flex max-w-[760px] min-w-0 flex-col gap-4">
      <LocalizationNotice localization={detail.localization} />
      {!startsWithHeading && <h2 className="type-h2 text-on-background">{t.detail.about}</h2>}
      {blocks.length === 0 && detail.shortDescription && <p className="type-body-l text-on-background">{detail.shortDescription}</p>}
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return index === firstHeading ? (
            <h2 key={index} className="type-h2 text-on-background">
              {block.text}
            </h2>
          ) : (
            <h3 key={index} className="mt-2 type-h3 text-on-background">
              {block.text}
            </h3>
          );
        }
        if (block.kind === 'list') {
          return (
            <ul key={index} className="ml-5 list-disc space-y-1 type-body-l text-on-background">
              {block.items.map((item) => (
                <li key={item}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="type-body-l text-on-background">
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-border pt-3">
      <dt className="type-label text-on-surface-variant">{label}</dt>
      <dd className="type-body-m text-on-background">{children}</dd>
    </div>
  );
}

function InfoCard({ detail }: { detail: PublicHeritageDetail }) {
  const { language, t } = useI18n();
  const level = detail.recognitionLevel && detail.recognitionLevel !== 'NONE' ? RECOGNITION_LEVEL_NAME[language][detail.recognitionLevel] : null;
  const d = t.detail;
  const rows: Array<[string, string | null]> = [
    [d.type, detail.heritageType ? HERITAGE_TYPE_NAME[language][detail.heritageType] : null],
    [d.level, level],
    [d.year, detail.recognizedYear ? String(detail.recognizedYear) : null],
    [d.province, provinceName(detail.province?.name, language)],
    [d.address, detail.address],
  ];
  return (
    <section aria-labelledby="thong-tin" className="flex flex-col gap-4 rounded-md bg-surface-container-low p-6">
      <h2 id="thong-tin" className="type-h3 text-on-background">
        {d.infoTitle}
      </h2>
      <dl className="flex flex-col gap-4">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <InfoRow key={label} label={label}>
              {value}
            </InfoRow>
          ))}
      </dl>
    </section>
  );
}

function LocationCard({ detail, preview }: { detail: PublicHeritageDetail; preview: boolean }) {
  const { language, t } = useI18n();
  if (detail.latitude == null || detail.longitude == null) return null;
  return (
    <section aria-label={t.detail.locationAria} className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="isolate h-[220px]">
        <Suspense fallback={<div className="size-full bg-surface-container-low" />}>
          <LocationMap key={language} labels={t.map.base} latitude={detail.latitude} longitude={detail.longitude} label={provinceName(detail.province?.name, language)} />
        </Suspense>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="type-mono-label text-on-surface-variant">{coordinatesText(detail.latitude, detail.longitude, t, language)}</p>
        {!preview && (
          <Link to={mapPathOf(detail.slug)} className="inline-flex h-11 items-center gap-1 rounded-xs type-control text-link hover:bg-link-hover-bg">
            <Icon name="map" size={16} />
            {t.detail.viewOnMap}
          </Link>
        )}
      </div>
    </section>
  );
}

function Gallery({ media }: { media: PublicMedia[] }) {
  const { t } = useI18n();
  const images = media.filter((m) => m.mediaType === 'IMAGE' && safeUrl(m.url));
  const others = media.filter((m) => m.mediaType !== 'IMAGE' && safeUrl(m.url));
  if (images.length === 0 && others.length === 0) return null;
  return (
    <section aria-labelledby="thu-vien-anh" className="dsv-content py-8">
      <div className="mb-6 flex items-baseline gap-3">
        <h2 id="thu-vien-anh" className="type-h2 text-on-background">
          {t.detail.gallery}
        </h2>
        <p className="type-body-s text-on-surface-variant">{t.detail.photoCount(images.length)}</p>
      </div>
      <ul className="grid gap-6 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
        {images.map((image) => (
          <li key={image.id}>
            <figure className="flex flex-col gap-2">
              <a href={safeUrl(image.url) ?? undefined} target="_blank" rel="noopener noreferrer" className="relative block h-[220px] overflow-hidden rounded-md bg-(--dsv-card-placeholder-bg)">
                <Thumbnail url={image.url} alt={image.caption ?? ''} />
                <span className="sr-only">{t.detail.openOriginal}</span>
              </a>
              <figcaption className="flex flex-col gap-1">
                {image.caption && <span className="type-body-s text-on-background">{image.caption}</span>}
                {creditLine(image, t.common.photoCredit) && <span className="type-label text-on-surface-variant">{creditLine(image, t.common.photoCredit)}</span>}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {others.map((item) => (
            <li key={item.id}>
              <a href={safeUrl(item.url) ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 type-body-s text-link underline underline-offset-4">
                <Icon name="external-link" size={16} />
                {item.caption ?? (item.mediaType === 'VIDEO' ? t.detail.watchVideo : t.detail.listenAudio)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TimelineSummary({ detail, preview }: { detail: PublicHeritageDetail; preview: boolean }) {
  const { language, t } = useI18n();
  if (!detail.hasTimeline || detail.timeline.length === 0) return null;
  const events = detail.timeline.reduce((sum, phase) => sum + phase.eventCount, 0);
  return (
    <section aria-labelledby="dong-thoi-gian-rut-gon" className="bg-surface-container-low py-12">
      <div className="dsv-content flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="dong-thoi-gian-rut-gon" className="type-h2 text-on-background">
              {t.detail.timeline}
            </h2>
            <p className="mt-1 type-body-s text-on-surface-variant">{t.detail.timelineCount(detail.timeline.length, events)}</p>
          </div>
          {!preview && (
            <ButtonLink to={timelinePath(detail.slug)} variant="secondary" size="lg" className="border-[1.5px] border-primary text-primary">
              {t.detail.openTimeline}
            </ButtonLink>
          )}
        </div>
        <ol className="flex flex-col dsvmd:flex-row">
          {detail.timeline.map((phase, index) => (
            <li key={phase.id} className="flex flex-1 flex-col gap-3 pb-6 dsvmd:pr-8 dsvmd:pb-0">
              <div aria-hidden="true" className="flex items-center">
                <span className="size-4 shrink-0 rounded-full bg-primary" />
                <span className={index === 0 ? 'h-0.5 flex-1 bg-primary' : 'h-0.5 flex-1 bg-border'} />
              </div>
              <p className="type-label-kicker text-primary">{localizeDateText(phase.rangeLabel, t, language)}</p>
              <p className="type-h3 text-on-background">{phase.name}</p>
              <p className="type-body-s text-on-surface-variant">{t.detail.eventCount(phase.eventCount)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Sources({ detail }: { detail: PublicHeritageDetail }) {
  const { t } = useI18n();
  const citations = citationsOf(detail.references);
  if (citations.length === 0) return null;
  const summary = sourceSummary(citations, t.detail.sourcePrefix);
  return (
    <section aria-labelledby="nguon" className="dsv-content flex flex-col gap-4 pt-12 pb-16">
      <h2 id="nguon" className="type-h2 text-on-background">
        {t.detail.sources}
      </h2>
      {summary && <p className="type-body-m text-on-surface-variant">{summary}</p>}
      <ol className="flex flex-col gap-4">
        {citations.map((citation) => {
          const href = safeUrl(citation.url);
          return (
            <li key={citation.id} className="flex max-w-[760px] flex-col gap-1 border-l-2 border-(--dsv-citation-border) pl-3">
              <p className="type-control text-on-surface">
                [{citation.index}] {citation.name}
              </p>
              {citation.agency && (
                <p className="type-body-s text-(--dsv-citation-fg)">
                  {t.detail.agency}: {citation.agency}
                </p>
              )}
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer" className="type-body-s break-all text-link underline underline-offset-2">
                  {citation.url}
                </a>
              )}
              {citation.accessedOn && (
                <p className="type-mono-label text-(--dsv-citation-fg)">
                  {t.detail.accessed}: {citation.accessedOn}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Nội dung trang chi tiết di sản. Dùng cho trang công khai và cho trang xem trước bản nháp của quản trị hệ thống: cùng một
 * giao diện. Xem trước (có `previewCode`, mã xem trước của bản nháp) bỏ các liên kết sang bản đồ và dòng thời gian công khai và các nút tóm tắt vì bản
 * nháp chưa có ở đó; nút "Xem 3D" vẫn có và đọc mô hình của bản nháp theo mã.
 */
export function HeritageDetailView({ detail, previewCode }: { detail: PublicHeritageDetail; previewCode?: string }) {
  const { t } = useI18n();
  const preview = previewCode !== undefined;
  return (
    <>
      <Hero detail={detail} previewCode={previewCode} />
      <section className="dsv-content flex flex-col gap-12 pt-14 pb-12 dsvlg:flex-row dsvlg:gap-16">
        <Content detail={detail} />
        <aside aria-label={t.detail.infoAria} className="flex min-w-0 flex-1 flex-col gap-6 dsvlg:max-w-[360px]">
          <InfoCard detail={detail} />
          <LocationCard detail={detail} preview={preview} />
        </aside>
      </section>
      <Gallery media={detail.media} />
      <TimelineSummary detail={detail} preview={preview} />
      <Sources detail={detail} />
    </>
  );
}

export function DetailSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{t.detail.loading}</span>
      <div className="h-[420px] animate-pulse bg-surface-container-high dsvmd:h-[560px]" />
      <div className="dsv-content flex flex-col gap-4 py-12">
        <div className="h-8 w-1/3 animate-pulse rounded-xs bg-surface-container-high" />
        <div className="h-24 animate-pulse rounded-xs bg-surface-container-high" />
      </div>
    </div>
  );
}

export function HeritageDetailPage() {
  const { diSan } = useParams();
  const { t } = useI18n();
  const query = useHeritageDetail(diSan);
  const detail = query.data;

  if (query.isError && !detail) return <HeritageLoadError error={query.error} onRetry={() => void query.refetch()} />;
  if (!detail) return <DetailSkeleton />;

  return (
    <>
      <title>{t.documentTitle(detail.name)}</title>
      <HeritageDetailView detail={detail} />
      {/* Khách xem thêm gợi ý theo di sản đang xem và lịch sử của thiết bị. Lượt xem này đã được máy chủ ghi khi tải chi tiết, nên hỏi gợi ý sau đó. */}
      <RecommendationsSection scope={detail.slug} exceptSlug={detail.slug} className="bg-surface-container-low" />
    </>
  );
}
