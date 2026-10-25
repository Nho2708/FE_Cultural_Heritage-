import { cn } from '../cn';
import type { AnswerCheck, AttemptQuestion, LessonCompletion, RecallQuestion, StudentAlbumCard, StudentLesson } from '../api';
import { practiceFeedback, TAP_LOCK_MS } from '../levelOne';
import { splitSentences } from '../speech';
import { Icon, TextLink, type IconName } from '../ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAutoRead } from './autoRead';
import { AutoReadSwitch } from './AutoReadSwitch';
import { Illustration } from './Illustration';
import { canTakeQuiz } from './lessonData';
import { useLessonLinks } from './lessonLinks';
import { LessonFigure, QuizList } from './LessonParts';
import {
  HeritageCardRow,
  LevelOneButton,
  LevelOneButtonLink,
  LevelOneChoices,
  LevelOneIconLink,
  LevelOneSpeak,
  TakeHomeBox,
} from './LevelOneParts';
import { galleryOf, lessonSpeechTexts, storyPartsOf, takeHomeSpeech } from './levelOneSpeech';
import { speakVietnamese } from './speechVoice';
import { usePrefetchSpeech, useSentenceReader } from './useSpeech';

// Bài học — bố cục cấp 1 (khối 1-5, một bố cục cho cả lớp 1 đến lớp 5): đi lần lượt Nhớ lại → Nghe chuyện → Xem hình → Chơi → Nhận thẻ.
// Nhớ lại: vài câu ôn của bài trước, chạm là biết ngay đúng sai kèm giải thích, không tính sao. Nghe chuyện: hình lớn, chữ to, đọc từng
// câu và tô sáng câu đang đọc (tự đọc khi em vào đoạn, em tắt được). Nhận thẻ: ghi em đã học xong bài, thẻ di sản vào album, một câu
// mang về nhà. Em ra giữa chừng thì lần sau mở lại đúng bước đang dừng (nhớ trên máy này). Giáo viên xem trước thì không gọi máy chủ:
// bỏ bước Nhớ lại, bước Nhận thẻ chỉ hiện thẻ mẫu.

/** Khóa bước theo máy chủ; bản cũ gọi bước cuối là EARN_STARS, nay là Nhận thẻ. */
type StepKey = 'RECALL' | 'LISTEN_STORY' | 'VIEW_IMAGES' | 'PLAY' | 'EARN_CARD' | string;

const STEP_ICON: Record<string, IconName> = {
  RECALL: 'refresh',
  LISTEN_STORY: 'headphones',
  VIEW_IMAGES: 'image',
  PLAY: 'play',
  EARN_CARD: 'cards',
};

function normalizeStep(step: { key: string; label: string }): { key: StepKey; label: string } {
  return step.key === 'EARN_STARS' ? { key: 'EARN_CARD', label: 'Nhận thẻ' } : step;
}

function clamp(value: number, max: number) {
  return Math.min(Math.max(value, 0), Math.max(max, 0));
}

/** Bước đang dừng: `step` là chỉ số bước trong danh sách máy chủ trả, `part` là đoạn trong bước Nghe chuyện. */
export interface LessonPosition {
  step: number;
  part: number;
}

interface LevelOneLessonProps {
  lesson: StudentLesson;
  /** Bước em đang dừng lần trước (nhớ trên máy). Không có thì bắt đầu từ đầu bài. */
  initialPosition?: LessonPosition;
  /** Gọi mỗi khi em sang bước hoặc đoạn khác để máy nhớ. Xem trước không truyền. */
  onPositionChange?: (position: LessonPosition) => void;
}

type RecallState = { status: 'loading' } | { status: 'ready'; questions: RecallQuestion[] } | { status: 'none' };

/** Câu ôn của bước Nhớ lại. Không có hàm lấy (xem trước), lỗi mạng hay em chưa nộp bài nào: bỏ bước. */
function useRecall(code: string, load: ((code: string) => Promise<{ questions: RecallQuestion[] }>) | null | undefined, wanted: boolean): RecallState {
  const [state, setState] = useState<RecallState>(() => (wanted && load ? { status: 'loading' } : { status: 'none' }));
  useEffect(() => {
    if (!wanted || !load) return;
    let live = true;
    load(code)
      .then((data) => live && setState(data.questions.length > 0 ? { status: 'ready', questions: data.questions } : { status: 'none' }))
      .catch(() => live && setState({ status: 'none' }));
    return () => {
      live = false;
    };
  }, [code, load, wanted]);
  return state;
}

