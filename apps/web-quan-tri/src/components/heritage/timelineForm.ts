import type { EventInput, HeritageEvent, HeritageTimeline, TimelineInput } from '@dsvhvn/dung-chung/api';
import { parseInteger, trimToNull, type EventValues, type TimelineValues } from '@dsvhvn/dung-chung';

// Giá trị các ô của Biểu mẫu giai đoạn và sự kiện ⇄ dữ liệu gửi và nhận của API.

export const EMPTY_TIMELINE: TimelineValues = { name: '', description: '', startYear: '', endYear: '', sortOrder: '' };

export const EMPTY_EVENT: EventValues = {
  name: '',
  description: '',
  startYear: '',
  startMonth: '',
  startDay: '',
  endYear: '',
  endMonth: '',
  endDay: '',
  sortOrder: '',
};

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

/** Số nguyên từ ô nhập đã kiểm; rỗng hoặc sai dạng là null. */
function num(value: string): number | null {
  const n = parseInteger(value);
  return n === null || Number.isNaN(n) ? null : n;
}

export function timelineValuesOf(timeline: HeritageTimeline): TimelineValues {
  return {
    name: timeline.name ?? '',
    description: timeline.description ?? '',
    startYear: text(timeline.startYear),
    endYear: text(timeline.endYear),
    sortOrder: text(timeline.sortOrder),
  };
}

export function timelineBody(values: TimelineValues): TimelineInput {
  return {
    name: values.name.trim(),
    description: trimToNull(values.description),
    startYear: num(values.startYear),
    endYear: num(values.endYear),
    sortOrder: num(values.sortOrder),
  };
}

export function eventValuesOf(event: HeritageEvent): EventValues {
  return {
    name: event.name ?? '',
    description: event.description ?? '',
    startYear: text(event.startYear),
    startMonth: text(event.startMonth),
    startDay: text(event.startDay),
    endYear: text(event.endYear),
    endMonth: text(event.endMonth),
    endDay: text(event.endDay),
    sortOrder: text(event.sortOrder),
  };
}

export function eventBody(values: EventValues): EventInput {
  return {
    name: values.name.trim(),
    description: trimToNull(values.description),
    startYear: num(values.startYear) ?? 0,
    startMonth: num(values.startMonth),
    startDay: num(values.startDay),
    endYear: num(values.endYear),
    endMonth: num(values.endMonth),
    endDay: num(values.endDay),
    sortOrder: num(values.sortOrder),
  };
}
