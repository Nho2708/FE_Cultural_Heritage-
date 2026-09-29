import { useState } from 'react';
import { errorMessage, type HeritageDetail, type HeritageEvent, type HeritageTimeline } from '@dsvhvn/dung-chung/api';
import { cn, formatEventRange, formatTimelineRange, formatYear, MESSAGES } from '@dsvhvn/dung-chung';
import { Button, ConfirmDialog, EmptyState, Icon, useToast } from '@dsvhvn/dung-chung/ui';
import { adminTimelinesApi } from '../../lib/api/endpoints';
import { useReorder } from './reorder';
import { ReorderHandle } from './ReorderHandle';
import { TimelineFormDialog, type TimelineFormTarget } from './TimelineFormDialog';

// Tab Dòng thời gian: các giai đoạn theo thứ tự, sự kiện trong từng giai đoạn; thêm / sửa qua Biểu mẫu giai đoạn và
// sự kiện, kéo thả (hoặc phím mũi tên) để đổi thứ tự, xóa qua hộp xác nhận. Bên phải là bản xem trước trục thời gian.

interface TimelineTabProps {
  heritage: HeritageDetail;
  onChanged: () => void;
}

type Removal = { kind: 'timeline'; timeline: HeritageTimeline } | { kind: 'event'; event: HeritageEvent };

