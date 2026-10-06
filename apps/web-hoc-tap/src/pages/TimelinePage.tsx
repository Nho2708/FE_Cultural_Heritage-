import { cn } from '@dsvhvn/dung-chung';
import type { PublicEvent, PublicPhase, PublicTimeline } from '@dsvhvn/dung-chung/api';
import { ButtonLink, EmptyState, Icon } from '@dsvhvn/dung-chung/ui';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { pathOf } from '../access/screens';
import { LocalizationNotice } from '../components/LocalizationNotice';
import { PublicErrorState } from '../components/PublicErrorState';
import { FILTER_PARAM, keywordInvalid } from '../discovery/filters';
import { creditLine, safeUrl } from '../discovery/format';
import { HeritageCard } from '../discovery/HeritageCard';
import { HeritageLoadError } from '../discovery/HeritageNotFound';
import { KeywordSearch } from '../discovery/KeywordSearch';
import { heritagePath, timelinePath } from '../discovery/paths';
import { useHeritageTimeline, usePickerHeritages } from '../discovery/queries';
import { Thumbnail } from '../discovery/Thumbnail';
import { useI18n } from '../i18n/context';
import { localizeDateText } from '../i18n/format';
import { provinceName } from '@dsvhvn/dung-chung/i18n';

// Dòng thời gian di sản (công khai). Không có `:diSan`: chọn một di sản (tìm nhanh theo tên). Có `:diSan`: trục dọc các
// giai đoạn theo thứ tự; mở một giai đoạn để xem sự kiện (năm, tháng/ngày nếu có, mô tả, ảnh kèm ghi công). Mỗi di sản
// có dòng thời gian riêng, không có trục thời gian chung. Tên, mô tả giai đoạn và sự kiện, chú thích ảnh theo ngôn ngữ đã chọn.

