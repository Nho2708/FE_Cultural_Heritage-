import { normalizeLessonCode } from '@dsvhvn/dung-chung';
import { ApiError, type StudentAttemptResult } from '@dsvhvn/dung-chung/api';
import { ButtonLink, ErrorState, InlineMessage, LoadingState } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { pathOf } from '../access/screens';
import { lessonPath } from '../lessons/lessonData';
import { studentApi } from '../lib/api/client';
import { QuizIntroView } from '../quiz/QuizIntro';
import { parseQuizId, refreshAfterSubmit, resultPath, resultQueryKey } from '../quiz/quizData';
import { QuizRunner } from '../quiz/QuizRunner';
import { useQuizIntro } from '../quiz/useQuizIntro';

// Làm bài kiểm tra (toàn màn hình, không thanh điều hướng). Mở thẳng đường dẫn thì hiện trang giới thiệu để em bấm Bắt đầu hoặc Làm tiếp;
// từ hộp thoại trên trang bài học (đã bấm Bắt đầu) vào thẳng bài. Lượt đã nộp thì chuyển sang kết quả. Bố cục làm bài chọn theo cấp của lớp.

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-center gap-5 px-4 py-10">
      <title>{`${title} · Học di sản`}</title>
      {children}
    </section>
  );
}

function BackLinks({ code }: { code: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <ButtonLink to={lessonPath(code)} variant="secondary" size="lg">
        Về bài học
      </ButtonLink>
      <ButtonLink to={pathOf('learnHome')} size="lg">
        Về trang học
      </ButtonLink>
    </div>
  );
}

/** Em đã nộp bài này rồi (máy chủ trả 409 khi bắt đầu): hỏi lại mã lượt để đi xem kết quả. */
function ResultRedirect({ quizId, code }: { quizId: number; code: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    let live = true;
    studentApi
      .quizIntro(quizId)
      .then(({ data }) => live && void navigate(data.attemptId !== null ? resultPath(data.attemptId) : lessonPath(code), { replace: true }))
      .catch(() => live && void navigate(lessonPath(code), { replace: true }));
    return () => {
      live = false;
    };
  }, [code, navigate, quizId]);
  return (
    <Frame title="Làm bài kiểm tra">
      <LoadingState rows={3} />
    </Frame>
  );
}

function AttemptLoader({ quizId, code }: { quizId: number; code: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Bắt đầu hoặc vào tiếp lượt: máy chủ trả đúng một lượt cho mỗi em mỗi bài, gọi lại không tạo thêm lượt.
  const query = useQuery({
    queryKey: ['student', 'attempt', quizId],
    queryFn: () => studentApi.startAttempt(quizId).then((r) => r.data),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnMount: false,
  });

  const onFinished = useCallback(
    (result: StudentAttemptResult, automatic: boolean) => {
      queryClient.setQueryData(resultQueryKey(result.attemptId), result);
      refreshAfterSubmit(queryClient);
      void navigate(resultPath(result.attemptId), { replace: true, state: { automatic, lessonCode: code } });
    },
    [code, navigate, queryClient],
  );

  if (query.isPending) {
    return (
      <Frame title="Làm bài kiểm tra">
        <LoadingState rows={4} label="Đang mở bài kiểm tra…" />
      </Frame>
    );
  }
  if (query.isError) {
    const error = query.error;
    if (error instanceof ApiError && error.status === 409) return <ResultRedirect quizId={quizId} code={code} />;
    return (
      <Frame title="Chưa làm được bài kiểm tra">
        <h1 className="type-h1 text-on-surface">Chưa mở được bài kiểm tra</h1>
        {error instanceof ApiError && error.status < 500 && error.status !== 0 ? (
          <InlineMessage tone="warning">{error.message}</InlineMessage>
        ) : (
          <ErrorState error={error} onRetry={() => void query.refetch()} />
        )}
        <BackLinks code={code} />
      </Frame>
    );
  }
  if (query.data.questions.length === 0) {
    return (
      <Frame title="Làm bài kiểm tra">
        <InlineMessage tone="warning">Bài kiểm tra này chưa có câu hỏi nào. Em hãy báo thầy cô nhé.</InlineMessage>
        <BackLinks code={code} />
      </Frame>
    );
  }
  return <QuizRunner key={query.data.id} attempt={query.data} onFinished={onFinished} />;
}

export function TakeQuizPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const code = normalizeLessonCode(params.maBaiHoc ?? '');
  const quizId = parseQuizId(params.baiKiemTra);
  const confirmed = (location.state as { confirmed?: boolean } | null)?.confirmed === true;
  const intro = useQuizIntro(quizId ?? 0);

  if (quizId === null) {
    return (
      <Frame title="Không tìm thấy bài kiểm tra">
        <h1 className="type-h1 text-on-surface">Không tìm thấy bài kiểm tra</h1>
        <BackLinks code={code} />
      </Frame>
    );
  }
  if (intro.isPending) {
    return (
      <Frame title="Bài kiểm tra">
        <LoadingState rows={3} />
      </Frame>
    );
  }
  if (intro.isError) {
    return (
      <Frame title="Bài kiểm tra">
        <ErrorState error={intro.error} onRetry={() => void intro.refetch()} />
        <BackLinks code={code} />
      </Frame>
    );
  }
  const data = intro.data;
  if (data.action === 'VIEW_RESULT' && data.attemptId !== null) return <Navigate to={resultPath(data.attemptId)} replace />;
  if ((data.action === 'START' || data.action === 'CONTINUE') && confirmed) return <AttemptLoader quizId={quizId} code={code} />;

  return (
    <Frame title={data.name ?? 'Bài kiểm tra'}>
      <h1 className="type-h1 text-on-surface">{data.name ?? 'Bài kiểm tra'}</h1>
      <div className="rounded-md border border-border bg-surface p-6">
        <QuizIntroView quizId={quizId} code={code} onClose={() => void navigate(lessonPath(code))} />
      </div>
    </Frame>
  );
}
