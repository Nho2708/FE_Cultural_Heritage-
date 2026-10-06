import type { RecommendedHeritage, RecommendedLesson, RecommendedQuiz, StudentRecommendations } from '@dsvhvn/dung-chung/api';
import { useQuery } from '@tanstack/react-query';
import { heritagePath } from '../discovery/paths';
import { pathOf } from '../access/screens';
import { lessonPath } from '../lessons/lessonData';
import { takeQuizPath } from '../quiz/quizData';
import { studentApi } from '../lib/api/client';
import { useStudentHome } from './useStudentHome';

// "Gợi ý cho em": hai cách lấy (trang học: theo toàn bộ kết quả của em; kết quả một lượt: phần di sản nên ôn chỉ tính từ lượt đó) và đổi
// dữ liệu của máy chủ thành các thẻ cho ba cách trình bày theo cấp. Gợi ý tính khi hiển thị từ lượt làm bài, không có bảng riêng.

export const recommendationsQueryKey = ['student', 'recommendations'] as const;
export const attemptRecommendationsQueryKey = (attemptId: number) => ['student', 'recommendations', 'attempt', attemptId] as const;

export function useHomeRecommendations() {
  return useQuery({ queryKey: recommendationsQueryKey, queryFn: () => studentApi.recommendations().then((r) => r.data), staleTime: 0 });
}

export function useAttemptRecommendations(attemptId: number) {
  return useQuery({
    queryKey: attemptRecommendationsQueryKey(attemptId),
    queryFn: () => studentApi.attemptRecommendations(attemptId).then((r) => r.data),
  });
}

export type GroupId = 'quiz' | 'lessonReview' | 'heritageReview' | 'related' | 'newLesson';

/** Nhãn dài (cấp 2, 3) và nhãn ngắn (thẻ hình của cấp 1) của từng phần. */
export const GROUPS: Record<GroupId, { title: string; short: string }> = {
  quiz: { title: 'Bài kiểm tra nên làm tiếp', short: 'Chơi tiếp' },
  lessonReview: { title: 'Bài học nên ôn lại', short: 'Ôn lại bài' },
  heritageReview: { title: 'Di sản nên ôn', short: 'Di sản nên ôn' },
  related: { title: 'Di sản liên quan', short: 'Di sản giống bài em học' },
  newLesson: { title: 'Bài học mới nên học', short: 'Bài mới' },
};

export interface Suggestion {
  key: string;
  group: GroupId;
  title: string;
  /** Dòng phụ: bài học của bài kiểm tra, nơi của di sản. */
  detail: string | null;
  reason: string;
  imageUrl: string | null;
  /** Hiện hình (thẻ di sản có ảnh hoặc ô giữ chỗ). */
  hasImage: boolean;
  /** Nhãn nhỏ như "Cần mã bài học". */
  badge: string | null;
  action: { to: string; label: string } | null;
  /** Lời đọc to ở cấp 1. */
  speech: string;
}

type CodeOf = (lessonId: number) => string | null;

function quizCard(item: RecommendedQuiz, codeOf: CodeOf): Suggestion {
  const code = item.needsLessonCode ? null : codeOf(item.lessonId);
  return {
    key: `quiz-${item.quizId}`,
    group: 'quiz',
    title: item.name ?? 'Bài kiểm tra',
    detail: item.lessonTitle ? `Bài học ${item.lessonTitle}` : null,
    reason: item.reason,
    imageUrl: null,
    hasImage: false,
    badge: item.needsLessonCode ? (item.label ?? 'Cần mã bài học') : null,
    action: code ? { to: takeQuizPath(code, item.quizId), label: 'Làm bài' } : { to: pathOf('enterCode'), label: 'Nhập mã bài học' },
    speech: item.name ?? 'Bài kiểm tra',
  };
}

function lessonCard(item: RecommendedLesson, group: 'lessonReview' | 'newLesson'): Suggestion {
  // Bài mới không có mã và không mở trực tiếp: chỉ có tiêu đề và câu nhờ thầy cô.
  const code = group === 'lessonReview' ? item.accessCode : null;
  return {
    key: `${group}-${item.lessonId}`,
    group,
    title: item.title ?? 'Bài học',
    detail: item.hint,
    reason: item.reason,
    imageUrl: null,
    hasImage: false,
    badge: null,
    action: code ? { to: lessonPath(code), label: 'Xem lại bài học' } : null,
    speech: `${item.title ?? 'Bài học'}${item.hint ? `. ${item.hint}` : ''}`,
  };
}

function heritageCard(item: RecommendedHeritage, group: 'heritageReview' | 'related'): Suggestion {
  return {
    key: `${group}-${item.heritageId}`,
    group,
    title: item.name ?? 'Di sản',
    detail: [item.provinceName, item.typeName].filter(Boolean).join(' · ') || null,
    reason: item.reason,
    imageUrl: item.thumbnailUrl,
    hasImage: true,
    badge: null,
    action: item.slug ? { to: heritagePath(item.slug), label: 'Xem chi tiết' } : null,
    speech: item.name ?? 'Di sản',
  };
}

/** Năm phần theo thứ tự trên màn hình; phần rỗng bị bỏ. */
export function suggestionsOf(data: StudentRecommendations, codeOf: CodeOf): Suggestion[] {
  return [
    ...data.nextQuizzes.map((item) => quizCard(item, codeOf)),
    ...data.lessonsToReview.map((item) => lessonCard(item, 'lessonReview')),
    ...data.heritagesToReview.map((item) => heritageCard(item, 'heritageReview')),
    ...data.relatedHeritages.map((item) => heritageCard(item, 'related')),
    ...data.newLessons.map((item) => lessonCard(item, 'newLesson')),
  ];
}

/** Mã bài học của các bài em đã mở (từ trang học), để làm liên kết "Làm bài". */
export function useLessonCodeOf(): CodeOf {
  const home = useStudentHome();
  return (lessonId) => home.data?.myLessons.find((lesson) => lesson.lessonId === lessonId)?.accessCode ?? null;
}

export function hasAnySuggestion(data: StudentRecommendations): boolean {
  return (
    data.nextQuizzes.length + data.lessonsToReview.length + data.heritagesToReview.length + data.relatedHeritages.length + data.newLessons.length > 0 ||
    data.reviewPraise !== null ||
    data.message !== null
  );
}
