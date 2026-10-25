import { cn } from '@dsvhvn/dung-chung';
import type { StudentRecommendations } from '@dsvhvn/dung-chung/api';
import { Badge, ErrorState, Icon, InlineMessage, LoadingState } from '@dsvhvn/dung-chung/ui';
import { Link } from 'react-router';
import { Thumbnail } from '../discovery/Thumbnail';
import { GROUPS, hasAnySuggestion, suggestionsOf, useAttemptRecommendations, useHomeRecommendations, useLessonCodeOf, type GroupId, type Suggestion } from './suggestionData';

// "Gợi ý cho em": năm phần (bài kiểm tra nên làm tiếp, bài học nên ôn lại, di sản nên ôn, di sản liên quan, bài học mới nên học), mỗi phần tối đa
// 3 mục, cùng nội dung ở cấp 2 và 3. Cấp 2: thẻ có hình nhỏ, tiêu đề đầy đủ và lý do. Cấp 3: danh sách dạng dòng theo nhóm, mỗi dòng có
// "Lý do: …". Bài học mới chỉ có tiêu đề và câu "Nhờ thầy cô đưa mã bài học", không có mã. Cấp 1 không dùng khối này: trang học và trang kết quả
// của cấp 1 có bố cục riêng. Dùng ở Trang học và ở Kết quả bài làm (di sản nên ôn chỉ từ lượt đang xem).

type Level = 2 | 3;

const ORDER: GroupId[] = ['quiz', 'lessonReview', 'heritageReview', 'related', 'newLesson'];

function Action({ item, className }: { item: Suggestion; className?: string }) {
  if (!item.action) return null;
  return (
    <Link to={item.action.to} className={cn('inline-flex items-center gap-1 type-control text-link underline underline-offset-4', className)}>
      {item.action.label}
      <Icon name="chevron-right" size={16} />
    </Link>
  );
}

// ---- Cấp 2 ----

function CardTwo({ item }: { item: Suggestion }) {
  return (
    <li className="relative flex flex-col overflow-hidden rounded-md border border-border bg-surface">
      {item.hasImage && (
        <div className="relative aspect-[16/9] bg-(--dsv-card-placeholder-bg)">
          <Thumbnail url={item.imageUrl} width={480} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="type-label tracking-wide text-primary uppercase">{GROUPS[item.group].title}</p>
        <h3 className="type-label text-on-surface">{item.title}</h3>
        {item.detail && <p className="type-body-s text-on-surface-variant">{item.detail}</p>}
        <p className="type-body-s text-on-surface-variant">{item.reason}</p>
        {item.badge && (
          <div>
            <Badge tone="warning">{item.badge}</Badge>
          </div>
        )}
        <Action item={item} className="mt-auto pt-2" />
      </div>
    </li>
  );
}

// ---- Cấp 3 ----

function ListThree({ items }: { items: Suggestion[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      {ORDER.map((group) => {
        const rows = items.filter((item) => item.group === group);
        if (rows.length === 0) return null;
        return (
          <section key={group} aria-label={GROUPS[group].title}>
            <h3 className="border-b border-border bg-surface-container-low px-4 py-2 type-label tracking-wide text-on-surface-variant uppercase">{GROUPS[group].title}</h3>
            <ul className="divide-y divide-border">
              {rows.map((item) => (
                <li key={item.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="type-body-m font-medium text-on-surface">
                      {item.title} {item.badge && <Badge tone="warning">{item.badge}</Badge>}
                    </p>
                    <p className="type-body-s text-on-surface-variant">Lý do: {item.reason}</p>
                    {item.group === 'newLesson' && item.detail && <p className="type-body-s text-on-surface-variant">{item.detail}</p>}
                  </div>
                  <Action item={item} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Praise({ text, level }: { text: string; level: Level }) {
  let displayText = text;
  if (level === 2 && text.includes('giỏi quá')) {
    displayText = 'Em đã hoàn thành tốt các câu hỏi, không có phần cần ôn lại. Hãy tiếp tục làm bài mới nhé.';
  } else if (level === 3 && text.includes('giỏi quá')) {
    displayText = 'Đã nắm vững toàn bộ kiến thức di sản trong bài kiểm tra. Không có nội dung cần ôn tập thêm.';
  }

  return (
    <p className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-on-surface type-body-m shadow-2xs">
      <Icon name="check" size={20} className="shrink-0 text-success" />
      <span>{displayText}</span>
    </p>
  );
}

function Body({ data, level }: { data: StudentRecommendations; level: Level }) {
  const codeOf = useLessonCodeOf();
  const items = suggestionsOf(data, codeOf);
  return (
    <div className="flex flex-col gap-4">
      {data.message && <InlineMessage tone="info">{data.message}</InlineMessage>}
      {data.reviewPraise && <Praise text={data.reviewPraise} level={level} />}
      {level === 2 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Gợi ý cho em">
          {items.map((item) => (
            <CardTwo key={item.key} item={item} />
          ))}
        </ul>
      )}
      {level === 3 && items.length > 0 && <ListThree items={items} />}
    </div>
  );
}

interface SectionProps {
  level: Level;
  id?: string;
}

function View({ level, query, id }: { level: Level; query: ReturnType<typeof useHomeRecommendations>; id?: string }) {
  const title = 'Gợi ý cho em';
  const hint = 'Chọn theo bài em đã làm: bài kiểm tra nên làm tiếp, bài học nên ôn lại, di sản nên ôn, di sản liên quan và bài học mới.';
  let content;
  if (query.isPending) content = <LoadingState rows={2} />;
  else if (query.isError) content = <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  else if (!hasAnySuggestion(query.data)) return null;
  else content = <Body data={query.data} level={level} />;
  return (
    <section id={id} aria-labelledby={`${id ?? 'goi-y'}-tieu-de`} className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 id={`${id ?? 'goi-y'}-tieu-de`} className="type-h2 text-on-surface">
          {title}
        </h2>
      </div>
      <p className="type-body-s text-on-surface-variant">{hint}</p>
      {content}
    </section>
  );
}

/** Gợi ý ở Trang học. */
export function HomeRecommendations({ level, id }: SectionProps) {
  return <View level={level} id={id} query={useHomeRecommendations()} />;
}

/** Gợi ý ở Kết quả bài làm của một lượt: phần di sản nên ôn chỉ tính từ lượt này. */
export function AttemptRecommendations({ level, attemptId, id }: SectionProps & { attemptId: number }) {
  return <View level={level} id={id} query={useAttemptRecommendations(attemptId)} />;
}
