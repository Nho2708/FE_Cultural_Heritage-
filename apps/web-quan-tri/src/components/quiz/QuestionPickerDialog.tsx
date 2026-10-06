import { DIFFICULTIES, DIFFICULTY_LABEL, QUESTION_TYPE_LABEL, QUIZ_LIMITS, cn, typesForLevel } from '@dsvhvn/dung-chung';
import { errorMessage, type QuestionDifficulty, type QuestionType, type QuizDetail } from '@dsvhvn/dung-chung/api';
import { Badge, Button, EmptyState, ErrorState, Icon, InlineMessage, LoadingState, Modal, Pagination, SearchForm, SelectField } from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '../../lib/api/queryKeys';
import { quizzesApi } from '../../lib/api/quizEndpoints';
import { DifficultyBadge } from '../question/QuestionBits';
import { QuestionPreviewDialog } from './QuestionPreviewDialog';

// Chọn câu từ ngân hàng (hộp thoại): câu đã duyệt, chưa ẩn, dùng chung mọi trường, và chỉ hiện câu có dạng dùng được ở cấp của lớp làm bài
// (câu khác dạng bị ẩn, không chọn được). Mặc định lọc theo các di sản của bài học; lọc thêm độ khó, dạng câu, từ khóa. Chọn nhiều câu,
// kể cả qua nhiều trang; câu đã có trong bài hiện mờ. Con mắt mở câu ở chế độ xem trước như học sinh, chồng lên hộp thoại này và không
// làm mất các câu đang chọn. Mỗi câu thêm vào được 1 điểm, sửa ở danh sách câu.

const PAGE_SIZE = 10;

interface QuestionPickerDialogProps {
  quiz: QuizDetail;
  onAdd: (questionIds: number[]) => Promise<void>;
  onClose: () => void;
}

