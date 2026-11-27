import type { StudentLesson } from '../api';
import { splitSentences } from '../speech';
import { sectionsOf } from './lessonData';

// Chữ mà bố cục bài học cấp 1 đọc to đúng nguyên văn. Nhờ máy chủ tạo trước tiếng thì chữ gửi đi phải trùng từng ký tự với chữ nút nghe sẽ gửi.

export interface StoryPartData {
  text: string;
  url: string | null;
  caption: string | null;
}

export interface GalleryItem {
  url: string | null;
  caption: string | null;
  image: StudentLesson['sections'][number]['image'];
}

/** Hình của bước Xem hình: hình của các đoạn kể chuyện (chú thích là tiêu đề đoạn) rồi các hình riêng. */
export function galleryOf(lesson: StudentLesson): GalleryItem[] {
  return [
    ...sectionsOf(lesson, 'STORY').filter((s) => s.imageUrl).map((s) => ({ url: s.imageUrl, caption: s.title, image: s.image })),
    ...sectionsOf(lesson, 'IMAGE').map((s) => ({ url: s.imageUrl, caption: s.body, image: s.image })),
  ];
}

/** Các đoạn của bước Nghe chuyện; bài chưa có đoạn kể chuyện thì đọc phần tóm tắt. */
export function storyPartsOf(lesson: StudentLesson): StoryPartData[] {
  const story = sectionsOf(lesson, 'STORY');
  return story.length > 0
    ? story.map((s) => ({ text: s.body ?? '', url: s.imageUrl, caption: s.title }))
    : [{ text: lesson.summary ?? '', url: lesson.heritages[0]?.thumbnailUrl ?? null, caption: null }];
}

/** Mọi đoạn chữ của bài mà giao diện đọc to đúng nguyên văn: từng câu của các đoạn kể chuyện, chú thích hình, các ý cần nhớ đọc liền một lượt. */
export function lessonSpeechTexts(parts: readonly StoryPartData[], gallery: readonly GalleryItem[], keyPoints: readonly string[]): string[] {
  return [
    ...parts.flatMap((part) => splitSentences(part.text, 'vi')),
    ...gallery.map((item) => item.caption ?? ''),
    keyPoints.length > 0 ? keyPoints.join('. ') : '',
  ].filter((text) => text.trim() !== '');
}

export const TAKE_HOME_HEADING = 'Về nhà hỏi bố mẹ nhé';

/** Lời đọc to của khối câu mang về nhà: lời nhắc rồi câu hỏi. */
export function takeHomeSpeech(text: string): string {
  return `${TAKE_HOME_HEADING}. ${text}`;
}
