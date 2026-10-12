import type { LessonFrame, LessonDetail } from '@dsvhvn/dung-chung/api';
import { describe, expect, it } from 'vitest';
import { applyDraft, bodyOf, checkForm, creditLine, formOf, isDirty, mainWordCount, moveItem, newSection, sectionErrors } from './lessonForm';
import { draftOf, frameOf, lessonOf, sectionOf } from '../../test/lessonFixtures';

// Biểu mẫu Soạn bài học: đổi qua lại với dữ liệu máy chủ, kiểm điều kiện xuất bản theo khung của từng cấp.

const words = (n: number) => Array.from({ length: n }, () => 'từ').join(' ');

function stateOf(lesson: LessonDetail) {
  return formOf(lesson);
}

describe('đổi qua lại với dữ liệu máy chủ', () => {
  it('bodyOf bỏ ý chính trống, đổi chuỗi rỗng thành null và giữ thứ tự các phần', () => {
    const lesson = lessonOf({
      keyPoints: ['Ý một', ''],
      sections: [
        sectionOf({ type: 'MILESTONE', body: ' Khởi công ', milestoneYear: 1805, title: null, sortOrder: 2 }),
        sectionOf({ type: 'READING', body: 'Đoạn văn', sortOrder: 1 }),
      ],
    });
    const body = bodyOf(stateOf(lesson));
    expect(body.keyPoints).toEqual(['Ý một']);
    expect(body.sections?.map((s) => s.type)).toEqual(['READING', 'MILESTONE']);
    expect(body.sections?.[1]).toMatchObject({ body: 'Khởi công', milestoneYear: 1805, title: null, imageUrl: null, eventId: null });
  });

  it('chỉ phần mốc mới gửi năm và sự kiện', () => {
    const reading = { ...newSection('READING'), milestoneYear: '1805', eventId: 7 };
    const body = bodyOf({ title: 'A', summary: 'B', keyPoints: [], sections: [reading] });
    expect(body.sections?.[0]).toMatchObject({ milestoneYear: null, eventId: null });
  });

  it('isDirty phát hiện thay đổi và bỏ qua khoảng trắng thừa', () => {
    const saved = stateOf(lessonOf());
    expect(isDirty(saved, saved)).toBe(false);
    expect(isDirty({ ...saved, title: `${saved.title} ` }, saved)).toBe(false);
    expect(isDirty({ ...saved, summary: 'Khác' }, saved)).toBe(true);
  });

  it('bản nháp AI thay tóm tắt, ý chính và các phần, giữ tiêu đề', () => {
    const state = stateOf(lessonOf({ title: 'Tiêu đề của cô' }));
    const next = applyDraft(state, draftOf({ summary: 'Bản AI', keyPoints: ['A', 'B', 'C'] }));
    expect(next.title).toBe('Tiêu đề của cô');
    expect(next.summary).toBe('Bản AI');
    expect(next.keyPoints).toEqual(['A', 'B', 'C']);
  });
});