export function QuestionPickerDialog({ quiz, onAdd, onClose }: QuestionPickerDialogProps) {
  const [lessonOnly, setLessonOnly] = useState(true);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>('');
  const [type, setType] = useState<QuestionType | ''>('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filter = { questionType: type, difficultyLevel: difficulty, lessonHeritagesOnly: lessonOnly, keyword, page, pageSize: PAGE_SIZE };
  const list = useQuery({
    queryKey: queryKeys.quizCandidates(quiz.id, filter),
    queryFn: () => quizzesApi.candidates(quiz.id, filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const allowed: QuestionType[] = list.data?.allowedTypes ?? typesForLevel(quiz.schoolLevel);
  const room = QUIZ_LIMITS.maxQuestions - quiz.questionCount;
  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < room) next.add(id);
      return next;
    });

  const add = async () => {
    setAdding(true);
    setError(null);
    try {
      await onAdd([...selected]);
    } catch (err) {
      setError(errorMessage(err));
      setAdding(false);
    }
  };

  const rows = list.data?.items ?? [];

  return (
    <>
      <Modal
        open
        title="Chọn câu từ ngân hàng"
        description={
          lessonOnly
            ? `Câu đã duyệt, dùng chung cho mọi trường. Mặc định lọc theo các di sản của bài học ${quiz.lessonTitle ?? ''}.`
            : 'Câu đã duyệt, dùng chung cho mọi trường. Đang xem câu của mọi di sản.'
        }
        size="wide"
        busy={adding}
        onClose={onClose}
      >
        <div className="flex flex-col gap-4">
          <InlineMessage tone="info">
            Chỉ hiện câu có dạng dùng được ở lớp cấp {quiz.schoolLevel} ({allowed.map((t) => QUESTION_TYPE_LABEL[t]).join(', ')}). Câu dạng khác bị ẩn, không chọn được.
          </InlineMessage>
          {error && <InlineMessage tone="danger">{error}</InlineMessage>}

          <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
            <div className="flex items-center gap-2 dsvmd:pb-1">
              <button
                type="button"
                aria-pressed={lessonOnly}
                onClick={() => reset(() => setLessonOnly(!lessonOnly))}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border px-4 type-label whitespace-nowrap',
                  lessonOnly ? 'border-primary bg-primary-container text-on-primary-container' : 'border-border bg-surface text-on-surface hover:bg-surface-container-low',
                )}
              >
                Di sản của bài
                {lessonOnly && <Icon name="x" size={14} />}
              </button>
            </div>
            <SelectField
              label="Độ khó"
              value={difficulty}
              onChange={(e) => reset(() => setDifficulty(e.target.value as QuestionDifficulty | ''))}
              options={[{ value: '', label: 'Tất cả độ khó' }, ...DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))]}
              containerClassName="dsvmd:w-44"
            />
            <SelectField
              label="Dạng câu"
              value={type}
              onChange={(e) => reset(() => setType(e.target.value as QuestionType | ''))}
              options={[{ value: '', label: 'Tất cả dạng câu' }, ...allowed.map((t) => ({ value: t, label: QUESTION_TYPE_LABEL[t] }))]}
              containerClassName="dsvmd:w-56"
            />
            <SearchForm key={keyword} label="Từ khóa" placeholder="Từ khóa" value={keyword} onSearch={(v) => reset(() => setKeyword(v))} />
          </div>

          {list.isPending ? (
            <LoadingState rows={4} />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState icon="search" title="Không tìm thấy kết quả phù hợp. Hãy bớt tiêu chí lọc hoặc thử từ khóa khác." />
          ) : (
            <div>
              <p className="mb-2 type-body-s text-on-surface-variant" aria-live="polite">
                Hiển thị {rows.length} trên {list.data.totalItems} câu đã duyệt dùng được ở cấp {quiz.schoolLevel} · câu đã có trong bài kiểm tra hiện mờ
              </p>
              <div className="relative overflow-x-auto rounded-md border border-(--dsv-table-border) bg-surface" aria-busy={list.isFetching || undefined}>
                <table className="w-full min-w-[720px] border-collapse text-left type-body-s">
                  <caption className="sr-only">Câu hỏi trong ngân hàng dùng được cho bài kiểm tra</caption>
                  <thead>
                    <tr className="bg-(--dsv-table-header-bg) text-on-surface-variant">
                      <th scope="col" className="h-11 w-12 px-4">
                        <span className="sr-only">Chọn</span>
                      </th>
                      <th scope="col" className="px-2 type-label">Nội dung câu hỏi</th>
                      <th scope="col" className="px-2 type-label">Dạng câu</th>
                      <th scope="col" className="px-2 type-label">Độ khó</th>
                      <th scope="col" className="px-2 type-label">Người tạo</th>
                      <th scope="col" className="px-2 type-label">Xem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ question, inQuiz }) => {
                      const checked = inQuiz || selected.has(question.id);
                      const blocked = !inQuiz && !selected.has(question.id) && selected.size >= room;
                      return (
                        <tr key={question.id} className={cn('border-t border-(--dsv-table-border)', checked && !inQuiz && 'bg-primary-container/30', inQuiz && 'opacity-60')}>
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              className="size-5 accent-primary"
                              checked={checked}
                              disabled={inQuiz || blocked}
                              onChange={() => toggle(question.id)}
                              aria-label={`Chọn câu: ${question.content}`}
                            />
                          </td>
                          <td className="max-w-[360px] px-2 py-2">
                            <p className="line-clamp-2 text-on-surface">{question.content}</p>
                            <p className="type-body-s text-on-surface-variant">{inQuiz ? 'Đã có trong bài kiểm tra' : question.heritageName}</p>
                          </td>
                          <td className="px-2 py-2">
                            <Badge>{question.typeName}</Badge>
                          </td>
                          <td className="px-2 py-2">
                            <DifficultyBadge value={question.difficultyLevel} />
                          </td>
                          <td className="px-2 py-2">
                            <span className="block">{question.isMine ? 'Của tôi' : (question.creatorName ?? '')}</span>
                            <span className="block type-body-s text-on-surface-variant">{question.organizationName}</span>
                          </td>
                          <td className="px-2 py-2">
                            <Button variant="ghost" size="icon" aria-label={`Xem câu: ${question.content}`} onClick={() => setPreviewId(question.id)}>
                              <Icon name="eye" size={18} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination label="câu hỏi" page={list.data.page} pageSize={list.data.pageSize} totalItems={list.data.totalItems} totalPages={list.data.totalPages} onChange={setPage} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <p className="min-w-0 flex-1 type-body-s text-on-surface-variant" aria-live="polite">
              <strong className="block type-label text-on-surface">Đã chọn {selected.size} câu</strong>
              Mỗi câu thêm vào được 1 điểm, sửa được ở danh sách câu.
              {selected.size >= room && ` Bài chỉ còn chỗ cho ${room} câu (tối đa ${QUIZ_LIMITS.maxQuestions} câu).`}
            </p>
            <Button variant="secondary" onClick={onClose} disabled={adding}>
              Hủy
            </Button>
            <Button disabled={selected.size === 0} loading={adding} onClick={() => void add()}>
              Thêm vào bài kiểm tra
            </Button>
          </div>
        </div>
      </Modal>
      {previewId !== null && (
        <QuestionPreviewDialog heading="Xem câu hỏi" items={[{ questionId: previewId }]} level={quiz.schoolLevel} onClose={() => setPreviewId(null)} />
      )}
    </>
  );
}
