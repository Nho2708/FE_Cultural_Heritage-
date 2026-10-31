import { isWellFormedAccessCode, normalizeLessonCode } from '@dsvhvn/dung-chung';
import { ApiError, errorMessage } from '@dsvhvn/dung-chung/api';
import { LessonLinksProvider, LessonView, type LessonLinks, type LessonPosition } from '@dsvhvn/dung-chung/lesson';
import { ButtonLink, ErrorState, LoadingState } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router';
import { pathOf } from '../access/screens';
import { heritagePath, mapPathOf, timelinePath } from '../discovery/paths';
import { studentApi } from '../lib/api/client';
import { useAuth } from '../lib/auth/context';
import { lessonQueryFn, lessonQueryKey } from '../lessons/lessonData';
import { readPosition, rememberLesson, writePosition } from '../lessons/recent';
import { StartQuizDialog } from '../quiz/QuizIntro';
import { albumQueryKey, homeQueryKey, takeQuizPath } from '../quiz/quizData';

// Bài học (mở bằng mã trên đường dẫn /bai-hoc/<mã>; mã bài kiểm tra thì chuyển thẳng tới bài đó): lấy bài từ máy chủ rồi chọn bố cục theo cấp của lớp em (cấp 1 kể chuyện từng
// bước, cấp 2 bài đọc và dòng thời gian, cấp 3 tài liệu). Học sinh không chọn bố cục. Mã sai, bài chưa xuất bản hoặc không thuộc
// lớp của em đều hiện cùng một câu; nhập sai quá nhiều lần thì hiện câu chặn của máy chủ.

function CodeProblem({ message }: { message: string }) {
  return (
    <section className="dsv-content dsv-section">
      <title>Không mở được bài học · DiViet</title>
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

/**
 * Đường dẫn thật của khu học: mở di sản, bản đồ, dòng thời gian, về trang học, album; hộp thoại bắt đầu làm bài kiểm tra; cấp 1 lấy câu
 * ôn của bước Nhớ lại và ghi bài đã học xong ở bước Nhận thẻ (xong thì con đường và album trên trang học đổi theo).
 */
function useStudentLinks(): LessonLinks {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      heritage: heritagePath,
      map: mapPathOf,
      timeline: timelinePath,
      quizDialog: StartQuizDialog,
      home: pathOf('learnHome'),
      album: pathOf('album'),
      preview: false,
      recall: (code: string) => studentApi.lessonRecall(code).then((r) => r.data),
      completeLesson: (code: string) =>
        studentApi.completeLesson(code).then((r) => {
          void queryClient.invalidateQueries({ queryKey: homeQueryKey });
          void queryClient.invalidateQueries({ queryKey: albumQueryKey });
          return r.data;
        }),
    }),
    [queryClient],
  );
}

export function LessonPage() {
  const { user } = useAuth();
  const links = useStudentLinks();
  const code = normalizeLessonCode(useParams().maBaiHoc ?? '');
  const valid = isWellFormedAccessCode(code);
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

  if (!valid) return <CodeProblem message="Mã gồm 8 ký tự, bắt đầu bằng BH (bài học) hoặc KT (bài kiểm tra). Em hãy kiểm tra lại mã thầy cô đã đưa." />;
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
        <title>Bài học · DiViet</title>
        <LoadingState rows={3} />
      </section>
    );
  }

  if (lesson.focusQuizId) return <Navigate to={takeQuizPath(lesson.accessCode, lesson.focusQuizId)} replace />;

  return (
    <LessonLinksProvider links={links}>
      <LessonView lesson={lesson} initialPosition={initialPosition} onPositionChange={savePosition} />
    </LessonLinksProvider>
  );
}
