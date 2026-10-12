import { cn } from '../cn';
import type { StudentLesson } from '../api';
import { Button, ButtonLink, Icon, InlineMessage, TextLink, type IconName } from '../ui';
import { useEffect, useState } from 'react';
import { useAutoRead, useAutoSpeak } from './autoRead';
import { AutoReadSwitch } from './AutoReadSwitch';
import { Illustration } from './Illustration';
import { sectionsOf } from './lessonData';
import { useLessonLinks } from './lessonLinks';
import { HeritageLinks, LessonFigure, QuizList } from './LessonParts';
import { SpeakButton } from './SpeakButton';
import { useSpeech } from './useSpeech';

// Bài học — bố cục cấp 1 (khối 1-5): kể chuyện từng bước, mỗi bước một hình lớn và một đoạn ngắn, chữ to, nút lớn, nút loa đọc to
// bằng giọng đọc của trình duyệt; câu chuyện tự đọc to khi em vào mỗi đoạn (em tắt được). Luồng đi lần lượt: Nghe chuyện → Xem hình → Chơi → Nhận sao; em ra giữa chừng thì lần sau mở lại
// đúng bước đang dừng (nhớ trên máy này). Không có bảng, không có chữ dài.

const STEP_ICON: Record<string, IconName> = {
  LISTEN_STORY: 'headphones',
  VIEW_IMAGES: 'image',
  PLAY: 'play',
  EARN_STARS: 'star',
};

function clamp(value: number, max: number) {
  return Math.min(Math.max(value, 0), Math.max(max, 0));
}

/** Bước đang dừng: `step` là chỉ số bước, `part` là đoạn trong bước Nghe chuyện. */
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

