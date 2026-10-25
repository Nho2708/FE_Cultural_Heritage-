import { cn, clampStars, formatDateTime, formatDuration, formatPercent, formatScore, levelOneStarsHeadline } from '@dsvhvn/dung-chung';
import type { StudentAnalysis, StudentAttemptResult, StudentBadge, StudentTopic } from '@dsvhvn/dung-chung/api';
import { Badge, Button, ButtonLink, ErrorState, Icon, InlineMessage, LoadingState } from '@dsvhvn/dung-chung/ui';
import { HeritageCardRow, Illustration, LevelOneButtonLink, LevelOneSpeak, LevelOneStars, SpeakButton, TakeHomeBox, speakVietnamese, useAutoRead, usePrefetchSpeech } from '@dsvhvn/dung-chung/lesson';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { pathOf } from '../access/screens';
import { lessonPath } from '../lessons/lessonData';
import { AttemptRecommendations } from '../learn-home/Recommendations';
import { QuestionReview } from '../quiz/QuestionReview';
import { parseQuizId, resultQueryFn, resultQueryKey } from '../quiz/quizData';
import { useLessonCode } from '../quiz/useLessonCode';
import { Bar } from '../quiz/Meters';

// Kết quả bài làm, ba bản trình bày theo cấp học hiện tại của lớp (do máy chủ chọn, học sinh không chọn): cấp 1 sao, lời khen nói đúng
// điều em nhớ, thẻ di sản vào album, một câu mang về nhà và huy hiệu (không điểm, không đúng sai; phần xem lại câu thu gọn); cấp 2 điểm, số câu đúng, sai, bỏ trống, đáp án và giải thích; cấp 3 thêm phân tích theo di sản và dạng câu.
// Phần xem lại từng câu chỉ có khi bài kiểm tra cho xem đáp án sau khi nộp.

const REVIEW_PREVIEW = 5;

