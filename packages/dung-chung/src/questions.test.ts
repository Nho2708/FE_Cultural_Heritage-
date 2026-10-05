import { describe, expect, it } from 'vitest';
import type { QuestionDetail } from './api/questions';
import {
  changeDraftType,
  clampLevels,
  countBlankMarkers,
  draftFromDetail,
  draftToBody,
  emptyDraft,
  levelRangeLabel,
  markCorrect,
  splitList,
  syncBlanks,
  typesForLevel,
  unplacedErrors,
} from './questions';

describe('bảng dạng câu theo cấp', () => {
  it('mỗi cấp có đúng các dạng theo quy tắc', () => {
    expect(typesForLevel(1)).toEqual(['TRUE_FALSE', 'IMAGE_CHOICE', 'MATCHING', 'ORDERING']);
    expect(typesForLevel(2)).toEqual(['SINGLE_CHOICE', 'TRUE_FALSE', 'ORDERING', 'FILL_BLANK']);
    expect(typesForLevel(3)).toEqual(['SINGLE_CHOICE', 'MULTI_TRUE_FALSE', 'SOURCE_READING']);
  });

  it('nhãn khoảng cấp và thu khoảng cấp vào khoảng dạng cho phép', () => {
    expect(levelRangeLabel(2, 2)).toBe('Cấp 2');
    expect(levelRangeLabel(2, 3)).toBe('Cấp 2-3');
    expect(clampLevels('ORDERING', 1, 3)).toEqual({ levelMin: 1, levelMax: 2 });
    expect(clampLevels('FILL_BLANK', 1, 3)).toEqual({ levelMin: 2, levelMax: 2 });
  });
});

describe('khung câu trắng', () => {
  it('đủ số phần tử tối thiểu của từng dạng', () => {
    expect(emptyDraft('SINGLE_CHOICE').options).toHaveLength(4);
    expect(emptyDraft('SINGLE_CHOICE').options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(emptyDraft('IMAGE_CHOICE').options).toHaveLength(3);
    expect(emptyDraft('MATCHING').pairs).toHaveLength(3);
    expect(emptyDraft('ORDERING').steps).toHaveLength(3);
    expect(emptyDraft('MULTI_TRUE_FALSE').statements).toHaveLength(3);
    expect(emptyDraft('FILL_BLANK').levelMin).toBe(2);
  });

  it('đổi dạng giữ di sản, độ khó, giải thích và đặt lại đáp án, cấp', () => {
    const base = {
      ...emptyDraft('SINGLE_CHOICE'),
      heritageId: 7,
      heritageName: 'Hoàng thành',
      explanation: 'Vì sao',
      difficultyLevel: 'HARD' as const,
      content: 'Lời câu',
    };
    const next = changeDraftType(base, 'MATCHING');
    expect(next).toMatchObject({ questionType: 'MATCHING', heritageId: 7, explanation: 'Vì sao', difficultyLevel: 'HARD', levelMin: 1, levelMax: 1 });
    expect(next.pairs).toHaveLength(3);
    expect(changeDraftType(base, 'SINGLE_CHOICE')).toBe(base);
  });
});

describe('điền từ', () => {
  it('đếm chỗ trống và đồng bộ số ô đáp án', () => {
    expect(countBlankMarkers('Vua ___ dời đô về ___ năm 1010.')).toBe(2);
    expect(countBlankMarkers('Không có chỗ trống')).toBe(0);
    const synced = syncBlanks([{ accepted: 'Lý Thái Tổ' }], 'A ___ B ___ C ___');
    expect(synced).toHaveLength(3);
    expect(synced[0]!.accepted).toBe('Lý Thái Tổ');
    expect(syncBlanks(synced, 'A ___')).toHaveLength(1);
  });

  it('tách cách viết đúng bằng dấu chấm phẩy, bỏ ô rỗng', () => {
    expect(splitList(' Thăng Long ; Hà Nội;; ')).toEqual(['Thăng Long', 'Hà Nội']);
  });
});

describe('đổi qua lại với nội dung gửi lên', () => {
  it('chỉ gửi phần đáp án của đúng dạng; chuỗi rỗng thành null', () => {
    const tf = { ...emptyDraft('TRUE_FALSE'), heritageId: 1, content: 'Hoàng thành là di sản.', answerIsTrue: false, imageUrl: '' };
    const body = draftToBody(tf);
    expect(body).toMatchObject({ questionType: 'TRUE_FALSE', answerIsTrue: false, imageUrl: null, levelMin: 1, levelMax: 2 });
    expect(body.options).toBeUndefined();

    const fill = {
      ...emptyDraft('FILL_BLANK'),
      content: 'Vua ___ dời đô.',
      blanks: [{ accepted: 'Lý Thái Tổ; Lý Công Uẩn' }],
      distractors: 'Trần; Lê; Nguyễn',
    };
    expect(draftToBody(fill)).toMatchObject({
      blanks: [{ accepted: ['Lý Thái Tổ', 'Lý Công Uẩn'] }],
      distractors: ['Trần', 'Lê', 'Nguyễn'],
    });

    const reading = { ...emptyDraft('SOURCE_READING'), passage: ' Đoạn tư liệu ', passageSource: '' };
    expect(draftToBody(reading)).toMatchObject({ passage: 'Đoạn tư liệu', passageSource: null });
  });

  it('mở chi tiết thành biểu mẫu rồi gửi lại giữ nguyên nội dung', () => {
    const detail = {
      id: 5,
      questionType: 'FILL_BLANK',
      heritageId: 3,
      heritageName: 'Thăng Long',
      content: 'Vua ___ dời đô.',
      explanation: 'Năm 1010.',
      difficultyLevel: 'EASY',
      levelMin: 2,
      levelMax: 2,
      imageUrl: null,
      passage: null,
      passageSource: null,
      answerIsTrue: null,
      options: [],
      pairs: [],
      steps: [],
      blanks: [{ accepted: ['Lý Thái Tổ', 'Lý Công Uẩn'] }],
      distractors: ['Trần'],
      statements: [],
    } as unknown as QuestionDetail;
    const draft = draftFromDetail(detail);
    expect(draft.blanks[0]!.accepted).toBe('Lý Thái Tổ; Lý Công Uẩn');
    expect(draftToBody(draft)).toMatchObject({
      questionType: 'FILL_BLANK',
      heritageId: 3,
      content: 'Vua ___ dời đô.',
      difficultyLevel: 'EASY',
      blanks: [{ accepted: ['Lý Thái Tổ', 'Lý Công Uẩn'] }],
      distractors: ['Trần'],
    });
  });

  it('chọn đúng một phương án', () => {
    const marked = markCorrect(emptyDraft('SINGLE_CHOICE').options, 2);
    expect(marked.map((o) => o.isCorrect)).toEqual([false, false, true, false]);
  });

  it('lỗi không gắn được vào ô nào được gom lại', () => {
    expect(unplacedErrors({ content: 'a', levelMin: 'b', other: 'c' }, ['content', /^level/])).toEqual(['c']);
  });
});
