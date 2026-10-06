import { POINT_RULE_TEXT, QUIZ_LIMITS, cn, formatPoint, formatPoints, isValidPoint, parsePoint } from '@dsvhvn/dung-chung';
import type { QuizDetail, QuizQuestionItem } from '@dsvhvn/dung-chung/api';
import { Badge, Button, EmptyState, Icon } from '@dsvhvn/dung-chung/ui';
import { useState } from 'react';
import { useReorder } from '../heritage/reorder';
import { ReorderHandle } from '../heritage/ReorderHandle';

// Danh sách câu hỏi của bài kiểm tra: điểm từng câu (bước 0,25), kéo thả hoặc phím mũi tên để đổi thứ tự, bỏ câu, tổng điểm tự tính.
// Mỗi thao tác gửi lên máy chủ ngay; máy chủ tính lại thứ tự liên tục từ 1 và tổng điểm. Câu không còn dùng được ở cấp của lớp hiện
// cảnh báo đỏ và chặn phát hành. Sau khi phát hành danh sách bị khóa: chỉ đọc, chỉ còn nút xem.

interface QuizQuestionListProps {
  quiz: QuizDetail;
  /** Có thể thay đổi danh sách (bài Nháp và không đang bận). */
  editable: boolean;
  onReplace: (items: QuizQuestionItem[]) => void;
  onRemove: (questionId: number) => void;
  onAdd: () => void;
  onPreview: (index: number) => void;
}