function EventImages({ event }: { event: PublicEvent }) {
  const { t } = useI18n();
  const images = event.media.filter((m) => m.mediaType === 'IMAGE' && safeUrl(m.url));
  if (images.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-3 dsvmd:w-[200px] dsvmd:shrink-0">
      {images.map((image) => (
        <figure key={image.id} className="flex flex-col gap-1.5">
          <div className="relative h-[128px] overflow-hidden rounded-sm bg-(--dsv-card-placeholder-bg)">
            <Thumbnail url={image.url} alt={image.caption ?? event.name ?? ''} width={330} />
          </div>
          {creditLine(image, t.common.photoCredit) && <figcaption className="type-label text-on-surface-variant">{creditLine(image, t.common.photoCredit)}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function EventRow({ event, first }: { event: PublicEvent; first: boolean }) {
  const { language, t } = useI18n();
  return (
    <li className={cn('flex flex-col gap-3 py-5 dsvmd:flex-row dsvmd:gap-6', !first && 'border-t border-border')}>
      <p className="type-h3 text-primary dsvmd:w-[132px] dsvmd:shrink-0">{localizeDateText(event.dateLabel, t, language)}</p>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="type-h4 text-on-background">{event.name}</p>
        {event.description && <p className="type-body-m text-on-surface-variant">{event.description}</p>}
      </div>
      <EventImages event={event} />
    </li>
  );
}

function Phase({ phase, index, last, open, onToggle }: { phase: PublicPhase; index: number; last: boolean; open: boolean; onToggle: () => void }) {
  const { language, t } = useI18n();
  const listId = `su-kien-giai-doan-${phase.id}`;
  const latest = phase.events.at(-1);
  const count = phase.events.length;
  return (
    <li className="relative pl-8 dsvmd:grid dsvmd:grid-cols-[260px_40px_1fr] dsvmd:pl-0">
      <span aria-hidden="true" className="absolute top-1.5 left-0 size-3.5 rounded-full bg-primary dsvmd:hidden" />
      {!last && <span aria-hidden="true" className="absolute top-6 bottom-0 left-[6px] w-0.5 bg-border dsvmd:hidden" />}

      <div className="flex flex-col gap-1 pb-2 dsvmd:items-end dsvmd:pr-8 dsvmd:pb-0">
        <p className="type-label-kicker text-on-surface-variant">{t.timeline.phaseKicker(index + 1)}</p>
        <p className="font-display text-[24px] leading-8 text-primary dsvmd:text-[36px] dsvmd:leading-[44px]">{localizeDateText(phase.rangeLabel, t, language)}</p>
      </div>

      <div aria-hidden="true" className="hidden flex-col items-center pt-4 dsvmd:flex">
        <span className="size-5 shrink-0 rounded-full bg-primary ring-4 ring-primary/15" />
        <span className={cn('min-h-px w-0.5 flex-1', last ? 'bg-background' : 'bg-border')} />
      </div>

      <div className="flex min-w-0 flex-col gap-4 pb-12 dsvmd:pt-2 dsvmd:pb-14 dsvmd:pl-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="type-h2 min-w-0 flex-1 text-on-background">{phase.name}</h2>
          {count > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={onToggle}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-sm border border-border px-3 type-control text-link hover:bg-link-hover-bg"
            >
              {open ? t.timeline.collapse : t.timeline.viewEvents(count)}
              <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} />
            </button>
          )}
        </div>
        {phase.description && <p className="type-body-l text-on-surface-variant">{phase.description}</p>}
        {count === 0 && <p className="type-body-s text-on-surface-variant">{t.timeline.noEvents}</p>}
        {open && count > 0 && (
          <ol id={listId} className="rounded-md border border-border bg-surface px-6">
            {phase.events.map((event, i) => (
              <EventRow key={event.id} event={event} first={i === 0} />
            ))}
          </ol>
        )}
        {!open && latest && (
          <p className="flex items-center gap-2 type-body-s text-on-surface-variant">
            <Icon name="calendar" size={16} className="shrink-0" />
            <span>{t.timeline.latest(localizeDateText(latest.dateLabel, t, language), latest.name ?? '')}</span>
          </p>
        )}
      </div>
    </li>
  );
}

function TimelineView({ timeline }: { timeline: PublicTimeline }) {
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const picker = usePickerHeritages('');
  const [openPhases, setOpenPhases] = useState<ReadonlySet<number>>(() => new Set(timeline.phases.slice(0, 1).map((p) => p.id)));
  const events = timeline.phases.reduce((sum, phase) => sum + phase.events.length, 0);
  const options = useMemo(() => {
    const items = (picker.data?.items ?? []).map((card) => ({ slug: card.slug, name: card.name }));
    return items.some((item) => item.slug === timeline.slug) ? items : [{ slug: timeline.slug, name: timeline.name }, ...items];
  }, [picker.data, timeline.slug, timeline.name]);
  const toggle = (id: number) =>
    setOpenPhases((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <title>{t.documentTitle(t.timeline.titleOf(timeline.name))}</title>
      <section aria-labelledby="ten-dong-thoi-gian" className="bg-surface-container-low py-10">
        <div className="dsv-content flex flex-col gap-6 dsvmd:flex-row dsvmd:items-end dsvmd:justify-between dsvmd:gap-12">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="type-label-kicker text-primary">{t.timeline.heritageKicker}</p>
            <h1 id="ten-dong-thoi-gian" className="type-display-l text-on-background">
              {timeline.name}
            </h1>
            <p className="type-body-m text-on-surface-variant">
              {[provinceName(timeline.provinceName, language), t.timeline.summary(timeline.phases.length, events)].filter(Boolean).join(' · ')}
            </p>
            <LocalizationNotice localization={timeline.localization} />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex w-full flex-col gap-1.5 dsvmd:w-[320px]">
              <label htmlFor="doi-di-san" className="type-label text-on-surface-variant">
                {t.timeline.change}
              </label>
              <div className="relative">
                <select
                  id="doi-di-san"
                  value={timeline.slug}
                  onChange={(event) => void navigate(timelinePath(event.target.value))}
                  className="h-11 w-full appearance-none rounded-sm border border-(--dsv-input-border) bg-(--dsv-input-bg) pr-10 pl-3 type-body-s text-on-surface"
                >
                  {options.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <Icon name="chevron-down" size={20} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
              </div>
            </div>
            <ButtonLink to={heritagePath(timeline.slug)} variant="secondary" className="h-11 border-[1.5px] border-primary px-5 text-primary">
              <Icon name="arrow-left" size={18} />
              {t.timeline.backToHeritage}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-label={t.timeline.phases} className="dsv-content pt-12 pb-16 dsvmd:pt-14">
        {timeline.phases.length === 0 ? (
          <EmptyState
            icon="clock"
            title={t.timeline.emptyTitle}
            action={
              <ButtonLink to={pathOf('timeline')} variant="secondary">
                {t.timeline.pickOther}
              </ButtonLink>
            }
          >
            {t.timeline.emptyText}
          </EmptyState>
        ) : (
          <ol>
            {timeline.phases.map((phase, index) => (
              <Phase
                key={phase.id}
                phase={phase}
                index={index}
                last={index === timeline.phases.length - 1}
                open={openPhases.has(phase.id)}
                onToggle={() => toggle(phase.id)}
              />
            ))}
          </ol>
        )}
        <p className="mt-4 type-body-s text-on-surface-variant">{t.timeline.perHeritage}</p>
      </section>
    </>
  );
}

/** Chưa chọn di sản: danh sách di sản để chọn, tìm nhanh theo tên. */
function HeritagePicker() {
  const [params, setParams] = useSearchParams();
  const { t } = useI18n();
  const keyword = params.get(FILTER_PARAM.keyword)?.trim() ?? '';
  const result = usePickerHeritages(keyword);
  const invalid = keywordInvalid(keyword);
  const data = result.data;

  return (
    <>
      <title>{t.documentTitle(t.timeline.pageTitle)}</title>
      <section aria-labelledby="chon-di-san" className="bg-surface-container-low py-12">
        <div className="dsv-content flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="type-label-kicker text-primary">{t.timeline.pickerKicker}</p>
            <h1 id="chon-di-san" className="type-display-l text-on-background">
              {t.timeline.pickerTitle}
            </h1>
            <p className="max-w-[760px] type-body-m text-on-surface-variant">{t.timeline.pickerText}</p>
          </div>
          <KeywordSearch
            key={keyword}
            value={keyword}
            placeholder={t.timeline.pickerPlaceholder}
            externalInvalid={invalid}
            onSearch={(next) => setParams(next ? { [FILTER_PARAM.keyword]: next } : {})}
          />
        </div>
      </section>
      <section aria-label={t.timeline.pickerList} className="dsv-content py-8">
        {result.isError && !data ? (
          <PublicErrorState error={result.error} onRetry={() => void result.refetch()} />
        ) : invalid ? null : !data ? (
          <p aria-busy="true" className="type-body-m text-on-surface-variant">
            {t.timeline.pickerLoading}
          </p>
        ) : data.items.length === 0 ? (
          <EmptyState icon="search" title={t.timeline.pickerNone}>
            {t.timeline.pickerTryOther}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 dsvsm:grid-cols-2 dsvmd:grid-cols-3 dsvlg:grid-cols-4">
            {data.items.map((card) => (
              <HeritageCard key={card.id} card={card} to={timelinePath(card.slug)} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function TimelinePage() {
  const { diSan } = useParams();
  const { t } = useI18n();
  const query = useHeritageTimeline(diSan);
  if (!diSan) return <HeritagePicker />;
  if (query.isError && !query.data) return <HeritageLoadError error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) {
    return (
      <div aria-busy="true" aria-live="polite" className="dsv-content py-16">
        <p className="type-body-m text-on-surface-variant">{t.timeline.loading}</p>
      </div>
    );
  }
  // key theo di sản: đổi di sản thì trạng thái mở/đóng các giai đoạn bắt đầu lại.
  return <TimelineView key={query.data.slug} timeline={query.data} />;
}
