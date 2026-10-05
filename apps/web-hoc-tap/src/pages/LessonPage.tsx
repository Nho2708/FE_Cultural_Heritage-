import { isWellFormedLessonCode, normalizeLessonCode } from '@dsvhvn/dung-chung';
import { ApiError, errorMessage } from '@dsvhvn/dung-chung/api';
import { ButtonLink, ErrorState, LoadingState } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { pathOf } from '../access/screens';
import { useAuth } from '../lib/auth/context';
import { lessonQueryFn, lessonQueryKey } from '../lessons/lessonData';
import { LevelOneLesson } from '../lessons/LevelOneLesson';
import { LevelThreeLesson } from '../lessons/LevelThreeLesson';
import { LevelTwoLesson } from '../lessons/LevelTwoLesson';
import { rememberLesson } from '../lessons/recent';

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

  switch (lesson.schoolLevel) {
    case 1:
      return <LevelOneLesson key={lesson.id} lesson={lesson} userId={userId} />;
    case 2:
      return <LevelTwoLesson key={lesson.id} lesson={lesson} />;
    default:
      return <LevelThreeLesson key={lesson.id} lesson={lesson} />;
  }
}
