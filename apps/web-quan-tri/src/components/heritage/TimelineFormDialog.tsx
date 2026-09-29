import { useMemo, useRef, useState, type FormEvent } from 'react';
import { errorMessage, type HeritageDetail, type HeritageEvent, type HeritageTimeline } from '@dsvhvn/dung-chung/api';
import {
  currentVietnamYear,
  focusFirstInvalid,
  MESSAGES,
  splitApiError,
  validateEvent,
  validateMedia,
  validateTimeline,
  type EventField,
  type EventValues,
  type MediaField,
  type MediaValues,
  type TimelineField,
  type TimelineValues,
} from '@dsvhvn/dung-chung';
import {
  Button,
  ConfirmDialog,
  InlineMessage,
  Modal,
  SelectField,
  TextAreaField,
  TextField,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { adminMediaApi, adminTimelinesApi } from '../../lib/api/endpoints';
import { EMPTY_MEDIA, MEDIA_FIELDS, mediaBody } from './mediaForm';
import { MediaFields } from './MediaFields';
import { MediaThumb } from './MediaTab';
import {
  eventBody,
  eventValuesOf,
  EMPTY_EVENT,
  EMPTY_TIMELINE,
  timelineBody,
  timelineValuesOf,
} from './timelineForm';

// Biểu mẫu giai đoạn và sự kiện (hộp thoại) của tab Dòng thời gian.
//   Giai đoạn: tên, mô tả, năm bắt đầu / kết thúc (năm âm là trước Công nguyên), thứ tự.
//   Sự kiện: giai đoạn, tên, mô tả, năm bắt đầu (bắt buộc), tháng / ngày (tùy chọn), thời điểm kết thúc (tùy chọn),
//   thứ tự, ảnh minh họa kèm ghi công. Kiểm ngày có thật, kết thúc không trước bắt đầu — cùng luật với máy chủ.

export type TimelineFormTarget =
  | { kind: 'timeline'; timeline: HeritageTimeline | null }
  | { kind: 'event'; timelineId: number; event: HeritageEvent | null };

interface TimelineFormDialogProps {
  heritage: HeritageDetail;
  target: TimelineFormTarget;
  /** Đã lưu (thêm hoặc sửa): `message` là câu của máy chủ. */
  onSaved: (message: string | null) => void;
  /** Có thay đổi đã lưu trong lúc hộp thoại còn mở (ví dụ xóa ảnh minh họa, sự kiện đã tạo nhưng ảnh lỗi). */
  onChanged: () => void;
  onClose: () => void;
}

export function TimelineFormDialog({ heritage, target, onSaved, onChanged, onClose }: TimelineFormDialogProps) {
  return target.kind === 'timeline' ? (
    <TimelineForm heritage={heritage} timeline={target.timeline} onSaved={onSaved} onClose={onClose} />
  ) : (
    <EventForm
      heritage={heritage}
      timelineId={target.timelineId}
      event={target.event}
      onSaved={onSaved}
      onChanged={onChanged}
      onClose={onClose}
    />
  );
}

const TIMELINE_KEYS = Object.keys(EMPTY_TIMELINE) as TimelineField[];
const EVENT_KEYS = Object.keys(EMPTY_EVENT) as EventField[];

function Actions({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap justify-end gap-3">
      <Button variant="secondary" onClick={onClose} disabled={saving}>
        Hủy
      </Button>
      <Button type="submit" loading={saving}>
        Lưu
      </Button>
    </div>
  );
}

function TimelineForm({
  heritage,
  timeline,
  onSaved,
  onClose,
}: {
  heritage: HeritageDetail;
  timeline: HeritageTimeline | null;
  onSaved: (message: string | null) => void;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<TimelineValues>(() => (timeline ? timelineValuesOf(timeline) : EMPTY_TIMELINE));
  const [errors, setErrors] = useState<Partial<Record<TimelineField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (field: TimelineField, value: string) => setValues((v) => ({ ...v, [field]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateTimeline(values, currentVietnamYear());
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const body = timelineBody(values);
      const { message } = timeline
        ? await adminTimelinesApi.updateTimeline(timeline.id, body)
        : await adminTimelinesApi.createTimeline(heritage.id, body);
      onSaved(message);
    } catch (err) {
      const failure = splitApiError<TimelineField>(err, TIMELINE_KEYS);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={timeline ? 'Sửa giai đoạn' : 'Thêm giai đoạn'}
      description={`Giai đoạn thuộc di sản ${heritage.name ?? ''}.`}
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <TextField label="Tên" name="name" autoComplete="off" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <TextAreaField
          label="Mô tả"
          name="description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          hint="Không bắt buộc."
        />
        <div className="grid gap-5 dsvsm:grid-cols-2">
          <TextField
            label="Năm bắt đầu"
            name="startYear"
            inputMode="numeric"
            value={values.startYear}
            onChange={(e) => set('startYear', e.target.value)}
            error={errors.startYear}
          />
          <TextField
            label="Năm kết thúc"
            name="endYear"
            inputMode="numeric"
            value={values.endYear}
            onChange={(e) => set('endYear', e.target.value)}
            error={errors.endYear}
          />
        </div>
        <p className="-mt-2 flex items-start gap-2 type-body-s text-on-surface-variant">
          Năm âm là trước Công nguyên, ví dụ -258 là năm 258 trước Công nguyên. Năm bắt đầu và năm kết thúc đều không bắt buộc.
        </p>
        <TextField
          label="Thứ tự"
          name="sortOrder"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={(e) => set('sortOrder', e.target.value)}
          error={errors.sortOrder}
          hint="Thứ tự hiện trên dòng thời gian, đổi được bằng kéo thả. Để trống thì giai đoạn mới xếp cuối, giai đoạn đang sửa giữ nguyên."
        />
        <Actions saving={saving} onClose={onClose} />
      </form>
    </Modal>
  );
}

function EventForm({
  heritage,
  timelineId: initialTimelineId,
  event,
  onSaved,
  onChanged,
  onClose,
}: {
  heritage: HeritageDetail;
  timelineId: number;
  event: HeritageEvent | null;
  onSaved: (message: string | null) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [timelineId, setTimelineId] = useState(initialTimelineId);
  const [values, setValues] = useState<EventValues>(() => (event ? eventValuesOf(event) : EMPTY_EVENT));
  const [errors, setErrors] = useState<Partial<Record<EventField, string>>>({});
  // Sự kiện đã tạo nhưng ảnh minh họa lỗi: hộp thoại chuyển sang sửa sự kiện đó, không tạo lần hai.
  const [savedId, setSavedId] = useState<number | null>(event?.id ?? null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaValues, setMediaValues] = useState<MediaValues>(EMPTY_MEDIA);
  const [mediaErrors, setMediaErrors] = useState<Partial<Record<MediaField, string>>>({});
  const [removing, setRemoving] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (field: EventField, value: string) => setValues((v) => ({ ...v, [field]: value }));

  const current = useMemo(
    () => heritage.timelines.flatMap((t) => t.events).find((e) => e.id === savedId) ?? null,
    [heritage, savedId],
  );
  const media = current?.media ?? [];
  const editing = savedId !== null;

  const submit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    setFormError(null);
    const found = validateEvent(values, currentVietnamYear());
    const mediaFound = mediaOpen ? validateMedia(mediaValues) : {};
    setErrors(found);
    setMediaErrors(mediaFound);
    if (Object.keys(found).length + Object.keys(mediaFound).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    let id = savedId;
    let message: string | null = null;
    try {
      const body = eventBody(values);
      if (id === null) {
        const created = await adminTimelinesApi.createEvent(timelineId, body);
        id = created.data.id;
        message = created.message;
        setSavedId(id);
        onChanged();
      } else {
        message = (await adminTimelinesApi.updateEvent(id, body)).message;
      }
    } catch (err) {
      const failure = splitApiError<EventField>(err, EVENT_KEYS);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
      setSaving(false);
      return;
    }

    try {
      if (mediaOpen) await adminMediaApi.createForEvent(id, mediaBody(mediaValues));
      onSaved(message);
    } catch (err) {
      const failure = splitApiError<MediaField>(err, MEDIA_FIELDS);
      setMediaErrors(failure.fields);
      setFormError(failure.form ?? 'Sự kiện đã lưu nhưng chưa thêm được ảnh minh họa. Hãy sửa ảnh rồi lưu lại.');
      onChanged();
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  const removeMedia = async () => {
    const id = removing;
    setRemoving(null);
    if (id === null) return;
    try {
      const { message } = await adminMediaApi.remove(id);
      toast.success(message ?? MESSAGES.success('Xóa ảnh minh họa'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
    onChanged();
  };

  const timelineOptions = heritage.timelines.map((t) => ({ value: String(t.id), label: t.name ?? `Giai đoạn ${t.id}` }));

  return (
    <Modal
      open
      title={editing ? 'Sửa sự kiện' : 'Thêm sự kiện'}
      description={`Sự kiện thuộc một giai đoạn của di sản ${heritage.name ?? ''}.`}
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <SelectField
          label="Giai đoạn"
          name="timelineId"
          value={String(timelineId)}
          options={timelineOptions}
          disabled={editing}
          onChange={(e) => setTimelineId(Number(e.target.value))}
          hint={editing ? 'Sự kiện đã tạo không chuyển sang giai đoạn khác được.' : undefined}
        />
        <TextField label="Tên" name="name" autoComplete="off" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <TextAreaField
          label="Mô tả"
          name="description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          hint="Không bắt buộc."
        />
        <div className="grid gap-5 dsvsm:grid-cols-3">
          <TextField label="Năm bắt đầu" name="startYear" inputMode="numeric" value={values.startYear} onChange={(e) => set('startYear', e.target.value)} error={errors.startYear} />
          <TextField label="Tháng bắt đầu" name="startMonth" inputMode="numeric" placeholder="Tùy chọn" value={values.startMonth} onChange={(e) => set('startMonth', e.target.value)} error={errors.startMonth} />
          <TextField label="Ngày bắt đầu" name="startDay" inputMode="numeric" placeholder="Tùy chọn" value={values.startDay} onChange={(e) => set('startDay', e.target.value)} error={errors.startDay} />
        </div>
        <div className="grid gap-5 dsvsm:grid-cols-3">
          <TextField label="Năm kết thúc" name="endYear" inputMode="numeric" placeholder="Tùy chọn" value={values.endYear} onChange={(e) => set('endYear', e.target.value)} error={errors.endYear} />
          <TextField label="Tháng kết thúc" name="endMonth" inputMode="numeric" placeholder="Tùy chọn" value={values.endMonth} onChange={(e) => set('endMonth', e.target.value)} error={errors.endMonth} />
          <TextField label="Ngày kết thúc" name="endDay" inputMode="numeric" placeholder="Tùy chọn" value={values.endDay} onChange={(e) => set('endDay', e.target.value)} error={errors.endDay} />
        </div>
        <p className="-mt-2 type-body-s text-on-surface-variant">
          Năm âm là trước Công nguyên, ví dụ -258. Chỉ nhập ngày khi đã có tháng.
        </p>
        <TextField
          label="Thứ tự"
          name="sortOrder"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={(e) => set('sortOrder', e.target.value)}
          error={errors.sortOrder}
          hint="Có tác dụng khi nhiều sự kiện cùng thời điểm; đổi được bằng kéo thả. Để trống thì sự kiện mới xếp cuối."
        />

        <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
          <legend className="px-2 type-label text-on-surface-variant">Ảnh minh họa</legend>
          {media.length > 0 && (
            <ul className="flex flex-col gap-2">
              {media.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <MediaThumb media={m} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate type-body-s text-on-surface">{m.caption || m.url}</p>
                    <p className="truncate type-label text-on-surface-muted">{m.credit}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setRemoving(m.id)} aria-label={`Xóa ảnh minh họa ${m.caption || m.url}`}>
                    Xóa
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {mediaOpen ? (
            <div className="flex flex-col gap-5">
              <MediaFields
                values={mediaValues}
                errors={mediaErrors}
                onChange={(field, value) => setMediaValues((v) => ({ ...v, [field]: value }))}
              />
              <div>
                <Button variant="secondary" onClick={() => setMediaOpen(false)} disabled={saving}>
                  Bỏ ảnh này
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button variant="secondary" onClick={() => setMediaOpen(true)}>
                Thêm ảnh minh họa
              </Button>
            </div>
          )}
          <p className="type-label text-on-surface-muted">Bắt buộc khi có ảnh: tác giả, giấy phép và nơi lấy ảnh.</p>
        </fieldset>

        <Actions saving={saving} onClose={onClose} />
      </form>

      <ConfirmDialog
        open={removing !== null}
        title="Xóa ảnh minh họa"
        confirmLabel="Xóa ảnh"
        tone="danger"
        onConfirm={() => void removeMedia()}
        onClose={() => setRemoving(null)}
      >
        <p>{MESSAGES.confirm('xóa ảnh minh họa', media.find((m) => m.id === removing)?.caption || 'này')}</p>
      </ConfirmDialog>
    </Modal>
  );
}
