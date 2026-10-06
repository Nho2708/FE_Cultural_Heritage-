import type { QuestionDetail } from '@dsvhvn/dung-chung/api';
import { Badge, Icon } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';

// Nội dung một câu hỏi chỉ đọc (kèm đáp án đúng) cho quản trị hệ thống khi kiểm duyệt. Không có ô nhập; đáp án đúng đánh dấu bằng chữ
// "Đáp án đúng" và biểu tượng, không chỉ bằng màu.

function CorrectMark() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 type-label text-success">
      <Icon name="check" size={16} />
      Đáp án đúng
    </span>
  );
}

function Picture({ url }: { url: string | null }) {
  return url ? <img src={url} alt="" loading="lazy" className="max-h-32 rounded-sm object-cover" /> : null;
}

function Row({ correct, children }: { correct?: boolean; children: ReactNode }) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-md border p-3 ${correct ? 'border-success bg-success-container' : 'border-border bg-surface'}`}
    >
      <span className="flex min-w-0 items-center gap-3">{children}</span>
      {correct && <CorrectMark />}
    </li>
  );
}

export function QuestionReadOnlyView({ detail }: { detail: QuestionDetail }) {
  return (
    <div className="flex flex-col gap-4" data-testid="cau-hoi-chi-doc">
      {detail.passage && (
        <blockquote className="rounded-sm bg-surface-container-low p-3 type-body-m">
          {detail.passage}
          {detail.passageSource && <footer className="mt-1 type-body-s text-on-surface-variant">Nguồn: {detail.passageSource}</footer>}
        </blockquote>
      )}
      <p className="type-h4 text-on-surface">{detail.content}</p>
      <Picture url={detail.imageUrl} />

      {detail.questionType === 'TRUE_FALSE' && (
        <ul className="flex flex-col gap-2" aria-label="Đáp án">
          <Row correct={detail.answerIsTrue === true}>Đúng</Row>
          <Row correct={detail.answerIsTrue === false}>Sai</Row>
        </ul>
      )}

      {detail.options.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Các phương án">
          {detail.options.map((option, i) => (
            <Row key={i} correct={option.isCorrect}>
              <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong type-label">
                {String.fromCharCode(65 + i)}
              </span>
              <Picture url={option.imageUrl} />
              <span>{option.content}</span>
            </Row>
          ))}
        </ul>
      )}

      {detail.pairs.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Các cặp ghép đúng">
          {detail.pairs.map((pair, i) => (
            <Row key={i}>
              <Picture url={pair.leftImageUrl} />
              <span>{pair.left}</span>
              <span aria-hidden="true">→</span>
              <span className="font-medium">{pair.right}</span>
            </Row>
          ))}
        </ul>
      )}

      {detail.steps.length > 0 && (
        <ol className="flex flex-col gap-2" aria-label="Thứ tự đúng">
          {detail.steps.map((step, i) => (
            <Row key={i}>
              <span className="type-label tabular-nums text-on-surface-variant">{i + 1}.</span>
              <span>{step}</span>
            </Row>
          ))}
        </ol>
      )}

      {detail.blanks.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Đáp án của các chỗ trống">
          {detail.blanks.map((blank, i) => (
            <Row key={i}>
              <span className="type-label text-on-surface-variant">Chỗ trống {i + 1}:</span>
              <span>{blank.accepted.join(' / ')}</span>
            </Row>
          ))}
        </ul>
      )}

      {detail.statements.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Các mệnh đề">
          {detail.statements.map((statement, i) => (
            <Row key={i}>
              <span>{statement.text}</span>
              <Badge tone={statement.isTrue ? 'success' : 'danger'}>{statement.isTrue ? 'Đúng' : 'Sai'}</Badge>
            </Row>
          ))}
        </ul>
      )}

      {detail.explanation && (
        <div className="rounded-md bg-surface-container-low p-4">
          <p className="type-label text-on-surface">Giải thích</p>
          <p className="mt-1 type-body-m text-on-surface-variant">{detail.explanation}</p>
        </div>
      )}
    </div>
  );
}