function BadgeList({ badges, level }: { badges: StudentBadge[]; level: 1 | 2 | 3 }) {
  if (badges.length === 0) return null;
  return (
    <section aria-label="Huy hiệu của lượt này" className="flex flex-col gap-3">
      <h2 className={level === 1 ? 'type-h2' : 'type-h3'}>{level === 1 ? 'Em nhận huy hiệu mới!' : 'Huy hiệu của lượt này'}</h2>
      <ul className="flex flex-col gap-3">
        {badges.map((badge) => (
          <li key={badge.code} className="flex items-center gap-3 rounded-md border border-border bg-surface p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <Icon name="star" size={24} />
            </span>
            <div className="min-w-0">
              <p className="type-label text-on-surface">{badge.name}</p>
              <p className="type-body-s text-on-surface-variant">{badge.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tile({ value, label, tone }: { value: string; label: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="rounded-md bg-surface px-5 py-3 text-center">
      <p className={cn('type-h2', tone === 'ok' && 'text-success', tone === 'bad' && 'text-danger')}>{value}</p>
      <p className="type-body-s text-on-surface-variant">{label}</p>
    </div>
  );
}

function Review({ result, title }: { result: StudentAttemptResult; title: string }) {
  const [all, setAll] = useState(false);
  const questions = result.questions ?? [];
  if (!result.answersShown || questions.length === 0) return null;
  const shown = all ? questions : questions.slice(0, REVIEW_PREVIEW);
  return (
    <section aria-labelledby="xem-lai" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 id="xem-lai" className={result.level === 1 ? 'type-h2' : 'type-h3'}>
          {title}
        </h2>
        {result.level === 1 && <SpeakButton text={title} label="Nghe tiêu đề" />}
      </div>
      {shown.map((review, index) => (
        <QuestionReview key={review.question.questionId} review={review} index={index} total={questions.length} level={result.level} />
      ))}
      {!all && questions.length > REVIEW_PREVIEW && (
        <Button variant="secondary" onClick={() => setAll(true)} className="self-start">
          Xem {questions.length - REVIEW_PREVIEW} câu còn lại
        </Button>
      )}
    </section>
  );
}

function Notice({ result, automatic }: { result: StudentAttemptResult; automatic: boolean }) {
  if (automatic || result.status === 'EXPIRED') {
    return <InlineMessage tone="info">Đã hết thời gian làm bài. Bài của em đã được nộp tự động với các câu em đã trả lời.</InlineMessage>;
  }
  return null;
}

function Actions({ result, lessonCode }: { result: StudentAttemptResult; lessonCode: string | null }) {
  const one = result.level === 1;
  return (
    <div className="flex flex-col gap-3">
      <ButtonLink to={lessonCode ? lessonPath(lessonCode) : pathOf('learnHome')} variant="secondary" size={one ? 'lg' : 'md'} fullWidth>
        {lessonCode ? 'Xem lại bài học' : 'Về trang học'}
      </ButtonLink>
      <ButtonLink to={pathOf('progress')} size={one ? 'lg' : 'md'} fullWidth>
        {one ? 'Xem sao của em' : 'Xem tiến độ của em'}
      </ButtonLink>
    </div>
  );
}

function meta(result: StudentAttemptResult): string {
  const parts = [`Bài học: ${result.lessonTitle ?? ''}`];
  if (result.submittedAt) parts.push(`Nộp lúc ${formatDateTime(result.submittedAt)}`);
  return parts.join(' · ');
}

// ---- Cấp 1 ----

function ResultLevelOne({ result, automatic }: { result: StudentAttemptResult; automatic: boolean; lessonCode: string | null }) {
  const stars = clampStars(result.stars);
  const headline = levelOneStarsHeadline(stars);
  const praise = result.praise?.trim() ?? '';
  const [autoRead] = useAutoRead();
  // Số sao và lời khen đọc cùng một lượt: nhờ máy chủ tạo trước tiếng ngay khi vào trang để nút nghe có ngay.
  usePrefetchSpeech([`${headline} ${praise}`.trim()], true);
  // Trang kết quả tự đọc số sao và lời khen một lần (khi bật "Tự đọc to").
  useEffect(() => {
    if (autoRead) void speakVietnamese(`${headline} ${praise}`.trim());
  }, [autoRead, headline, praise]);
  const cards = result.cards ?? [];

  return (
    <section data-bo-cuc="cap-1" className="dsv-content dsv-section" aria-labelledby="ket-qua-tieu-de">
      <title>{`Kết quả: ${result.quizName ?? 'Bài chơi'} · DiViet`}</title>
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-5 text-center">
        <p className="text-[18px] font-bold text-on-surface-variant">{result.quizName}</p>
        <Illustration state={stars >= 2 ? 'chuc-mung' : 'dong-vien'} className="size-[104px] rounded-full bg-surface-container-low" />
        <LevelOneStars count={stars} />
        <h1 id="ket-qua-tieu-de" className="text-[32px] leading-tight font-bold text-on-surface">
          {headline}
        </h1>
        {praise && (
          <div className="flex w-full items-center gap-3 rounded-[20px] border-2 border-border bg-surface p-4 text-left">
            <p className="min-w-0 flex-1 text-[20px] leading-snug font-bold text-on-surface">{praise}</p>
            <LevelOneSpeak text={`${headline} ${praise}`} label="Nghe lời khen" size={56} />
          </div>
        )}
        <div className="w-full">
          <Notice result={result} automatic={automatic} />
        </div>
        {cards.length > 0 && (
          <ul aria-label="Thẻ di sản của bài" className="flex w-full flex-col gap-3 text-left">
            {cards.map((card) => (
              <li key={card.heritageId}>
                <HeritageCardRow
                  card={card}
                  note={result.albumCollected !== null ? `Đã vào album của em · ${result.albumCollected} thẻ` : 'Đã vào album của em'}
                />
              </li>
            ))}
          </ul>
        )}
        <TakeHomeBox text={result.takeHome} className="w-full" />
        {result.badges.length > 0 && (
          <section aria-labelledby="huy-hieu-moi" className="flex w-full flex-col items-center gap-3">
            <h2 id="huy-hieu-moi" className="text-[20px] font-bold text-on-surface">
              Em nhận huy hiệu mới!
            </h2>
            <ul className="flex flex-wrap justify-center gap-2">
              {result.badges.map((badge) => (
                <li
                  key={badge.code}
                  title={badge.description}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border bg-surface-container-low px-4 text-[16px] font-bold text-on-surface"
                >
                  <Icon name="star" size={18} className="fill-current text-secondary-container stroke-on-secondary-container/40" />
                  {badge.name}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <LevelOneButtonLink to={pathOf('learnHome')} className="flex-1">
            Về con đường
          </LevelOneButtonLink>
          <LevelOneButtonLink to={pathOf('album')} variant="secondary" className="flex-1">
            <Icon name="cards" size={24} />
            Xem album
          </LevelOneButtonLink>
        </div>
        {result.answersShown && (result.questions?.length ?? 0) > 0 && (
          <details className="group w-full rounded-[20px] border-2 border-border bg-surface text-left">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 text-[20px] font-bold text-primary [&::-webkit-details-marker]:hidden">
              Xem lại các câu
              <Icon name="chevron-down" size={24} className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-4 border-t-2 border-border p-4">
              {result.questions!.map((review, index) => (
                <QuestionReview key={review.question.questionId} review={review} index={index} total={result.questions!.length} level={1} />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

// ---- Cấp 2 ----

function ScoreLine({ result }: { result: StudentAttemptResult }) {
  return (
    <p className="type-body-m text-on-surface">
      Em đạt {formatScore(result.score, result.totalPoint)} điểm ({result.correctCount}/{result.totalQuestions} câu đúng)
      {result.durationSeconds !== null ? ` trong ${formatDuration(result.durationSeconds)}` : ''}.
    </p>
  );
}

function ScoreTiles({ result }: { result: StudentAttemptResult }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile value={formatScore(result.score, result.totalPoint)} label="Điểm" />
      <Tile value={String(result.correctCount ?? 0)} label="Câu đúng" tone="ok" />
      <Tile value={String(result.wrongCount ?? 0)} label="Câu sai" tone="bad" />
      <Tile value={String(result.blankCount ?? 0)} label="Bỏ trống" />
    </div>
  );
}

function ResultLevelTwo({ result, automatic, lessonCode }: { result: StudentAttemptResult; automatic: boolean; lessonCode: string | null }) {
  return (
    <section data-bo-cuc="cap-2" className="dsv-content dsv-section">
      <title>{`Kết quả: ${result.quizName ?? 'Bài kiểm tra'} · DiViet`}</title>
      <div className="flex flex-col gap-(--dsv-block-gap)">
        <div className="rounded-lg bg-primary-container p-6 text-on-primary-container">
          <div className="flex flex-wrap items-center gap-3">
            <Illustration state="chuc-mung" className="size-14 rounded-full bg-surface" />
            <p className="type-h4">Tuyệt vời! Em đã hoàn thành bài kiểm tra.</p>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="type-h1">
                {result.quizName} <Badge tone="success">{result.statusLabel}</Badge>
              </h1>
              <div className="mt-3">
                <ScoreLine result={result} />
              </div>
              <p className="mt-3 type-body-s">{meta(result)}</p>
            </div>
            <ScoreTiles result={result} />
          </div>
        </div>
        <Notice result={result} automatic={automatic} />
        <div className="grid gap-(--dsv-block-gap) lg:grid-cols-[1fr_320px]">
          <Review result={result} title="Đáp án và giải thích" />
          <aside className="flex h-fit flex-col gap-5">
            <BadgeList badges={result.badges} level={2} />
            <Actions result={result} lessonCode={lessonCode} />
          </aside>
        </div>
        <AttemptRecommendations level={2} attemptId={result.attemptId} id="goi-y" />
      </div>
    </section>
  );
}

// ---- Cấp 3 ----

function Bars({ title, topics }: { title: string; topics: StudentTopic[] }) {
  if (topics.length === 0) return null;
  return (
    <div>
      <h4 className="type-label text-on-surface-variant">{title}</h4>
      <ul className="mt-2 flex flex-col gap-3">
        {topics.map((topic) => (
          <li key={`${topic.heritageId ?? topic.questionType}-${topic.name}`}>
            <p className="flex items-baseline justify-between gap-3 type-body-s text-on-surface">
              <span>{topic.name}</span>
              <span className="tabular-nums">{formatPercent(topic.ratePercent)}</span>
            </p>
            <Bar className="mt-1" ratio={topic.ratePercent / 100} label={`${topic.name}: ${formatPercent(topic.ratePercent)}`} tone={topic.ratePercent < 50 ? 'danger' : 'primary'} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopicRows({ title, topics }: { title: string; topics: StudentTopic[] }) {
  if (topics.length === 0) return null;
  return (
    <>
      <tr>
        <th colSpan={4} scope="colgroup" className="bg-surface-container-low px-4 py-2 text-left type-label tracking-wide text-on-surface-variant uppercase">
          {title}
        </th>
      </tr>
      {topics.map((topic) => {
        const review = topic.ratePercent < 50;
        return (
          <tr key={`${topic.heritageId ?? topic.questionType}-${topic.name}`} className={cn('border-t border-border', review && 'bg-danger-container text-on-danger-container')}>
            <th scope="row" className="px-4 py-2 text-left type-body-m font-normal">
              {topic.name}
            </th>
            <td className="px-4 py-2 type-body-m tabular-nums">
              {topic.correct} / {topic.answered}
            </td>
            <td className="px-4 py-2 type-body-m tabular-nums">{formatPercent(topic.ratePercent)}</td>
            <td className="px-4 py-2">
              <Badge tone={review ? 'danger' : 'success'}>{review ? 'Cần ôn' : 'Ổn'}</Badge>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function Analysis({ analysis }: { analysis: StudentAnalysis }) {
  return (
    <section aria-labelledby="phan-tich" className="rounded-md border border-border bg-surface p-5">
      <h2 id="phan-tich" className="type-h3">
        Phân tích theo chủ đề
      </h2>
      <p className="mt-1 type-body-s text-on-surface-variant">
        Tỉ lệ đúng của lượt này theo di sản và theo dạng câu. Chủ đề dưới 50% được đánh dấu cần ôn.
        {analysis.partsTotal > 0 ? ` Em đúng ${analysis.partsCorrect} / ${analysis.partsTotal} ý của các câu nhiều phần.` : ''}
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="bg-surface-container-low type-label text-on-surface-variant">
                <th scope="col" className="px-4 py-2 text-left">Chủ đề</th>
                <th scope="col" className="px-4 py-2 text-left">Câu đúng</th>
                <th scope="col" className="px-4 py-2 text-left">Tỉ lệ đúng</th>
                <th scope="col" className="px-4 py-2 text-left">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              <TopicRows title="Theo di sản" topics={analysis.byHeritage} />
              <TopicRows title="Theo dạng câu" topics={analysis.byQuestionType} />
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-5">
          <Bars title="Biểu đồ theo di sản" topics={analysis.byHeritage} />
          <Bars title="Biểu đồ theo dạng câu" topics={analysis.byQuestionType} />
        </div>
      </div>
      {analysis.heritagesToReview.length > 0 && (
        <div className="mt-5 rounded-md bg-surface-container-low p-4">
          <h3 className="type-label text-on-surface">Gợi ý ôn tương ứng</h3>
          <ul className="mt-2 list-disc pl-5 type-body-s text-on-surface">
            {analysis.heritagesToReview.map((topic) => (
              <li key={topic.heritageId ?? topic.name}>
                {topic.name} ({formatPercent(topic.ratePercent)}): đọc lại mục ý nghĩa của bài và xem chi tiết di sản.
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ResultLevelThree({ result, automatic, lessonCode }: { result: StudentAttemptResult; automatic: boolean; lessonCode: string | null }) {
  return (
    <section data-bo-cuc="cap-3" className="dsv-content dsv-section">
      <title>{`Kết quả: ${result.quizName ?? 'Bài kiểm tra'} · DiViet`}</title>
      <div className="flex flex-col gap-(--dsv-block-gap)">
        <div className="grid gap-5 rounded-md border border-border bg-surface p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h1 className="type-h2">
              {result.quizName} <Badge tone="success">{result.statusLabel}</Badge>
            </h1>
            <div className="mt-2">
              <ScoreLine result={result} />
            </div>
            <p className="mt-2 type-body-s text-on-surface-variant">{meta(result)}</p>
          </div>
          <ScoreTiles result={result} />
        </div>
        <Notice result={result} automatic={automatic} />
        {result.analysis && <Analysis analysis={result.analysis} />}
        <div className="grid gap-(--dsv-block-gap) lg:grid-cols-[1fr_300px]">
          <Review result={result} title="Đáp án và giải thích" />
          <aside className="flex h-fit flex-col gap-5">
            <BadgeList badges={result.badges} level={3} />
            <Actions result={result} lessonCode={lessonCode} />
          </aside>
        </div>
        <AttemptRecommendations level={3} attemptId={result.attemptId} id="goi-y" />
      </div>
    </section>
  );
}

export function ResultPage() {
  const id = parseQuizId(useParams().luotLam);
  const location = useLocation();
  const hint = location.state as { automatic?: boolean; lessonCode?: string } | null;
  const query = useQuery({ queryKey: resultQueryKey(id ?? 0), queryFn: resultQueryFn(id ?? 0), enabled: id !== null });
  const lessonCode = useLessonCode(query.data?.lessonId, hint?.lessonCode);

  if (id === null) {
    return (
      <section className="dsv-content dsv-section">
        <title>Không tìm thấy kết quả · DiViet</title>
        <p className="type-h2">Không tìm thấy kết quả bài làm</p>
        <div className="mt-4">
          <ButtonLink to={pathOf('progress')}>Xem tiến độ của em</ButtonLink>
        </div>
      </section>
    );
  }
  if (query.isPending) {
    return (
      <section className="dsv-content dsv-section">
        <title>Kết quả bài làm · DiViet</title>
        <LoadingState rows={4} />
      </section>
    );
  }
  if (query.isError) {
    return (
      <section className="dsv-content dsv-section">
        <title>Kết quả bài làm · DiViet</title>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </section>
    );
  }

  const Layout = { 1: ResultLevelOne, 2: ResultLevelTwo, 3: ResultLevelThree }[query.data.level];
  return <Layout result={query.data} automatic={hint?.automatic === true} lessonCode={lessonCode} />;
}

