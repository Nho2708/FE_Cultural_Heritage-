import { isWellFormedLessonCode, normalizeLessonCode } from '@dsvhvn/dung-chung';
import { ApiError, errorMessage } from '@dsvhvn/dung-chung/api';
import { LessonLinksProvider, LessonView, type LessonLinks, type LessonPosition } from '@dsvhvn/dung-chung/lesson';
import { ButtonLink, ErrorState, LoadingState } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { pathOf } from '../access/screens';
import { heritagePath, mapPathOf, timelinePath } from '../discovery/paths';
import { useAuth } from '../lib/auth/context';
import { lessonQueryFn, lessonQueryKey } from '../lessons/lessonData';
import { readPosition, rememberLesson, writePosition } from '../lessons/recent';
import { StartQuizDialog } from '../quiz/QuizIntro';

// Bài học (mở bằng mã trên đường dẫn /bai-hoc/<mã>): lấy bài từ máy chủ rồi chọn bố cục theo cấp của lớp em (cấp 1 kể chuyện từng
// bước, cấp 2 bài đọc và dòng thời gian, cấp 3 tài liệu). Học sinh không chọn bố cục. Mã sai, bài chưa xuất bản hoặc không thuộc
// lớp của em đều hiện cùng một câu; nhập sai quá nhiều lần thì hiện câu chặn của máy chủ.

function CodeProblem({ message }: { message: string }) {
  return (
    <section className="dsv-content dsv-section">
      <title>Không mở được bài học · Học di sản</title>
      <div className="mx-auto max-w-[560px] py-10">
        <h1 className="type-h1 text-on-surface">Chưa mở được bài học</h1>
        <p role="alert" className="mt-3 type-body-m text-on-surface-variant">
          {message}
        </p>
        <div className="mt-6">
          <ButtonLink to={pathOf('enterCode')} size="lg">
            Nhập mã khác
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Đường dẫn thật của khu học: mở di sản, bản đồ, dòng thời gian, về trang học; hộp thoại bắt đầu làm bài kiểm tra. */
const STUDENT_LINKS: LessonLinks = {
  heritage: heritagePath,
  map: mapPathOf,
  timeline: timelinePath,
  quizDialog: StartQuizDialog,
  home: pathOf('learnHome'),
  preview: false,
};

export function LessonPage() {
  const { user } = useAuth();
  const code = normalizeLessonCode(useParams().maBaiHoc ?? '');
  const valid = isWellFormedLessonCode(code);
  const query = useQuery({ queryKey: lessonQueryKey(code), queryFn: lessonQueryFn(code), enabled: valid, staleTime: 0 });
  const lesson = query.data;
  const userId = user?.id;

  useEffect(() => {
    if (lesson && userId !== undefined) rememberLesson(userId, { code: lesson.accessCode, title: lesson.title ?? 'Bài học' });
  }, [lesson, userId]);

  const lessonCode = lesson?.accessCode;
  const initialPosition = useMemo(
    () => (lessonCode !== undefined && userId !== undefined ? readPosition(userId, lessonCode) : undefined),
    [lessonCode, userId],
  );
  const savePosition = useCallback(
    (position: LessonPosition) => {
      if (lessonCode !== undefined && userId !== undefined) writePosition(userId, lessonCode, position);
    },
    [lessonCode, userId],
  );

  if (!valid) return <CodeProblem message="Mã bài học gồm 8 ký tự, bắt đầu bằng BH. Em hãy kiểm tra lại mã thầy cô đã đưa." />;
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    if (status === 404 || status === 429) return <CodeProblem message={errorMessage(query.error)} />;
    return (
      <section className="dsv-content dsv-section">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </section>
    );
  }
  if (!lesson || userId === undefined) {
    return (
      <section className="dsv-content dsv-section">
        <title>Bài học · Học di sản</title>
        <LoadingState rows={3} />
      </section>
    );
  }

  return (
    <LessonLinksProvider links={STUDENT_LINKS}>
      <LessonView lesson={lesson} initialPosition={initialPosition} onPositionChange={savePosition} />
    </LessonLinksProvider>
  );
}
