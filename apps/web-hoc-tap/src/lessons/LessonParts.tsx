import { formatDateTime } from '@dsvhvn/dung-chung';
import type { LessonImageCredit, StudentHeritageCard, StudentQuiz, StudentQuizState } from '@dsvhvn/dung-chung/api';
import { Badge, ButtonLink, Icon, TextLink, type BadgeTone } from '@dsvhvn/dung-chung/ui';
import { heritagePath, mapPathOf, timelinePath } from '../discovery/paths';
import { canTakeQuiz, paragraphsOf, quizActionLabel, quizPath } from './lessonData';

// Phần dùng chung của ba bố cục bài học: đoạn văn, hình kèm chú thích và ghi công, danh sách bài kiểm tra kèm trạng thái với
// riêng em, thẻ di sản,. Ba cấp khác nhau ở bố cục và kích thước, cùng dùng các phần này.

export function Paragraphs({ text, className }: { text: string | null | undefined; className?: string }) {
  return (
    <>
      {paragraphsOf(text).map((paragraph, index) => (
        <p key={index} className={className}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

function creditOf(image: LessonImageCredit | null): string {
  if (!image) return '';
  return [image.credit, image.author, image.license, image.source].filter(Boolean).join(' · ');
}

/** Hình kèm chú thích; ghi công nằm dưới chú thích, luôn hiện đủ để tôn trọng giấy phép ảnh. */
export function LessonFigure({
  url,
  caption,
  image,
  className,
}: {
  url: string | null;
  caption: string | null;
  image: LessonImageCredit | null;
  className?: string;
}) {
  if (!url) return null;
  const credit = creditOf(image);
  return (
    <figure className={className}>
      <img src={url} alt={caption ?? image?.caption ?? ''} loading="lazy" className="w-full rounded-md object-cover" />
      {(caption || credit) && (
        <figcaption className="mt-2 type-body-s text-on-surface-variant">
          {caption}
          {caption && credit ? ' ' : ''}
          {credit && <span>({credit})</span>}
        </figcaption>
      )}
    </figure>
  );
}

const QUIZ_TONE: Record<StudentQuizState, BadgeTone> = {
  OPEN: 'success',
  IN_PROGRESS: 'warning',
  SUBMITTED: 'neutral',
  NOT_OPEN: 'neutral',
  CLOSED: 'neutral',
};

function quizFacts(quiz: StudentQuiz): string {
  const parts: string[] = [];
  parts.push(`${quiz.questionCount} câu`);
  parts.push(quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} phút` : 'không giới hạn thời gian');
  return parts.join(' · ');
}

function quizWhen(quiz: StudentQuiz): string | null {
  if (quiz.state === 'NOT_OPEN' && quiz.openAt) return `Mở lúc ${formatDateTime(quiz.openAt)}`;
  if (quiz.state === 'CLOSED') return quiz.closeAt ? `Đã đóng lúc ${formatDateTime(quiz.closeAt)}` : 'Đã hết hạn';
  if ((quiz.state === 'OPEN' || quiz.state === 'IN_PROGRESS') && quiz.closeAt) return `Đóng lúc ${formatDateTime(quiz.closeAt)}`;
  return null;
}

interface QuizListProps {
  code: string;
  quizzes: StudentQuiz[];
  /** Cỡ: `large` (cấp 1) nút to, ít chữ; `card` (cấp 2) thẻ; `row` (cấp 3) dòng gọn. */
  variant: 'large' | 'card' | 'row';
}

export function QuizList({ code, quizzes, variant }: QuizListProps) {
  if (quizzes.length === 0) {
    return <p className="type-body-m text-on-surface-variant">Bài học này chưa có bài kiểm tra nào.</p>;
  }
  return (
    <ul className={variant === 'row' ? 'divide-y divide-border rounded-md border border-border bg-surface' : 'flex flex-col gap-3'}>
      {quizzes.map((quiz) => {
        const action = quizActionLabel(quiz);
        const when = quizWhen(quiz);
        const link = canTakeQuiz(quiz) && action && (
          <ButtonLink to={quizPath(code, quiz.id)} size={variant === 'large' ? 'lg' : 'md'} variant={variant === 'row' ? 'primary' : 'primary'}>
            {variant === 'large' && <Icon name="play" size={22} />}
            {action}
          </ButtonLink>
        );
        if (variant === 'row') {
          return (
            <li key={quiz.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 type-label text-on-surface">
                  {quiz.name}
                  <Badge tone={QUIZ_TONE[quiz.state]}>{quiz.stateLabel}</Badge>
                </p>
                <p className="mt-1 type-body-s text-on-surface-variant">{[quizFacts(quiz), when].filter(Boolean).join(' · ')}</p>
              </div>
              {link}
            </li>
          );
        }
        return (
          <li
            key={quiz.id}
            className={
              variant === 'large'
                ? 'rounded-lg border-2 border-border bg-surface p-(--dsv-inline-gap)'
                : 'rounded-md border border-border bg-surface p-4'
            }
          >
            <Badge tone={QUIZ_TONE[quiz.state]}>{quiz.stateLabel}</Badge>
            <p className={variant === 'large' ? 'mt-2 type-h3 text-on-surface' : 'mt-2 type-label text-on-surface'}>{quiz.name}</p>
            <p className="mt-1 type-body-s text-on-surface-variant">{quizFacts(quiz)}</p>
            {when && <p className="mt-1 type-body-s text-on-surface-variant">{when}</p>}
            {link && <div className="mt-3">{link}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Thẻ di sản của bài (chỉ di sản đang xuất bản): chi tiết, bản đồ, dòng thời gian. */
export function HeritageLinks({ heritages, compact }: { heritages: StudentHeritageCard[]; compact?: boolean }) {
  if (heritages.length === 0) return <p className="type-body-m text-on-surface-variant">Chưa có di sản đang hiển thị.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {heritages.map((h) => (
        <li key={h.id} className="flex overflow-hidden rounded-md border border-border bg-surface">
          {!compact &&
            (h.thumbnailUrl ? (
              <img src={h.thumbnailUrl} alt="" loading="lazy" className="hidden w-40 shrink-0 object-cover dsvsm:block" />
            ) : (
              <span className="hidden w-40 shrink-0 items-center justify-center bg-image-placeholder text-on-surface-variant dsvsm:flex">
                <Icon name="book-open" size={28} />
              </span>
            ))}
          <div className="min-w-0 flex-1 p-4">
            <p className="type-label text-on-surface">{h.name}</p>
            {h.provinceName && <p className="mt-1 type-body-s text-on-surface-variant">{h.provinceName}</p>}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 type-body-s">
              <TextLink to={heritagePath(h.slug)}>Xem chi tiết</TextLink>
              {h.latitude !== null && h.longitude !== null && <TextLink to={mapPathOf(h.slug)}>Xem trên bản đồ</TextLink>}
              {h.hasTimeline && <TextLink to={timelinePath(h.slug)}>Dòng thời gian</TextLink>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