export function TimelineTab({ heritage, onChanged }: TimelineTabProps) {
  const toast = useToast();
  const [form, setForm] = useState<TimelineFormTarget | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [busy, setBusy] = useState(false);
  const eventCount = heritage.timelines.reduce((sum, t) => sum + t.events.length, 0);

  const run = async (action: () => Promise<{ message: string | null }>, fallback: string) => {
    setBusy(true);
    try {
      const { message } = await action();
      toast.success(message ?? fallback);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const reorder = useReorder(
    heritage.timelines.map((t) => t.id),
    (ids) => void run(() => adminTimelinesApi.orderTimelines(heritage.id, ids), MESSAGES.success('Đổi thứ tự giai đoạn')),
    busy,
  );

  const confirmRemoval = async () => {
    if (!removal) return;
    const target = removal;
    setRemoval(null);
    if (target.kind === 'timeline') {
      await run(() => adminTimelinesApi.deleteTimeline(target.timeline.id), MESSAGES.success('Xóa giai đoạn'));
    } else {
      await run(() => adminTimelinesApi.deleteEvent(target.event.id), MESSAGES.success('Xóa sự kiện'));
    }
  };

  const addEvent = (timelineId?: number) => {
    const first = timelineId ?? heritage.timelines[0]?.id;
    if (first !== undefined) setForm({ kind: 'event', timelineId: first, event: null });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-m text-on-surface-variant">
          {heritage.timelines.length} giai đoạn, {eventCount} sự kiện. Kéo biểu tượng bên trái hoặc dùng phím mũi tên lên,
          xuống để đổi thứ tự.
        </p>
        <div className="flex flex-wrap gap-3">
          {heritage.timelines.length > 0 && (
            <Button variant="secondary" onClick={() => addEvent()}>
              <Icon name="plus" size={16} />
              Thêm sự kiện
            </Button>
          )}
          <Button onClick={() => setForm({ kind: 'timeline', timeline: null })}>
            <Icon name="plus" size={16} />
            Thêm giai đoạn
          </Button>
        </div>
      </div>

      {heritage.timelines.length === 0 ? (
        <EmptyState icon="clock" title="Di sản chưa có giai đoạn nào.">
          Thêm giai đoạn (ví dụ "Xây dựng Kinh thành"), rồi thêm các sự kiện mốc trong từng giai đoạn.
        </EmptyState>
      ) : (
        <div className="grid gap-8 dsvlg:grid-cols-[minmax(0,1fr)_340px] dsvlg:items-start">
          <ol className="flex flex-col gap-4">
            {heritage.timelines.map((timeline, index) => (
              <TimelineCard
                key={timeline.id}
                index={index + 1}
                timeline={timeline}
                busy={busy}
                dragging={reorder.dragging === timeline.id}
                dropping={reorder.over === timeline.id && reorder.dragging !== timeline.id}
                sourceProps={reorder.source(timeline.id)}
                targetProps={reorder.target(timeline.id)}
                onHandleKeys={reorder.handleKeys(timeline.id)}
                onEdit={() => setForm({ kind: 'timeline', timeline })}
                onDelete={() => setRemoval({ kind: 'timeline', timeline })}
                onAddEvent={() => addEvent(timeline.id)}
                onEditEvent={(event) => setForm({ kind: 'event', timelineId: timeline.id, event })}
                onDeleteEvent={(event) => setRemoval({ kind: 'event', event })}
                onReorderEvents={(ids) =>
                  void run(() => adminTimelinesApi.orderEvents(timeline.id, ids), MESSAGES.success('Đổi thứ tự sự kiện'))
                }
              />
            ))}
          </ol>
          <TimelinePreview timelines={heritage.timelines} />
        </div>
      )}

      {form && (
        <TimelineFormDialog
          heritage={heritage}
          target={form}
          onSaved={(message) => {
            const created = form.kind === 'timeline' ? form.timeline === null : form.event === null;
            const noun = form.kind === 'timeline' ? 'giai đoạn' : 'sự kiện';
            setForm(null);
            toast.success(message ?? MESSAGES.success(created ? `Thêm ${noun}` : `Lưu ${noun}`));
            onChanged();
          }}
          onChanged={onChanged}
          onClose={() => setForm(null)}
        />
      )}

      <ConfirmDialog
        open={removal !== null}
        title={removal?.kind === 'timeline' ? 'Xóa giai đoạn' : 'Xóa sự kiện'}
        confirmLabel={removal?.kind === 'timeline' ? 'Xóa giai đoạn' : 'Xóa sự kiện'}
        tone="danger"
        onConfirm={() => void confirmRemoval()}
        onClose={() => setRemoval(null)}
      >
        {removal?.kind === 'timeline' && (
          <>
            <p>{MESSAGES.confirm('xóa giai đoạn', removal.timeline.name ?? '')}</p>
            {removal.timeline.events.length > 0 && (
              <p className="mt-2 type-body-s">
                {removal.timeline.events.length} sự kiện của giai đoạn và ảnh minh họa của các sự kiện cũng bị xóa.
              </p>
            )}
          </>
        )}
        {removal?.kind === 'event' && (
          <>
            <p>{MESSAGES.confirm('xóa sự kiện', removal.event.name ?? '')}</p>
            {removal.event.media.length > 0 && <p className="mt-2 type-body-s">Ảnh minh họa của sự kiện cũng bị xóa.</p>}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}

interface TimelineCardProps {
  index: number;
  timeline: HeritageTimeline;
  busy: boolean;
  dragging: boolean;
  dropping: boolean;
  sourceProps: ReturnType<ReturnType<typeof useReorder>['source']>;
  targetProps: ReturnType<ReturnType<typeof useReorder>['target']>;
  onHandleKeys: ReturnType<ReturnType<typeof useReorder>['handleKeys']>;
  onEdit: () => void;
  onDelete: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: HeritageEvent) => void;
  onDeleteEvent: (event: HeritageEvent) => void;
  onReorderEvents: (ids: number[]) => void;
}

function TimelineCard({
  index,
  timeline,
  busy,
  dragging,
  dropping,
  sourceProps,
  targetProps,
  onHandleKeys,
  onEdit,
  onDelete,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onReorderEvents,
}: TimelineCardProps) {
  const events = useReorder(
    timeline.events.map((e) => e.id),
    onReorderEvents,
    busy,
  );
  const range = formatTimelineRange(timeline.startYear, timeline.endYear);
  const summary = [range, `${timeline.events.length} sự kiện`].filter(Boolean).join(' · ');
  const name = timeline.name ?? `Giai đoạn ${index}`;

  return (
    <li
      {...targetProps}
      className={cn(
        'rounded-md border bg-surface',
        dropping ? 'border-primary' : 'border-border',
        dragging && 'opacity-50',
      )}
    >
      <div {...sourceProps} className="flex items-center gap-3 px-4 py-4">
        <ReorderHandle name={name} disabled={busy} onKeyDown={onHandleKeys} />
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-container type-label text-on-primary-container"
        >
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="type-h4 text-on-surface">{name}</h3>
          <p className="type-body-s text-on-surface-variant">{summary}</p>
        </div>
        <Button size="icon" variant="ghost" aria-label={`Sửa giai đoạn ${name}`} onClick={onEdit}>
          <Icon name="pencil" size={20} />
        </Button>
        <Button size="icon" variant="ghost" aria-label={`Xóa giai đoạn ${name}`} disabled={busy} onClick={onDelete}>
          <Icon name="trash" size={20} />
        </Button>
      </div>
      {timeline.description && (
        <p className="px-4 pb-3 pl-[72px] type-body-s text-on-surface-variant">{timeline.description}</p>
      )}
      <ul className="border-t border-border">
        {timeline.events.map((event) => {
          const eventName = event.name ?? 'sự kiện';
          return (
            <li
              key={event.id}
              {...events.target(event.id)}
              className={cn(
                'flex items-center gap-3 border-b border-border py-2 pr-4 pl-10 last:border-b-0',
                events.over === event.id && events.dragging !== event.id && 'bg-surface-container-low',
                events.dragging === event.id && 'opacity-50',
              )}
            >
              <div {...events.source(event.id)} className="flex min-w-0 flex-1 items-center gap-3">
                <ReorderHandle name={eventName} size={16} disabled={busy} onKeyDown={events.handleKeys(event.id)} />
                <span className="w-32 shrink-0 type-mono-label text-on-surface-variant">{formatEventRange(event)}</span>
                <span className="min-w-0 flex-1 truncate type-body-m text-on-surface">{eventName}</span>
                {event.media.length > 0 && (
                  <span className="flex shrink-0 items-center gap-1 type-label text-on-surface-muted" title="Có ảnh minh họa">
                    <Icon name="image" size={16} />
                    {event.media.length}
                  </span>
                )}
              </div>
              <Button size="icon" variant="ghost" aria-label={`Sửa sự kiện ${eventName}`} onClick={() => onEditEvent(event)}>
                <Icon name="pencil" size={20} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Xóa sự kiện ${eventName}`}
                disabled={busy}
                onClick={() => onDeleteEvent(event)}
              >
                <Icon name="trash" size={20} />
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-4 py-1 pl-10">
        <Button variant="link" onClick={onAddEvent} className="h-11">
          <Icon name="plus" size={16} />
          Thêm sự kiện
        </Button>
      </div>
    </li>
  );
}

/** Bản xem trước trục thời gian: mốc đầu của mỗi giai đoạn (năm bắt đầu, hoặc năm của sự kiện đầu tiên). */
function TimelinePreview({ timelines }: { timelines: HeritageTimeline[] }) {
  const marks = timelines.map((t) => {
    const year = t.startYear ?? t.events[0]?.startYear ?? null;
    return { id: t.id, label: year === null ? '' : formatYear(year), name: t.name ?? '' };
  });
  return (
    <aside aria-labelledby="xem-truoc-dong-thoi-gian" className="rounded-md border border-border bg-surface p-6">
      <h3 id="xem-truoc-dong-thoi-gian" className="type-h4 text-on-surface">
        Xem trước trên trang công khai
      </h3>
      <ol className="mt-4 flex flex-col">
        {marks.map((mark, i) => (
          <li key={mark.id} className="flex gap-3">
            <span aria-hidden="true" className="flex w-4 shrink-0 flex-col items-center">
              <span className="size-3.5 rounded-full bg-primary" />
              {i < marks.length - 1 && <span className="w-0.5 flex-1 bg-border-strong" />}
            </span>
            <div className="pb-6">
              <p className="type-mono-label text-on-surface-variant">{mark.label || 'Chưa có năm'}</p>
              <p className="type-body-m text-on-surface">{mark.name}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 type-body-s text-on-surface-variant">Năm trước Công nguyên hiện dạng "258 TCN" (nhập là -258).</p>
    </aside>
  );
}
