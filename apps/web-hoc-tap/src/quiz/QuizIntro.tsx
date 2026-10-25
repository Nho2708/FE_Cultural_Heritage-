import { formatDateTime } from '@dsvhvn/dung-chung';
import type { StudentQuizIntro } from '@dsvhvn/dung-chung/api';
import { Illustration, LevelOneButton, LevelOneSpeak } from '@dsvhvn/dung-chung/lesson';
import { Button, ErrorState, Icon, InlineMessage, LoadingState, Modal } from '@dsvhvn/dung-chung/ui';
import { useNavigate } from 'react-router';
import { resultPath, takeQuizPath } from './quizData';
import { useQuizIntro } from './useQuizIntro';

// Trang giới thiệu trước khi làm bài: tên, số câu, thời gian làm, giờ đóng, lời nhắc "em chỉ được làm một lần" và nút theo việc em làm
// được lúc này (Bắt đầu, Làm tiếp, Xem kết quả, hoặc chỉ Đóng khi chưa mở / đã đóng). Hiện thành hộp thoại trên trang bài học, hoặc
// ngay trên trang làm bài khi em mở thẳng đường dẫn của bài kiểm tra.

function Fact({ icon, children }: { icon: 'file-text' | 'clock' | 'calendar'; children: string }) {
  return (
    <span className="inline-flex items-center gap-2 type-body-m text-on-surface">
      <Icon name={icon} size={18} className="text-on-surface-variant" />
      {children}
    </span>
  );
}

/** Cấp 1: ít chữ, chữ to, không chữ nhỏ, nút "Bắt đầu chơi" 64px; lời nhắc của máy chủ nói cách chơi (thử lại được, chơi một lần). */
function IntroBodyLevelOne({ intro, onClose, code }: { intro: StudentQuizIntro; onClose: () => void; code: string }) {
  const navigate = useNavigate();
  const open = intro.action === 'START' || intro.action === 'CONTINUE';
  const say = [`Bài chơi có ${intro.questionCount} câu.`, intro.notice ?? ''].join(' ').trim();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Illustration state="chao" className="size-20 rounded-full bg-surface-container-low" />
        <p className="min-w-0 flex-1 text-[22px] leading-snug font-bold text-on-surface">{`Bài chơi có ${intro.questionCount} câu`}</p>
        <LevelOneSpeak text={say} label="Nghe cách chơi" size={56} soft />
      </div>
      {intro.description && <p className="text-[20px] leading-[1.5] text-on-surface">{intro.description}</p>}
      {intro.action === 'CONTINUE' && <p className="text-[20px] leading-[1.5] text-on-surface">Em đang chơi dở bài này. Mình chơi tiếp nhé!</p>}
      {intro.action === 'VIEW_RESULT' && <p className="text-[20px] leading-[1.5] text-on-surface">Em đã chơi bài này rồi. Mình cùng xem kết quả nhé!</p>}
      {intro.notice && <p className="rounded-[20px] bg-surface-container-low p-4 text-[20px] leading-[1.5] text-on-surface">{intro.notice}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LevelOneButton variant="secondary" onClick={onClose}>
          {open ? 'Để sau' : 'Đóng'}
        </LevelOneButton>
        {open && (
          <LevelOneButton onClick={() => void navigate(takeQuizPath(code, intro.id), { state: { confirmed: true } })}>
            <Icon name="play" size={24} className="fill-current" />
            {intro.action === 'CONTINUE' ? 'Chơi tiếp' : 'Bắt đầu chơi'}
          </LevelOneButton>
        )}
        {intro.action === 'VIEW_RESULT' && intro.attemptId !== null && (
          <LevelOneButton onClick={() => void navigate(resultPath(intro.attemptId!))}>Xem kết quả</LevelOneButton>
        )}
      </div>
    </div>
  );
}

