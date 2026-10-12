import { cn, formatNumber, hasAnswer, optionLetter, splitBlanks } from '@dsvhvn/dung-chung';
import type { StudentQuestionReview } from '@dsvhvn/dung-chung/api';
import { Badge, Icon } from '@dsvhvn/dung-chung/ui';
import type { QuizLevel } from './QuestionInput';

// Xem lại một câu sau khi nộp (chỉ khi bài kiểm tra cho xem đáp án): câu như em đã thấy, câu em trả lời, đáp án đúng và lời giải thích.
// Cấp 1 chỉ cho thấy đáp án đúng bằng màu xanh, không có dấu sai (kết quả cấp 1 không có đúng sai). Cấp 2 và 3 đánh dấu rõ câu em chọn
// đúng hoặc chưa đúng, kèm nhãn chữ để không chỉ dựa vào màu.

const OK = 'border-success bg-success-container text-on-success-container';
const BAD = 'border-danger bg-danger-container text-on-danger-container';
const PLAIN = 'border-border bg-surface text-on-surface';

function Tag({ ok, children }: { ok: boolean; children: string }) {
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1 type-label">
      <Icon name={ok ? 'check' : 'x'} size={16} />
      {children}
    </span>
  );
}

function Row({ tone, letter, children, tag }: { tone: string; letter?: string; children: React.ReactNode; tag?: React.ReactNode }) {
  return (
    <li className={cn('flex items-center gap-3 rounded-(--dsv-option-radius) border-2 px-4 py-3 type-body-m', tone)}>
      {letter && <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface type-label text-on-surface">{letter}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {tag}
    </li>
  );
}

function Body({ review, level }: { review: StudentQuestionReview; level: QuizLevel }) {
  const { question: q, correctAnswer: correct } = review;
  const mine = q.answer;
  const marks = level !== 1;

  switch (q.questionType) {
    case 'MATCHING':
      return (
        <ul className="grid gap-3 sm:grid-cols-2">
          {q.leftItems.map((item, left) => {
            const rightIndex = correct.matches?.[left] ?? null;
            const mineIndex = mine?.matches?.[left] ?? null;
            const right = rightIndex === null ? '' : (q.rightItems[rightIndex] ?? '');
            const wrong = marks && mineIndex !== rightIndex;
            return (
              <li key={left} className={cn('overflow-hidden rounded-(--dsv-option-radius) border-2', wrong ? BAD : OK)}>
                {item.imageUrl && <img src={item.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />}
                <div className="flex flex-col gap-1 p-3">
                  {item.content && <span className="type-label">{item.content}</span>}
                  <span className="flex items-center gap-2 type-body-m font-medium">
                    <Icon name="check" size={18} />
                    Đáp án đúng: {right}
                  </span>
                  {wrong && (
                    <span className="type-body-s">
                      {mineIndex === null ? 'Em chưa nối hình này.' : `Em đã nối: ${q.rightItems[mineIndex] ?? ''}`}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      );

    case 'ORDERING': {
      const rightOrder = correct.order ?? [];
      const myOrder = mine?.order ?? [];
      const same = rightOrder.length > 0 && rightOrder.every((item, i) => myOrder[i] === item);
      return (
        <div className="flex flex-col gap-3">
          <ol aria-label="Thứ tự đúng" className="flex flex-col gap-2">
            {rightOrder.map((item, position) => (
              <Row key={item} tone={OK} tag={undefined}>
                <span className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary type-label text-on-primary">{position + 1}</span>
                  {q.items[item]}
                </span>
              </Row>
            ))}
          </ol>
          {marks && !same && (
            <p className="type-body-s text-on-surface-variant">
              {myOrder.length === 0 ? 'Em chưa sắp xếp câu này.' : `Em đã xếp: ${myOrder.map((i) => q.items[i]).join(' → ')}`}
            </p>
          )}
        </div>
      );
    }

    case 'FILL_BLANK': {
      const segments = splitBlanks(q.content);
      const words = correct.blanks ?? [];
      const mineWords = mine?.blanks ?? [];
      return (
        <div className="flex flex-col gap-3">
          <p className="type-question text-on-surface">
            {segments.map((text, index) => (
              <span key={index}>
                {text}
                {index < segments.length - 1 && (
                  <strong className="mx-1 rounded-sm bg-success-container px-2 py-0.5 text-on-success-container">{words[index] ?? ''}</strong>
                )}
              </span>
            ))}
          </p>
          {marks && (
            <p className="type-body-s text-on-surface-variant">
              {mineWords.some((w) => w) ? `Em đã điền: ${mineWords.map((w) => w || '(bỏ trống)').join(' · ')}` : 'Em chưa điền chỗ trống nào.'}
            </p>
          )}
        </div>
      );
    }

    case 'MULTI_TRUE_FALSE':
      return (
        <ol className="flex flex-col gap-2">
          {q.statements.map((text, index) => {
            const right = correct.statements?.[index] ?? null;
            const chosen = mine?.statements?.[index] ?? null;
            const ok = chosen === right;
            return (
              <Row
                key={index}
                tone={marks ? (ok ? OK : BAD) : OK}
                letter={`${String.fromCharCode(97 + index)})`}
                tag={
                  marks ? (
                    <Tag ok={ok}>{chosen === null ? 'Em chưa chọn' : ok ? 'Em chọn đúng' : `Em chọn ${chosen ? 'Đúng' : 'Sai'}`}</Tag>
                  ) : undefined
                }
              >
                {text} <strong>— {right ? 'Đúng' : 'Sai'}</strong>
              </Row>
            );
          })}
        </ol>
      );

    default: {
      const rightIndex = correct.selectedIndex ?? null;
      const mineIndex = mine?.selectedIndex ?? null;
      const image = q.questionType === 'IMAGE_CHOICE';
      return (
        <ul className={cn(image ? 'grid gap-3 sm:grid-cols-3' : 'flex flex-col gap-2')}>
          {q.options.map((option, index) => {
            const isRight = index === rightIndex;
            const chosen = index === mineIndex;
            const tone = isRight ? OK : marks && chosen ? BAD : PLAIN;
            const tag = isRight ? (
              <Tag ok>{marks && chosen ? 'Em đã chọn – đúng' : 'Đáp án đúng'}</Tag>
            ) : marks && chosen ? (
              <Tag ok={false}>Em đã chọn – chưa đúng</Tag>
            ) : undefined;
            if (image) {
              return (
                <li key={index} className={cn('overflow-hidden rounded-(--dsv-option-radius) border-2', tone)}>
                  {option.imageUrl && <img src={option.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />}
                  <div className="flex items-center gap-2 p-3 type-body-m">
                    <span className="min-w-0 flex-1">{option.content ?? `Hình ${optionLetter(index)}`}</span>
                    {isRight && <Icon name="check" size={20} />}
                  </div>
                </li>
              );
            }
            return (
              <Row key={index} tone={tone} letter={optionLetter(index)} tag={tag}>
                {option.content}
              </Row>
            );
          })}
        </ul>
      );
    }
  }
}

export function QuestionReview({ review, index, total, level }: { review: StudentQuestionReview; index: number; total: number; level: QuizLevel }) {
  const { question: q } = review;
  const marks = level !== 1 && review.isCorrect !== null;
  // Câu em bỏ trống: máy chủ chấm 0 điểm (isCorrect false) nhưng với em đó là "Bỏ trống", khớp ô "Bỏ trống" ở phần tổng kết, không phải "Sai".
  const blank = marks && !hasAnswer(q, q.answer);
  const partial = review.partsTotal !== null && review.partsTotal > 1 && review.partsCorrect !== null;
  return (
    <article aria-label={`Câu ${index + 1} của phần xem lại`} className="rounded-lg border border-border bg-surface p-5">
      <header className="flex flex-wrap items-center gap-2">
        <span className="type-label tracking-wide text-primary uppercase">
          Câu {index + 1} / {total}
        </span>
        <Badge>{q.typeName}</Badge>
        {marks && (
          <Badge tone={blank ? 'neutral' : review.isCorrect ? 'success' : 'danger'}>
            {blank
              ? 'Bỏ trống'
              : review.isCorrect
                ? 'Đúng'
                : partial && (review.partsCorrect ?? 0) > 0
                  ? `Đúng ${review.partsCorrect} / ${review.partsTotal} ý`
                  : 'Sai'}
          </Badge>
        )}
        {marks && review.pointEarned !== null && q.point !== null && (
          <span className="ml-auto type-body-s text-on-surface-variant">
            {formatNumber(review.pointEarned)} / {formatNumber(q.point)} điểm
          </span>
        )}
      </header>
      {q.passage && (
        <blockquote className="mt-3 rounded-md border-l-4 border-primary bg-surface-container-low p-3 type-body-s italic">
          {q.passage}
          {q.passageSource && <span className="mt-1 block not-italic text-on-surface-variant">Nguồn: {q.passageSource}</span>}
        </blockquote>
      )}
      {q.questionType !== 'FILL_BLANK' && <h3 className={cn('mt-3 text-on-surface', level === 1 ? 'type-h3' : 'type-body-m font-medium')}>{q.content}</h3>}
      {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-3 max-h-64 rounded-md object-cover" loading="lazy" />}
      <div className="mt-4">
        <Body review={review} level={level} />
      </div>
      {review.explanation && (
        <div className="mt-4 flex gap-3 rounded-md bg-surface-container-low p-4">
          <Icon name="info" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
          <div>
            <p className="type-label tracking-wide text-on-surface-variant uppercase">Giải thích</p>
            <p className="mt-1 type-body-m text-on-surface">{review.explanation}</p>
          </div>
        </div>
      )}
    </article>
  );
}
