import { cn, formatNumber, optionLetter, splitBlanks } from '@dsvhvn/dung-chung';
import type { TeacherQuestionReview } from '@dsvhvn/dung-chung/api';
import { Badge, Icon } from '@dsvhvn/dung-chung/ui';

// Một câu trong Chi tiết bài làm của giáo viên: câu như em đã thấy, câu em trả lời đặt cạnh đáp án đúng, đúng hay sai, điểm đạt
// (câu nhiều phần có số phần đúng) và giải thích. Giáo viên luôn thấy đúng sai ở mọi cấp, kể cả khi bài không cho em xem đáp án.

const OK = 'border-success bg-success-container text-on-success-container';
const BAD = 'border-danger bg-danger-container text-on-danger-container';
const PLAIN = 'border-border bg-surface text-on-surface';

function Row({ tone, letter, children, tag }: { tone: string; letter?: string; children: React.ReactNode; tag?: React.ReactNode }) {
  return (
    <li className={cn('flex items-center gap-3 rounded-md border px-4 py-2.5 type-body-m', tone)}>
      {letter && <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface type-label text-on-surface">{letter}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {tag && <span className="inline-flex shrink-0 items-center gap-1 type-label">{tag}</span>}
    </li>
  );
}

const Tag = ({ ok, children }: { ok: boolean; children: string }) => (
  <>
    <Icon name={ok ? 'check' : 'x'} size={16} />
    {children}
  </>
);

function Body({ review }: { review: TeacherQuestionReview }) {
  const { question: q, correctAnswer: correct } = review;
  const mine = q.answer;

  switch (q.questionType) {
    case 'MATCHING':
      return (
        <ul className="flex flex-col gap-2">
          {q.leftItems.map((item, left) => {
            const rightIndex = correct.matches?.[left] ?? null;
            const mineIndex = mine?.matches?.[left] ?? null;
            const ok = mineIndex === rightIndex;
            const name = item.content ?? `Hình ${left + 1}`;
            return (
              <Row key={left} tone={ok ? OK : BAD} tag={<Tag ok={ok}>{ok ? 'Nối đúng' : mineIndex === null ? 'Em chưa nối' : 'Nối chưa đúng'}</Tag>}>
                <span className="block type-label">{name}</span>
                <span className="block type-body-s">
                  Đáp án đúng: {rightIndex === null ? '' : (q.rightItems[rightIndex] ?? '')}
                  {!ok && mineIndex !== null && ` · Em đã nối: ${q.rightItems[mineIndex] ?? ''}`}
                </span>
              </Row>
            );
          })}
        </ul>
      );

    case 'ORDERING': {
      const rightOrder = correct.order ?? [];
      const myOrder = mine?.order ?? [];
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 type-label text-on-surface-variant">Thứ tự em đã sắp</p>
            {myOrder.length === 0 ? (
              <p className="type-body-s text-on-surface-variant">Em chưa sắp xếp câu này.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {myOrder.map((item, position) => {
                  const ok = rightOrder[position] === item;
                  return (
                    <Row key={item} tone={ok ? OK : BAD} letter={String(position + 1)} tag={<Tag ok={ok}>{ok ? 'Đúng vị trí' : 'Sai vị trí'}</Tag>}>
                      {q.items[item]}
                    </Row>
                  );
                })}
              </ol>
            )}
          </div>
          <div>
            <p className="mb-2 type-label text-on-surface-variant">Thứ tự đúng</p>
            <ol className="flex flex-col gap-2">
              {rightOrder.map((item, position) => (
                <Row key={item} tone={PLAIN} letter={String(position + 1)}>
                  {q.items[item]}
                </Row>
              ))}
            </ol>
          </div>
        </div>
      );
    }

    case 'FILL_BLANK': {
      const segments = splitBlanks(q.content);
      const words = correct.blanks ?? [];
      const mineWords = mine?.blanks ?? [];
      return (
        <div className="flex flex-col gap-3">
          <p className="type-body-m text-on-surface">
            {segments.map((text, index) => {
              const given = (mineWords[index] ?? '').trim();
              const expected = (words[index] ?? '').trim();
              const ok = given !== '' && given.toLocaleLowerCase('vi') === expected.toLocaleLowerCase('vi');
              return (
                <span key={index}>
                  {text}
                  {index < segments.length - 1 && (
                    <strong
                      className={cn(
                        'mx-1 rounded-sm px-2 py-0.5',
                        given === '' ? 'bg-surface-container-high' : ok ? 'bg-success-container text-on-success-container' : 'bg-danger-container text-on-danger-container',
                      )}
                    >
                      {given === '' ? '(bỏ trống)' : given}
                    </strong>
                  )}
                </span>
              );
            })}
          </p>
          <p className="type-body-s text-on-surface-variant">Từ đúng: {words.map((w, i) => `chỗ ${i + 1}: ${w}`).join(' · ')}</p>
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
                tone={ok ? OK : BAD}
                letter={`${String.fromCharCode(97 + index)})`}
                tag={<Tag ok={ok}>{chosen === null ? 'Em chưa chọn' : `Em chọn ${chosen ? 'Đúng' : 'Sai'}`}</Tag>}
              >
                {text} <strong>— đáp án {right ? 'Đúng' : 'Sai'}</strong>
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
        <div className="flex flex-col gap-2">
          {mineIndex === null && (
            <p className="rounded-md border border-dashed border-border-strong px-4 py-2.5 type-body-s text-on-surface-variant">
              Bỏ trống — em không chọn phương án nào.
            </p>
          )}
          <ul className={cn(image ? 'grid gap-3 sm:grid-cols-3' : 'flex flex-col gap-2')}>
            {q.options.map((option, index) => {
              const isRight = index === rightIndex;
              const chosen = index === mineIndex;
              const tone = isRight ? OK : chosen ? BAD : PLAIN;
              const tag = isRight ? <Tag ok>{chosen ? 'Em chọn – đúng' : 'Đáp án đúng'}</Tag> : chosen ? <Tag ok={false}>Em chọn – chưa đúng</Tag> : undefined;
              if (image) {
                return (
                  <li key={index} className={cn('overflow-hidden rounded-md border', tone)}>
                    {option.imageUrl && <img src={option.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />}
                    <div className="flex items-center gap-2 p-3 type-body-s">
                      <span className="min-w-0 flex-1">{option.content ?? `Hình ${optionLetter(index)}`}</span>
                      {tag && <span className="inline-flex items-center gap-1 type-label">{tag}</span>}
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
        </div>
      );
    }
  }
}

export function AttemptQuestionReview({ review, index }: { review: TeacherQuestionReview; index: number }) {
  const { question: q } = review;
  const partial = review.partsTotal !== null && review.partsTotal > 1 && review.partsCorrect !== null;
  const verdict = review.isCorrect
    ? { tone: 'success' as const, text: 'Đúng' }
    : !q.answered
      ? { tone: 'neutral' as const, text: 'Bỏ trống' }
      : partial && (review.partsCorrect ?? 0) > 0
        ? { tone: 'warning' as const, text: 'Đúng một phần' }
        : { tone: 'danger' as const, text: 'Sai' };
  return (
    <article aria-label={`Câu ${index + 1}`} className="rounded-md border border-border bg-surface p-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className="type-label tracking-wide text-on-surface-variant uppercase">Câu {index + 1}</span>
        <Badge>{q.typeName}</Badge>
        <Badge tone={verdict.tone}>{verdict.text}</Badge>
        {review.pointEarned !== null && q.point !== null && (
          <span className="ml-auto type-body-s text-on-surface-variant">
            {formatNumber(review.pointEarned)}/{formatNumber(q.point)} điểm
            {partial && ` · ${review.partsCorrect}/${review.partsTotal} ý đúng`}
          </span>
        )}
      </header>
      {q.passage && (
        <blockquote className="mt-3 rounded-md border-l-4 border-primary bg-surface-container-low p-3 type-body-s italic">
          {q.passage}
          {q.passageSource && <span className="mt-1 block not-italic text-on-surface-variant">Nguồn: {q.passageSource}</span>}
        </blockquote>
      )}
      {q.questionType !== 'FILL_BLANK' && <p className="mt-3 type-body-m font-medium text-on-surface">{q.content}</p>}
      {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-3 max-h-48 rounded-md object-cover" loading="lazy" />}
      <div className="mt-3">
        <Body review={review} />
      </div>
      {review.explanation && (
        <div className="mt-3 flex gap-3 rounded-md bg-surface-container-low p-3">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
          <p className="type-body-s text-on-surface">
            <span className="font-medium">Giải thích: </span>
            {review.explanation}
          </p>
        </div>
      )}
    </article>
  );
}