function IntroBody({ intro, onClose, code }: { intro: StudentQuizIntro; onClose: () => void; code: string }) {
  const navigate = useNavigate();
  if (intro.level === 1) return <IntroBodyLevelOne intro={intro} onClose={onClose} code={code} />;
  const timed = intro.timeLimitMinutes !== null;
  const open = intro.action === 'START' || intro.action === 'CONTINUE';
  const name = intro.name ?? 'Bài kiểm tra';
  const startLabel = 'Bắt đầu';

  return (
    <div className="flex flex-col gap-4">
      <p className="type-label tracking-wide text-on-surface-variant uppercase">Bài học: {intro.lessonTitle}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Fact icon="file-text">{`${intro.questionCount} câu`}</Fact>
        {timed && <Fact icon="clock">{`${intro.timeLimitMinutes} phút`}</Fact>}
        {intro.closeAt && <Fact icon="calendar">{`Đóng lúc ${formatDateTime(intro.closeAt)}`}</Fact>}
      </div>
      {intro.description && (
        <div className="rounded-md bg-surface-container-low p-4">
          <p className="type-label tracking-wide text-on-surface-variant uppercase">Hướng dẫn của thầy cô</p>
          <p className="mt-2 type-body-m text-on-surface">{intro.description}</p>
        </div>
      )}
      {intro.action === 'START' && (
        <p className="type-body-m text-on-surface">
          Bài kiểm tra “{name}” có {intro.questionCount} câu
          {timed ? `, thời gian làm ${intro.timeLimitMinutes} phút` : ', không giới hạn thời gian'}. Em chỉ được làm một lần. Bấm “{startLabel}” để làm bài.
        </p>
      )}
      {intro.action === 'CONTINUE' && (
        <p className="type-body-m text-on-surface">
          Em đang làm dở bài kiểm tra này. Đồng hồ vẫn tính từ lúc em bắt đầu. Bấm “Làm tiếp” để làm tiếp các câu còn lại.
        </p>
      )}
      {intro.action === 'VIEW_RESULT' && <p className="type-body-m text-on-surface">Em đã làm bài kiểm tra này rồi. Bấm “Xem kết quả” để xem lại.</p>}
      {intro.notice && <InlineMessage tone="warning">{intro.notice}</InlineMessage>}
      {open && (
        <InlineMessage tone="warning">{timed ? 'Mỗi em chỉ làm một lần, hết giờ bài tự nộp' : 'Mỗi em chỉ làm một lần'}</InlineMessage>
      )}
      <div className="mt-2 flex flex-wrap justify-end gap-3">
        {open ? (
          <>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Để sau
            </Button>
            <Button size="lg" onClick={() => void navigate(takeQuizPath(code, intro.id), { state: { confirmed: true } })}>
              {intro.action === 'CONTINUE' ? 'Làm tiếp' : startLabel}
            </Button>
          </>
        ) : intro.action === 'VIEW_RESULT' && intro.attemptId !== null ? (
          <>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Đóng
            </Button>
            <Button size="lg" onClick={() => void navigate(resultPath(intro.attemptId!))}>
              Xem kết quả
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="lg" onClick={onClose}>
            Đóng
          </Button>
        )}
      </div>
    </div>
  );
}

/** Nội dung giới thiệu của một bài kiểm tra: tự tải từ máy chủ. */
export function QuizIntroView({ quizId, code, onClose }: { quizId: number; code: string; onClose: () => void }) {
  const query = useQuizIntro(quizId);
  if (query.isPending) return <LoadingState rows={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <IntroBody intro={query.data} onClose={onClose} code={code} />;
}

/** Hộp thoại "Bắt đầu bài kiểm tra" trên trang bài học. */
export function StartQuizDialog({ quizId, name, code, onClose }: { quizId: number | null; name: string | null; code: string; onClose: () => void }) {
  return (
    <Modal open={quizId !== null} title={name ?? 'Bài kiểm tra'} size="panel" onClose={onClose}>
      {quizId !== null && <QuizIntroView quizId={quizId} code={code} onClose={onClose} />}
    </Modal>
  );
}