describe('sắp xếp', () => {
  it('moveItem dời một vị trí và không vượt đầu, cuối', () => {
    expect(moveItem([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });
});

describe('điều kiện xuất bản theo khung của cấp', () => {
  const frame = (level: 1 | 2 | 3): LessonFrame => frameOf(level);

  it('cấp 1: cần bước câu chuyện và hình cho mỗi bước; số bước ngoài 3-6 chỉ nhắc', () => {
    const base = { title: 'Bài', summary: words(200), keyPoints: ['Ý'], sections: [] };
    expect(checkForm(base, frame(1)).missing).toContain('ít nhất một bước câu chuyện');

    const noImage = { ...base, sections: [{ ...newSection('STORY'), body: 'Chuyện' }] };
    expect(checkForm(noImage, frame(1)).missing).toContain('hình cho mỗi bước câu chuyện');

    const ready = { ...base, sections: [{ ...newSection('STORY'), body: 'Chuyện', imageUrl: 'https://anh/1.jpg' }] };
    const check = checkForm(ready, frame(1));
    expect(check.missing).toEqual([]);
    expect(check.warnings.join(' ')).toContain('Câu chuyện có 1 bước');
  });

  it('cấp 1: bước dài quá 50 từ chỉ cảnh báo', () => {
    const state = {
      title: 'Bài',
      summary: words(200),
      keyPoints: ['Ý'],
      sections: [{ ...newSection('STORY'), body: words(60), imageUrl: 'https://anh/1.jpg' }],
    };
    const check = checkForm(state, frame(1));
    expect(check.missing).toEqual([]);
    expect(check.warnings.some((w) => w.startsWith('Bước 1 dài 60 từ'))).toBe(true);
  });

  it('cấp 2: cần ít nhất một mốc thời gian; thiếu hình có chú thích chỉ nhắc', () => {
    const base = { title: 'Bài', summary: words(350), keyPoints: ['Ý'], sections: [] };
    expect(checkForm(base, frame(2)).missing).toEqual(['ít nhất một mốc thời gian']);
    const ready = { ...base, sections: [{ ...newSection('MILESTONE'), body: 'Khởi công', milestoneYear: '1805' }] };
    const check = checkForm(ready, frame(2));
    expect(check.missing).toEqual([]);
    expect(check.warnings).toContain('Bài cấp 2 nên có ít nhất một hình kèm chú thích.');
  });

  it('cấp 3: đoạn trích bắt buộc có nguồn', () => {
    const base = { title: 'Bài', summary: words(700), keyPoints: ['Ý'], sections: [] };
    expect(checkForm(base, frame(3)).missing).toContain('ít nhất một đoạn trích tư liệu gốc');
    const noSource = { ...base, sections: [{ ...newSection('SOURCE_EXCERPT'), body: 'Trích' }] };
    expect(checkForm(noSource, frame(3)).missing).toContain('nguồn của mỗi đoạn trích');
    const ready = { ...base, sections: [{ ...newSection('SOURCE_EXCERPT'), body: 'Trích', sourceCitation: 'Đại Việt sử ký' }] };
    expect(checkForm(ready, frame(3)).missing).toEqual([]);
  });

  it('thiếu tiêu đề, tóm tắt, ý chính đều chặn', () => {
    const check = checkForm({ title: ' ', summary: '', keyPoints: [''], sections: [] }, frame(2));
    expect(check.missing).toEqual(expect.arrayContaining(['tiêu đề bài học', 'tóm tắt', '1-10 ý chính (mỗi ý tối đa 300 ký tự)']));
  });

  it('số từ ngoài khoảng của cấp chỉ cảnh báo; phần của cấp khác nhắc xóa', () => {
    const state = {
      title: 'Bài',
      summary: words(620),
      keyPoints: ['Ý'],
      sections: [{ ...newSection('MILESTONE'), body: 'M', milestoneYear: '1805' }, { ...newSection('STORY'), body: 'Chuyện' }],
    };
    const check = checkForm(state, frame(2));
    expect(check.missing).toEqual([]);
    expect(check.warnings[0]).toContain('1 phần thuộc khung của cấp khác');
    expect(check.warnings.some((w) => w.includes('620 từ') && w.includes('300-500'))).toBe(true);
  });

  it('đếm từ nội dung chính: tóm tắt cộng các đoạn văn trong khung', () => {
    const state = {
      title: 'Bài',
      summary: words(10),
      keyPoints: [],
      sections: [{ ...newSection('READING'), body: words(5) }, { ...newSection('MILESTONE'), body: words(99) }],
    };
    expect(mainWordCount(state, frame(2))).toBe(15);
  });
});

describe('lỗi theo phần', () => {
  it('lấy câu lỗi đầu tiên của từng phần theo số thứ tự', () => {
    const errors = sectionErrors({ 'sections[1].body': 'Thiếu nội dung.', 'sections[1].imageUrl': 'Thiếu hình.', title: 'x', 'sections[0].type': 'Sai loại.' });
    expect(errors.get(1)).toBe('Thiếu nội dung.');
    expect(errors.get(0)).toBe('Sai loại.');
    expect(errors.size).toBe(2);
  });
});

describe('dòng ghi công của hình', () => {
  it('dòng máy chủ đã ghép sẵn được dùng nguyên, không nối thêm tác giả, giấy phép, nguồn lần nữa', () => {
    const image = { credit: 'Daderot · CC0 · Wikimedia Commons', author: 'Daderot', license: 'CC0', source: 'Wikimedia Commons' };
    expect(creditLine(image)).toBe('Daderot · CC0 · Wikimedia Commons');
    expect(creditLine({ ...image, credit: null })).toBe('Daderot · CC0 · Wikimedia Commons');
  });
});
