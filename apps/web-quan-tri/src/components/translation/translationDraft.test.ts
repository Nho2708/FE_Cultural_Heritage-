import { describe, expect, it } from 'vitest';
import { ORIGINAL, TRANSLATED } from '../../test/translationFixtures';
import { draftOf, patchOf } from './translationDraft';

describe('bản nháp của bản dịch đang sửa', () => {
  it('lấy giá trị đã dịch của từng phần theo mã; phần chưa dịch là chữ rỗng', () => {
    const initial = draftOf(ORIGINAL, { ...TRANSLATED, timelines: [], media: [] });
    expect(initial.name).toBe('Complex of Hue Monuments');
    expect(initial.timelines[11]).toEqual({ name: '', description: '' });
    expect(initial.events[21]).toEqual({ name: 'Citadel built', description: 'Begun in 1805.' });
    expect(initial.media[31]).toBe('');
  });

  it('chưa đổi gì thì không có yêu cầu sửa', () => {
    const initial = draftOf(ORIGINAL, TRANSLATED);
    expect(patchOf(initial, structuredClone(initial), ORIGINAL)).toBeNull();
  });

  it('chỉ gửi các ô đã đổi, kèm mã phần; sự kiện kèm mã giai đoạn', () => {
    const initial = draftOf(ORIGINAL, TRANSLATED);
    const draft = structuredClone(initial);
    draft.name = 'Hue Monuments';
    draft.timelines[11] = { name: 'Nguyen capital', description: 'Hue was the political centre.' };
    draft.events[21] = { name: 'Citadel construction', description: 'Begun in 1805.' };
    draft.media[31] = 'The Meridian Gate';
    expect(patchOf(initial, draft, ORIGINAL)).toEqual({
      name: 'Hue Monuments',
      timelines: [{ id: 11, description: 'Hue was the political centre.' }],
      events: [{ id: 21, timelineId: 11, name: 'Citadel construction' }],
      media: [{ id: 31, caption: 'The Meridian Gate' }],
    });
  });

  it('xóa trắng một ô vẫn là thay đổi', () => {
    const initial = draftOf(ORIGINAL, TRANSLATED);
    expect(patchOf(initial, { ...initial, content: '' }, ORIGINAL)).toEqual({ content: '' });
  });
});
