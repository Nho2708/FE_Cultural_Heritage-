import type { TranslationText, UpdateTranslationInput } from '@dsvhvn/dung-chung/api';

// Bản nháp đang sửa của một bản dịch ở màn hình Duyệt bản dịch và tóm tắt: các ô chữ của bản dịch (mô tả ngắn, nội dung, giai đoạn, sự kiện, chú thích
// ảnh) khớp từng phần với bản gốc tiếng Việt theo mã. Chỉ gửi lên máy chủ những ô đã đổi (phần bỏ trống giữ nguyên bản đã lưu).

export interface NameAndDescription {
  name: string;
  description: string;
}

export interface TranslationDraft {
  name: string;
  shortDescription: string;
  content: string;
  timelines: Record<number, NameAndDescription>;
  events: Record<number, NameAndDescription>;
  media: Record<number, string>;
}

const text = (value: string | null | undefined) => value ?? '';

/** Bản nháp ban đầu: giá trị đã dịch của từng phần của bản gốc (phần chưa dịch là chữ rỗng). */
export function draftOf(original: TranslationText, translated: TranslationText): TranslationDraft {
  const timelines: TranslationDraft['timelines'] = {};
  for (const item of original.timelines) {
    const found = translated.timelines.find((candidate) => candidate.id === item.id);
    timelines[item.id] = { name: text(found?.name), description: text(found?.description) };
  }
  const events: TranslationDraft['events'] = {};
  for (const item of original.events) {
    const found = translated.events.find((candidate) => candidate.id === item.id);
    events[item.id] = { name: text(found?.name), description: text(found?.description) };
  }
  const media: TranslationDraft['media'] = {};
  for (const item of original.media) {
    media[item.id] = text(translated.media.find((candidate) => candidate.id === item.id)?.caption);
  }
  return { name: text(translated.name), shortDescription: text(translated.shortDescription), content: text(translated.content), timelines, events, media };
}

/** Yêu cầu sửa chỉ gồm các ô khác bản đầu; không có ô nào đổi thì trả null. `original` cho biết giai đoạn nào thuộc sự kiện nào. */
export function patchOf(initial: TranslationDraft, draft: TranslationDraft, original: TranslationText): UpdateTranslationInput | null {
  const body: UpdateTranslationInput = {};
  if (draft.name !== initial.name) body.name = draft.name;
  if (draft.shortDescription !== initial.shortDescription) body.shortDescription = draft.shortDescription;
  if (draft.content !== initial.content) body.content = draft.content;

  const timelines = original.timelines.flatMap((item) => {
    const before = initial.timelines[item.id];
    const after = draft.timelines[item.id];
    if (!before || !after) return [];
    const entry: { id: number; name?: string; description?: string } = { id: item.id };
    if (after.name !== before.name) entry.name = after.name;
    if (after.description !== before.description) entry.description = after.description;
    return entry.name !== undefined || entry.description !== undefined ? [entry] : [];
  });
  if (timelines.length > 0) body.timelines = timelines;

  const events = original.events.flatMap((item) => {
    const before = initial.events[item.id];
    const after = draft.events[item.id];
    if (!before || !after) return [];
    const entry: { id: number; timelineId: number; name?: string; description?: string } = { id: item.id, timelineId: item.timelineId };
    if (after.name !== before.name) entry.name = after.name;
    if (after.description !== before.description) entry.description = after.description;
    return entry.name !== undefined || entry.description !== undefined ? [entry] : [];
  });
  if (events.length > 0) body.events = events;

  const media = original.media.flatMap((item) => {
    const before = initial.media[item.id];
    const after = draft.media[item.id];
    return before !== undefined && after !== undefined && after !== before ? [{ id: item.id, caption: after }] : [];
  });
  if (media.length > 0) body.media = media;

  return Object.keys(body).length > 0 ? body : null;
}
