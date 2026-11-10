import { useMemo } from 'react';
import { readAlongLayout, READ_ALOUD_PREFETCH_COUNT } from '../speech';
import { useLessonLinks } from './lessonLinks';
import { usePrefetchSpeech } from './useSpeech';

// Xin máy chủ tạo trước tiếng của nội dung chính khi mở bài đọc cấp 2, 3.

/** Mã ngôn ngữ tách câu của bài đọc; cùng cách tách với máy chủ khi tạo trước tiếng lúc xuất bản bài. */
export const READ_ALOUD_LOCALE = 'vi';

/** Nhờ máy chủ tạo trước tiếng khoảng 10 câu đầu của nội dung chính khi mở bài. Xem trước của giáo viên không gọi. */
export function usePrefetchMainContent(text: string | null | undefined) {
  const links = useLessonLinks();
  const sentences = useMemo(() => readAlongLayout(text, READ_ALOUD_LOCALE).sentences.slice(0, READ_ALOUD_PREFETCH_COUNT), [text]);
  usePrefetchSpeech(sentences, !links.preview);
}