export function LevelOneLesson({ lesson, initialPosition, onPositionChange }: LevelOneLessonProps) {
  const links = useLessonLinks();
  const steps = lesson.layout.steps;
  const story = sectionsOf(lesson, 'STORY');
  const gallery = [
    ...story.filter((s) => s.imageUrl).map((s) => ({ url: s.imageUrl, caption: s.title, image: s.image })),
    ...sectionsOf(lesson, 'IMAGE').map((s) => ({ url: s.imageUrl, caption: s.body, image: s.image })),
  ];
  const parts = story.length > 0 ? story.map((s) => ({ text: s.body ?? '', url: s.imageUrl, caption: s.title, image: s.image })) : [{ text: lesson.summary ?? '', url: null, caption: null, image: null }];

  const [position, setPosition] = useState(() => {
    const saved = initialPosition ?? { step: 0, part: 0 };
    const step = clamp(saved.step, steps.length - 1);
    return { step, part: step === 0 ? clamp(saved.part, parts.length - 1) : 0 };
  });
  const speech = useSpeech();
  const [autoRead, setAutoRead] = useAutoRead();

  useEffect(() => {
    onPositionChange?.(position);
  }, [onPositionChange, position]);

  const stepKey = steps[position.step]?.key ?? 'LISTEN_STORY';
  const part = parts[position.part] ?? parts[0]!;
  const go = (next: { step: number; part: number }) => {
    speech.stop();
    setPosition(next);
    window.scrollTo?.({ top: 0 });
  };
  const next = () => {
    if (stepKey === 'LISTEN_STORY' && position.part < parts.length - 1) go({ step: position.step, part: position.part + 1 });
    else go({ step: Math.min(position.step + 1, steps.length - 1), part: 0 });
  };
  // Câu chuyện tự đọc to khi em vào mỗi đoạn (tắt được; xem trước của giáo viên thì không tự đọc). Nút loa vẫn để nghe lại hoặc dừng.
  useAutoSpeak(speech.speak, part.text, autoRead && speech.supported && stepKey === 'LISTEN_STORY' && !links.preview);
  const firstHeritage = lesson.heritages[0];
  const firstHeritageTo = firstHeritage ? links.heritage(firstHeritage.slug) : null;

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1" aria-labelledby="tieu-de-bai">
      {!links.preview && <title>{`${lesson.title ?? 'Bài học'} · Học di sản`}</title>}
      <div className="mx-auto flex max-w-[960px] flex-col gap-(--dsv-block-gap)">
        <div className="flex flex-wrap items-center gap-4">
          {links.home && (
            <ButtonLink to={links.home} variant="secondary" size="lg" className="rounded-full">
              <Icon name="arrow-left" size={22} />
              Trang học
            </ButtonLink>
          )}
          <h1 id="tieu-de-bai" className="type-h1 min-w-0 flex-1 text-on-surface">
            {lesson.title}
          </h1>
        </div>

        <ol aria-label="Các bước của bài" className="grid grid-cols-4 gap-2">
          {steps.map((step, index) => {
            const done = index < position.step;
            const current = index === position.step;
            return (
              <li key={step.key} className="flex flex-col items-center gap-2 text-center" aria-current={current ? 'step' : undefined}>
                <button
                  type="button"
                  disabled={index > position.step}
                  onClick={() => go({ step: index, part: 0 })}
                  aria-label={step.label}
                  className={cn(
                    'flex size-14 items-center justify-center rounded-full border-2',
                    current
                      ? 'border-primary bg-primary text-on-primary'
                      : done
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-border bg-surface text-on-surface-variant',
                  )}
                >
                  <Icon name={done ? 'check' : (STEP_ICON[step.key] ?? 'star')} size={26} />
                </button>
                <span className={cn('type-label', current ? 'text-primary' : 'text-on-surface-variant')}>{step.label}</span>
              </li>
            );
          })}
        </ol>

        {stepKey === 'LISTEN_STORY' && (
          <article className="overflow-hidden rounded-lg border-2 border-border bg-surface" aria-label="Câu chuyện">
            {part.url ? (
              <img src={part.url} alt={part.caption ?? ''} className="max-h-[440px] w-full object-cover" />
            ) : (
              <div className="flex h-48 items-center justify-center bg-image-placeholder text-on-surface-variant">
                <Illustration state="trong" />
              </div>
            )}
            <div className="flex flex-col gap-4 p-(--dsv-inline-gap)">
              <span className="w-fit rounded-full bg-secondary-container px-4 py-1 type-label text-on-secondary-container">{`Đoạn ${position.part + 1} / ${parts.length}`}</span>
              <p className="type-h3 leading-relaxed text-on-surface">{part.text}</p>
              {speech.supported && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => (speech.speaking ? speech.stop() : speech.speak(part.text))}
                    className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary active:scale-95"
                    aria-label={speech.speaking ? 'Dừng đọc' : 'Đọc to đoạn này'}
                  >
                    <Icon name="volume" size={28} />
                  </button>
                  <span className="type-body-m text-primary" aria-live="polite">
                    {speech.speaking ? 'Đang đọc cho em nghe…' : 'Bấm loa để nghe đọc'}
                  </span>
                  {!speech.speaking && (
                    <Button variant="secondary" size="lg" onClick={() => speech.speak(part.text)} className="ml-auto rounded-full">
                      Nghe lại
                    </Button>
                  )}
                </div>
              )}
              {speech.supported && !links.preview && (
                <AutoReadSwitch
                  on={autoRead}
                  onChange={(on) => {
                    setAutoRead(on);
                    if (!on) speech.stop();
                  }}
                  className="w-fit"
                />
              )}
              {firstHeritageTo && <TextLink to={firstHeritageTo}>Xem về di sản này</TextLink>}
            </div>
          </article>
        )}

        {stepKey === 'VIEW_IMAGES' && (
          <div className="grid gap-4 dsvsm:grid-cols-2">
            {gallery.length === 0 ? (
              <p className="type-h4 text-on-surface-variant">Bài này chưa có hình để xem. Em bấm "Tiếp nhé" nhé!</p>
            ) : (
              gallery.map((item, index) => (
                <div key={index} className="rounded-lg border-2 border-border bg-surface p-3">
                  <LessonFigure url={item.url} caption={null} image={item.image} />
                  {item.caption && (
                    <div className="mt-2 flex items-center gap-3">
                      <p className="type-h4 min-w-0 flex-1 text-on-surface">{item.caption}</p>
                      <SpeakButton text={item.caption} label={`Nghe: ${item.caption}`} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {stepKey === 'PLAY' && (
          <section aria-labelledby="bai-choi" className="flex flex-col gap-4">
            <h2 id="bai-choi" className="type-h2 text-on-surface">
              Bài chơi của em
            </h2>
            {lesson.quizzes.length === 0 ? (
              <div className="flex items-center gap-(--dsv-inline-gap) rounded-lg border-2 border-dashed border-border-strong p-(--dsv-inline-gap)">
                <Illustration state="trong" />
                <p className="type-h4">Chưa có bài chơi nào. Em bấm "Tiếp nhé" để đi tiếp!</p>
              </div>
            ) : (
              <QuizList code={lesson.accessCode} quizzes={lesson.quizzes} variant="large" />
            )}
          </section>
        )}

        {stepKey === 'EARN_STARS' && (
          <section aria-labelledby="nhan-sao" className="flex flex-col gap-4">
            <div className="flex items-center gap-(--dsv-inline-gap) rounded-lg bg-primary-container p-(--dsv-inline-gap) text-on-primary-container">
              <Illustration state="chuc-mung" className="size-24 bg-surface" />
              <div className="min-w-0">
                <h2 id="nhan-sao" className="type-h2">
                  Em học xong rồi! Giỏi quá!
                </h2>
                <p className="mt-2 type-body-m">Em làm bài chơi hoặc bài kiểm tra của bài để nhận sao nhé.</p>
              </div>
            </div>
            {lesson.keyPoints.length > 0 && (
              <div className="rounded-lg border-2 border-border bg-surface p-(--dsv-inline-gap)">
                <div className="flex items-center gap-3">
                  <h3 className="type-h3">Em nhớ nhé</h3>
                  <SpeakButton text={lesson.keyPoints.join('. ')} label="Nghe các ý em cần nhớ" />
                </div>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-6 type-h4">
                  {lesson.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            <HeritageLinks heritages={lesson.heritages} compact />
          </section>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {(position.part > 0 || position.step > 0) && (
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full"
              onClick={() =>
                stepKey === 'LISTEN_STORY' && position.part > 0
                  ? go({ step: position.step, part: position.part - 1 })
                  : go({ step: position.step - 1, part: 0 })
              }
            >
              <Icon name="arrow-left" size={22} />
              Quay lại
            </Button>
          )}
          {stepKey === 'EARN_STARS' ? (
            links.home ? (
              <ButtonLink to={links.home} size="lg" className="flex-1 rounded-full">
                Về trang học
              </ButtonLink>
            ) : (
              <Button size="lg" className="flex-1 rounded-full" onClick={() => go({ step: 0, part: 0 })}>
                Xem lại từ đầu
              </Button>
            )
          ) : (
            <Button size="lg" className="flex-1 rounded-full" onClick={next}>
              Tiếp nhé
            </Button>
          )}
        </div>

        {!links.preview && (
          <InlineMessage tone="info">
            Em ra ngoài giữa chừng cũng không sao. Lần sau vào lại trên máy này, bài sẽ mở đúng bước em đang dừng.
          </InlineMessage>
        )}
      </div>
    </section>
  );
}