export function LevelOneLesson({ lesson, initialPosition, onPositionChange }: LevelOneLessonProps) {
  const links = useLessonLinks();
  const steps = useMemo(() => lesson.layout.steps.map(normalizeStep), [lesson.layout.steps]);
  const gallery = useMemo(() => galleryOf(lesson), [lesson]);
  const parts = useMemo(() => storyPartsOf(lesson), [lesson]);

  // Vào bài thì nhờ máy chủ tạo trước tiếng mọi thứ sắp đọc (các câu kể chuyện, chú thích hình, ý cần nhớ) để em bấm nghe là có ngay. Xem trước của giáo viên không gọi.
  usePrefetchSpeech(
    useMemo(() => lessonSpeechTexts(parts, gallery, lesson.keyPoints), [gallery, lesson.keyPoints, parts]),
    !links.preview,
  );

  const recall = useRecall(lesson.accessCode, links.recall, !links.preview && steps.some((s) => s.key === 'RECALL'));
  const visible = (index: number) => steps[index] !== undefined && (steps[index]!.key !== 'RECALL' || recall.status !== 'none');
  const visibleSteps = steps.map((step, index) => ({ ...step, index })).filter((step) => visible(step.index));
  /** Bước hiện được gần nhất từ `index` trở đi (bước Nhớ lại bị bỏ thì sang bước sau). */
  const firstVisibleFrom = (index: number) => visibleSteps.find((step) => step.index >= index)?.index ?? visibleSteps.at(-1)?.index ?? 0;

  const [position, setPosition] = useState(() => {
    const saved = initialPosition ?? { step: 0, part: 0 };
    const step = clamp(saved.step, steps.length - 1);
    return { step, part: steps[step]?.key === 'LISTEN_STORY' ? clamp(saved.part, parts.length - 1) : 0 };
  });
  // Bước đang hiện: bước đã nhớ, hoặc bước sau nó nếu bước Nhớ lại bị bỏ.
  const stepIndex = firstVisibleFrom(position.step);
  const partIndex = stepIndex === position.step ? position.part : 0;

  useEffect(() => {
    onPositionChange?.({ step: stepIndex, part: partIndex });
  }, [onPositionChange, partIndex, stepIndex]);

  const [autoRead, setAutoRead] = useAutoRead();
  const readAloud = autoRead && !links.preview;
  const stepKey = steps[stepIndex]?.key ?? 'LISTEN_STORY';
  const order = visibleSteps.findIndex((step) => step.index === stepIndex);
  const part = parts[partIndex] ?? parts[0]!;

  const go = (next: LessonPosition) => {
    setPosition(next);
    window.scrollTo?.({ top: 0 });
  };
  const goStep = (index: number) => go({ step: index, part: 0 });
  const next = () => {
    if (stepKey === 'LISTEN_STORY' && partIndex < parts.length - 1) go({ step: stepIndex, part: partIndex + 1 });
    else goStep(visibleSteps[order + 1]?.index ?? stepIndex);
  };
  const back = () => {
    if (stepKey === 'LISTEN_STORY' && partIndex > 0) go({ step: stepIndex, part: partIndex - 1 });
    else goStep(visibleSteps[order - 1]?.index ?? stepIndex);
  };
  const playStep = steps.findIndex((s) => s.key === 'PLAY');
  const hasPlayableQuiz = playStep >= 0 && lesson.quizzes.some(canTakeQuiz);
  const canGoBack = order > 0 || (stepKey === 'LISTEN_STORY' && partIndex > 0);

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1" aria-labelledby="tieu-de-bai">
      {!links.preview && <title>{`${lesson.title ?? 'Bài học'} · DiViet`}</title>}
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6">
        <div className="flex items-center gap-3">
          {links.home && <LevelOneIconLink to={links.home} icon="arrow-left" label="Về trang học" />}
          <h1 id="tieu-de-bai" className="min-w-0 flex-1 text-[26px] leading-tight font-bold text-on-surface sm:text-[32px]">
            {lesson.title}
          </h1>
        </div>

        <StepBar steps={visibleSteps} current={stepIndex} onGo={goStep} />

        {stepKey === 'RECALL' &&
          (recall.status === 'ready' ? (
            <RecallStep questions={recall.questions} readAloud={readAloud} onFinish={next} />
          ) : (
            <div className="flex items-center gap-4 rounded-[24px] bg-surface-container-low p-5" aria-busy="true">
              <Illustration state="chao" className="size-16 rounded-full bg-surface" />
              <p className="text-[20px] text-on-surface">Mình cùng nhớ lại bài trước nhé…</p>
            </div>
          ))}

        {stepKey === 'LISTEN_STORY' && (
          <StoryStep
            key={partIndex}
            part={part}
            index={partIndex}
            total={parts.length}
            readAloud={readAloud}
            showSwitch={!links.preview}
            autoRead={autoRead}
            onAutoRead={setAutoRead}
            heritageTo={lesson.heritages[0] ? links.heritage(lesson.heritages[0].slug) : null}
          />
        )}

        {stepKey === 'VIEW_IMAGES' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {gallery.length === 0 ? (
              <p className="text-[20px] text-on-surface-variant">Bài này chưa có hình để xem. Em bấm "Tiếp nhé" nhé!</p>
            ) : (
              gallery.map((item, index) => (
                <div key={index} className="rounded-[24px] border-2 border-border bg-surface p-3">
                  <LessonFigure url={item.url} caption={null} image={item.image} />
                  {item.caption && (
                    <div className="mt-3 flex items-center gap-3">
                      <p className="min-w-0 flex-1 text-[20px] leading-snug font-bold text-on-surface">{item.caption}</p>
                      <LevelOneSpeak text={item.caption} label={`Nghe: ${item.caption}`} size={48} soft />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {stepKey === 'PLAY' && (
          <section aria-labelledby="bai-choi" className="flex flex-col gap-4">
            <h2 id="bai-choi" className="text-[24px] font-bold text-on-surface">
              Bài chơi của em
            </h2>
            {lesson.quizzes.length === 0 ? (
              <div className="flex items-center gap-4 rounded-[24px] border-2 border-dashed border-border p-5">
                <Illustration state="trong" className="size-20 rounded-full bg-surface-container-low" />
                <p className="text-[20px]">Chưa có bài chơi nào. Em bấm "Tiếp nhé" để đi tiếp!</p>
              </div>
            ) : (
              <QuizList code={lesson.accessCode} quizzes={lesson.quizzes} variant="large" />
            )}
          </section>
        )}

        {stepKey === 'EARN_CARD' && <EarnCardStep lesson={lesson} onPlay={hasPlayableQuiz ? () => goStep(playStep) : null} onRestart={() => goStep(visibleSteps[0]?.index ?? 0)} />}

        {stepKey !== 'RECALL' && (
          <div className="flex flex-wrap items-center gap-3">
            {canGoBack && (
              <LevelOneButton variant="secondary" className="px-5" onClick={back}>
                <Icon name="arrow-left" size={24} />
                Quay lại
              </LevelOneButton>
            )}
            {stepKey !== 'EARN_CARD' && (
              <LevelOneButton className="min-w-[150px] flex-1" onClick={next}>
                Tiếp nhé
              </LevelOneButton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Thanh bước ----

function StepBar({ steps, current, onGo }: { steps: Array<{ key: StepKey; label: string; index: number }>; current: number; onGo: (index: number) => void }) {
  const order = steps.findIndex((step) => step.index === current);
  const here = steps[order];
  return (
    <nav aria-label="Các bước của bài" className="flex flex-col gap-2">
      <ol className="relative flex items-center justify-between">
        <span aria-hidden="true" className="absolute inset-x-6 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-border" />
        {steps.map((step, position) => {
          const done = position < order;
          const now = position === order;
          return (
            <li key={step.key} className="relative z-[1]" aria-current={now ? 'step' : undefined}>
              <button
                type="button"
                disabled={position > order}
                onClick={() => onGo(step.index)}
                aria-label={`${step.label}${done ? ', đã xong' : now ? ', đang học' : ''}`}
                className={cn(
                  'flex size-12 min-h-0 items-center justify-center rounded-full border-[3px] disabled:cursor-default',
                  now
                    ? 'border-primary bg-primary text-on-primary ring-4 ring-primary/25'
                    : done
                      ? 'border-primary-container bg-primary-container text-on-primary-container'
                      : 'border-border bg-surface text-on-surface-variant',
                )}
              >
                <Icon name={done ? 'check' : (STEP_ICON[step.key] ?? 'star')} size={24} strokeWidth={done ? 3 : 2} />
              </button>
            </li>
          );
        })}
      </ol>
      {here && (
        <p className="text-center text-[18px] font-bold text-on-surface" aria-live="polite">
          {here.label} <span className="font-medium text-on-surface-variant">{`· bước ${order + 1} trên ${steps.length}`}</span>
        </p>
      )}
    </nav>
  );
}

// ---- Nghe chuyện ----

interface StoryStepProps {
  part: { text: string; url: string | null; caption: string | null };
  index: number;
  total: number;
  readAloud: boolean;
  showSwitch: boolean;
  autoRead: boolean;
  onAutoRead: (on: boolean) => void;
  heritageTo: string | null;
}

function StoryStep({ part, index, total, readAloud, showSwitch, autoRead, onAutoRead, heritageTo }: StoryStepProps) {
  const sentences = useMemo(() => splitSentences(part.text, 'vi'), [part.text]);
  const reader = useSentenceReader(sentences);
  const { play, stop } = reader;
  // Tự đọc khi em vào đoạn (tắt được); rời đoạn thì dừng.
  useEffect(() => {
    if (readAloud) play();
    return () => stop();
  }, [play, readAloud, stop]);

  return (
    <article className="grid gap-5 lg:grid-cols-2 lg:items-start" aria-label="Câu chuyện">
      <div className="overflow-hidden rounded-[24px] border-2 border-border bg-surface">
        {part.url ? (
          <img src={part.url} alt={part.caption ?? ''} className="aspect-[4/3] max-h-[420px] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] max-h-[420px] items-center justify-center bg-surface-container-low">
            <Illustration state="chao" className="size-32 rounded-full bg-surface" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-5">
        <p className="text-[24px] leading-[1.6] font-medium text-on-surface">
          {sentences.map((sentence, i) => (
            <span key={i}>
              <span
                className={cn(
                  'rounded-[8px] px-0.5 [box-decoration-break:clone] motion-safe:transition-colors',
                  reader.current === i && 'bg-primary-container font-bold text-on-primary-container',
                )}
                aria-current={reader.current === i ? 'true' : undefined}
              >
                {sentence}
              </span>
              {i < sentences.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {reader.supported && (
            <button
              type="button"
              onClick={() => (reader.speaking ? stop() : play())}
              aria-label={reader.speaking ? 'Dừng đọc' : 'Đọc to đoạn này'}
              aria-busy={reader.preparing || undefined}
              className="flex size-18 min-h-0 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_4px_0_var(--dsv-color-primary-active)] hover:bg-primary-hover motion-safe:active:translate-y-0.5"
            >
              <Icon
                name={reader.preparing ? 'refresh' : reader.speaking ? 'pause' : 'volume'}
                size={36}
                className={reader.preparing ? 'motion-safe:animate-spin' : undefined}
              />
            </button>
          )}
          <div className="flex min-w-0 flex-col gap-2">
            {reader.supported && (
              <span aria-hidden="true" className="text-[22px] font-bold text-on-surface">
                {reader.preparing ? 'Đang chuẩn bị…' : reader.speaking ? 'Dừng' : 'Nghe'}
              </span>
            )}
            <span className="sr-only" aria-live="polite">
              {reader.preparing ? 'Đang chuẩn bị giọng đọc' : ''}
            </span>
            {total > 1 && (
              <>
                <span className="sr-only">{`Đoạn ${index + 1} trên ${total}`}</span>
                <span aria-hidden="true" className="flex gap-1.5">
                  {Array.from({ length: total }, (_, i) => (
                    <i key={i} className={cn('block h-2 w-7 rounded-full', i <= index ? 'bg-primary' : 'bg-border')} />
                  ))}
                </span>
              </>
            )}
          </div>
          {reader.supported && showSwitch && (
            <AutoReadSwitch
              on={autoRead}
              onChange={(on) => {
                onAutoRead(on);
                if (!on) stop();
              }}
              className="ml-auto text-[16px]"
            />
          )}
        </div>
        {heritageTo && (
          <TextLink to={heritageTo} className="w-fit">
            Xem về di sản này
          </TextLink>
        )}
      </div>
    </article>
  );
}

// ---- Nhớ lại ----

/** Câu ôn ở dạng câu của lượt làm bài để dùng chung lời phản hồi với bài chơi cấp 1. */
function asAttemptQuestion(question: RecallQuestion, index: number): AttemptQuestion {
  return {
    questionId: question.questionId,
    position: index + 1,
    point: null,
    questionType: question.questionType,
    typeName: '',
    content: question.content,
    imageUrl: question.imageUrl,
    passage: null,
    passageSource: null,
    options: question.options,
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    partsTotal: 1,
    answered: false,
    answer: null,
    checked: false,
  };
}

function RecallStep({ questions, readAloud, onFinish }: { questions: RecallQuestion[]; readAloud: boolean; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const lockUntil = useRef(0);
  const question = questions[index]!;
  const last = index === questions.length - 1;
  const answered = picked !== null;

  const feedback = useMemo(() => {
    if (picked === null) return null;
    const right = picked === question.correctIndex;
    const check: AnswerCheck = {
      questionId: question.questionId,
      isCorrect: right,
      firstTryCorrect: right,
      tryCount: 2,
      parts: [right],
      correctAnswer: { selectedIndex: question.correctIndex },
      explanation: question.explanation,
      answeredCount: 0,
      questionCount: questions.length,
    };
    return practiceFeedback(asAttemptQuestion(question, index), check, { last });
  }, [index, last, picked, question, questions.length]);

  // Nhờ máy chủ tạo trước tiếng các câu ôn (bước này chỉ có khi không phải xem trước).
  usePrefetchSpeech(
    useMemo(() => questions.map((q) => q.content), [questions]),
    true,
  );

  // Câu hỏi tự đọc khi em sang câu; phản hồi tự đọc khi em vừa chạm (khi bật "Tự đọc to").
  useEffect(() => {
    if (readAloud) void speakVietnamese(question.content);
  }, [question.content, readAloud]);
  useEffect(() => {
    if (readAloud && feedback) void speakVietnamese(feedback.speech);
  }, [feedback, readAloud]);

  const pick = (option: number) => {
    if (answered || Date.now() < lockUntil.current) return;
    setPicked(option);
  };
  const advance = () => {
    if (last) return onFinish();
    setIndex(index + 1);
    setPicked(null);
    lockUntil.current = Date.now() + TAP_LOCK_MS;
  };

  return (
    <section aria-labelledby="nho-lai" className="flex flex-col gap-5 rounded-[28px] border-2 border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="nho-lai" className="text-[20px] font-bold text-primary">
          Nhớ lại bài trước
          {question.lessonTitle && <span className="block text-[16px] font-medium text-on-surface-variant">{`Bài “${question.lessonTitle}”`}</span>}
        </h2>
        {questions.length > 1 && (
          <span className="flex items-center gap-2">
            <span className="sr-only">{`Câu ${index + 1} trên ${questions.length}`}</span>
            {questions.map((q, i) => (
              <i
                key={q.questionId}
                aria-hidden="true"
                className={cn('block rounded-full', i === index ? 'size-5 bg-primary' : i < index ? 'size-3.5 bg-primary/60' : 'size-3.5 bg-border')}
              />
            ))}
          </span>
        )}
      </div>
      <div className="flex items-start gap-3">
        <LevelOneSpeak text={question.content} label="Nghe câu hỏi" size={56} />
        <p className="min-w-0 flex-1 text-[28px] leading-[1.3] font-bold text-on-surface">{question.content}</p>
      </div>
      {question.imageUrl && <img src={question.imageUrl} alt="" className="max-h-72 w-full rounded-[20px] object-cover" />}
      <LevelOneChoices
        kind={question.questionType}
        options={question.options}
        picked={picked}
        tried={answered && picked !== question.correctIndex ? new Set([picked]) : undefined}
        correct={answered ? question.correctIndex : null}
        disabled={answered}
        onPick={pick}
        label="Các câu trả lời"
      />
      <div aria-live="polite">
        {feedback && (
          <div className={cn('flex flex-col gap-4 rounded-[24px] p-4 sm:p-5', feedback.tone === 'correct' ? 'bg-success-container text-on-success-container' : 'bg-primary-container text-on-primary-container')}>
            <div className="flex items-center gap-3">
              <Illustration state={feedback.tone === 'correct' ? 'chuc-mung' : 'dong-vien'} className="size-14 rounded-full bg-surface" />
              <p className="min-w-0 flex-1 text-[24px] leading-tight font-bold">{feedback.title}</p>
              <LevelOneSpeak text={feedback.speech} label="Nghe lại" size={48} soft />
            </div>
            <p className="text-[20px] leading-[1.5]">{feedback.text}</p>
            <LevelOneButton onClick={advance}>{last ? 'Nghe chuyện mới' : 'Câu tiếp'}</LevelOneButton>
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Nhận thẻ ----

type EarnState = { status: 'loading' } | { status: 'done'; data: LessonCompletion } | { status: 'error' };

function EarnCardStep({ lesson, onPlay, onRestart }: { lesson: StudentLesson; onPlay: (() => void) | null; onRestart: () => void }) {
  const links = useLessonLinks();
  const complete = links.completeLesson;
  const sample = links.preview || !complete;
  const [state, setState] = useState<EarnState>({ status: 'loading' });
  const started = useRef(false);

  const load = useCallback(() => {
    if (!complete) return;
    setState({ status: 'loading' });
    complete(lesson.accessCode)
      .then((data) => setState({ status: 'done', data }))
      .catch(() => setState({ status: 'error' }));
  }, [complete, lesson.accessCode]);

  // Ghi em đã học xong bài một lần khi vào bước (máy chủ cũng chỉ ghi một lần dù gọi lại).
  useEffect(() => {
    if (sample || started.current) return;
    started.current = true;
    load();
  }, [load, sample]);

  const sampleCards: Array<Pick<StudentAlbumCard, 'heritageId' | 'name' | 'thumbnailUrl'>> = lesson.heritages.map((h) => ({
    heritageId: h.id,
    name: h.name,
    thumbnailUrl: h.thumbnailUrl,
  }));
  const done = state.status === 'done' ? state.data : null;
  // Câu mang về nhà chỉ có sau khi ghi bài đã học xong: nhờ máy chủ tạo trước tiếng ngay để em bấm nghe là có.
  usePrefetchSpeech([done?.takeHome ? takeHomeSpeech(done.takeHome) : null], !sample);
  const cards = sample ? sampleCards : (done?.cards ?? []);
  const cardNote = sample || done?.firstTime ? 'Thẻ mới vào album' : 'Đã có trong album';

  return (
    <section aria-labelledby="nhan-the" className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-[28px] bg-surface-container-low p-5 text-center sm:p-6">
        <Illustration state="chuc-mung" className="size-[104px] rounded-full bg-surface" />
        <h2 id="nhan-the" className="text-[28px] leading-tight font-bold text-on-surface">
          Em học xong bài rồi!
        </h2>
        <div aria-live="polite" className="flex w-full flex-col items-center gap-3">
          {!sample && state.status === 'loading' && <p className="text-[20px] text-on-surface-variant">Đang đưa thẻ vào album của em…</p>}
          {!sample && state.status === 'error' && (
            <>
              <p className="text-[20px] text-on-surface">Mạng đang chập chờn. Em bấm Thử lại nhé.</p>
              <LevelOneButton onClick={load}>
                <Icon name="refresh" size={24} />
                Thử lại
              </LevelOneButton>
            </>
          )}
          {cards.length > 0 && (sample || done) && (
            <ul className={cn('grid w-full gap-3', cards.length > 1 ? 'sm:grid-cols-2' : 'max-w-[440px]')}>
              {cards.map((card) => (
                <li key={card.heritageId}>
                  <HeritageCardRow card={card} note={cardNote} />
                </li>
              ))}
            </ul>
          )}
          {done && <p className="text-[18px] font-bold text-on-surface">{`Album của em có ${done.albumCollected} thẻ`}</p>}
        </div>
      </div>

      {done && <TakeHomeBox text={done.takeHome} />}

      {onPlay && (
        <div className="flex flex-wrap items-center gap-4 rounded-[24px] border-2 border-dashed border-border p-4">
          <p className="min-w-0 flex-1 text-[20px] text-on-surface">Em chưa chơi bài chơi của bài này. Chơi để nhận sao nhé!</p>
          <LevelOneButton variant="secondary" size="md" onClick={onPlay}>
            <Icon name="play" size={22} />
            Chơi ngay
          </LevelOneButton>
        </div>
      )}

      {lesson.keyPoints.length > 0 && (
        <div className="rounded-[24px] border-2 border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <h3 className="text-[22px] font-bold text-on-surface">Em nhớ nhé</h3>
            <LevelOneSpeak text={lesson.keyPoints.join('. ')} label="Nghe các ý em cần nhớ" size={48} soft />
          </div>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-6 text-[20px] leading-[1.5] text-on-surface">
            {lesson.keyPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {links.home ? (
          <LevelOneButtonLink to={links.home} className="flex-1">
            Về con đường
          </LevelOneButtonLink>
        ) : (
          <LevelOneButton className="flex-1" onClick={onRestart}>
            Xem lại từ đầu
          </LevelOneButton>
        )}
        {links.album && (
          <LevelOneButtonLink to={links.album} variant="secondary" className="flex-1">
            <Icon name="cards" size={24} />
            Xem album
          </LevelOneButtonLink>
        )}
      </div>
    </section>
  );
}