export function QuizQuestionList({ quiz, editable, onReplace, onRemove, onAdd, onPreview }: QuizQuestionListProps) {
  const questions = quiz.questions;
  const ids = questions.map((q) => q.questionId);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [invalid, setInvalid] = useState<Record<number, boolean>>({});

  const items = (order: readonly number[]): QuizQuestionItem[] =>
    order.map((id) => ({ questionId: id, point: questions.find((q) => q.questionId === id)?.point ?? 1 }));
  const reorder = useReorder(ids, (next) => onReplace(items(next)), !editable);

  const commitPoint = (questionId: number, current: number) => {
    const text = drafts[questionId];
    if (text === undefined) return;
    const value = parsePoint(text);
    if (value === null || !isValidPoint(value)) {
      setInvalid((state) => ({ ...state, [questionId]: true }));
      return;
    }
    setInvalid((state) => ({ ...state, [questionId]: false }));
    setDrafts((state) => {
      const { [questionId]: _removed, ...rest } = state;
      return rest;
    });
    if (value !== current) onReplace(items(ids).map((item) => (item.questionId === questionId ? { ...item, point: value } : item)));
  };

  return (
    <section aria-labelledby="danh-sach-cau" className="rounded-md border border-border bg-surface p-5 dsvmd:p-6">
      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-start dsvmd:justify-between">
        <div>
          <h2 id="danh-sach-cau" className="type-h3 text-on-surface">
            Danh sách câu hỏi ({quiz.questionCount} câu)
          </h2>
          <p className="mt-1 type-body-s text-on-surface-variant">
            Tổng điểm tự tính: {formatPoints(quiz.totalPoint)}
            {editable && ` · chỉ thêm được câu đã duyệt có dạng dùng được ở lớp cấp ${quiz.schoolLevel}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {questions.length > 0 && (
            <Button variant="secondary" onClick={() => onPreview(0)}>
              <Icon name="eye" size={16} />
              Xem trước như học sinh
            </Button>
          )}
          {editable && (
            <Button variant="secondary" onClick={onAdd} disabled={questions.length >= QUIZ_LIMITS.maxQuestions}>
              <Icon name="plus" size={16} />
              Thêm câu từ ngân hàng
            </Button>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon="file-text" title="Bài kiểm tra chưa có câu hỏi nào.">
            {editable ? 'Bấm "Thêm câu từ ngân hàng" để chọn câu đã duyệt, đúng dạng của lớp.' : 'Bài đã phát hành thì danh sách câu không đổi được.'}
          </EmptyState>
        </div>
      ) : (
        <div className="relative mt-4 overflow-x-auto rounded-md border border-(--dsv-table-border)">
          <table className="w-full min-w-[720px] border-collapse text-left type-body-s">
            <caption className="sr-only">Câu hỏi của bài kiểm tra</caption>
            <thead>
              <tr className="bg-(--dsv-table-header-bg) text-on-surface-variant">
                <th scope="col" className="h-11 w-12 px-3">
                  <span className="sr-only">Đổi thứ tự</span>
                </th>
                <th scope="col" className="w-10 px-2 type-label">#</th>
                <th scope="col" className="px-2 type-label">Nội dung câu hỏi</th>
                <th scope="col" className="px-2 type-label">Dạng câu</th>
                <th scope="col" className="px-2 type-label">Di sản</th>
                <th scope="col" className="px-2 type-label">Điểm</th>
                <th scope="col" className="w-24 px-2 type-label">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, index) => {
                const text = drafts[q.questionId] ?? formatPoint(q.point);
                return (
                  <tr
                    key={q.questionId}
                    id={`cau-${index + 1}`}
                    data-testid={`cau-${index + 1}`}
                    {...(editable ? reorder.source(q.questionId) : {})}
                    {...(editable ? reorder.target(q.questionId) : {})}
                    className={cn(
                      'border-t border-(--dsv-table-border) align-top',
                      !q.isUsable && 'bg-danger-container',
                      reorder.over === q.questionId && reorder.dragging !== q.questionId && 'outline-2 -outline-offset-2 outline-primary',
                      reorder.dragging === q.questionId && 'opacity-50',
                    )}
                  >
                    <td className="px-3 py-3">
                      {editable && <ReorderHandle name={`Câu ${index + 1}`} onKeyDown={reorder.handleKeys(q.questionId)} />}
                    </td>
                    <td className="px-2 py-3 type-mono-label">{index + 1}</td>
                    <td className="max-w-[380px] px-2 py-3">
                      <p className="text-on-surface">{q.content}</p>
                      {!q.isUsable && (
                        <p role="alert" className="mt-2 flex items-start gap-2 type-body-s text-on-danger-container">
                          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
                          <span>
                            {q.unusableReason}
                            {editable && ' Bấm dấu x để bỏ câu này khỏi bài kiểm tra.'}
                          </span>
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <Badge>{q.typeName}</Badge>
                    </td>
                    <td className="px-2 py-3">{q.heritageName}</td>
                    <td className="px-2 py-3">
                      {editable ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Điểm câu ${index + 1}`}
                              aria-invalid={invalid[q.questionId] || undefined}
                              value={text}
                              onChange={(e) => setDrafts((state) => ({ ...state, [q.questionId]: e.target.value }))}
                              onBlur={() => commitPoint(q.questionId, q.point)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  commitPoint(q.questionId, q.point);
                                }
                              }}
                              className={cn(
                                'h-9 w-16 rounded-sm border bg-surface px-2 text-center type-body-m',
                                invalid[q.questionId] ? 'border-danger' : 'border-border-strong',
                              )}
                            />
                            <span className="text-on-surface-variant">điểm</span>
                          </span>
                          {invalid[q.questionId] && (
                            <span role="alert" className="type-body-s text-danger">
                              {POINT_RULE_TEXT}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="whitespace-nowrap">{formatPoints(q.point)}</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Xem trước câu ${index + 1}`} onClick={() => onPreview(index)}>
                          <Icon name="eye" size={18} />
                        </Button>
                        {editable && (
                          <Button variant="ghost" size="icon" aria-label={`Bỏ câu ${index + 1} khỏi bài kiểm tra`} onClick={() => onRemove(q.questionId)}>
                            <Icon name="x" size={18} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-(--dsv-table-border) px-4 py-3 type-body-s text-on-surface-variant">
            {editable
              ? 'Kéo tay nắm ở đầu dòng để đổi thứ tự · bấm dấu x để bỏ câu khỏi bài kiểm tra (câu vẫn ở ngân hàng) · '
              : 'Bài đã phát hành: danh sách câu, điểm và thứ tự đã khóa; muốn đổi câu thì nhân bản bài kiểm tra · '}
            Tổng điểm: {formatPoints(quiz.totalPoint)}
            {quiz.schoolLevel === 1 && ' · học sinh cấp 1 thấy sao thay cho điểm'}
          </p>
        </div>
      )}
    </section>
  );
}
