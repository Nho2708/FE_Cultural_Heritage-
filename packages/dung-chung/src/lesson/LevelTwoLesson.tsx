import type { StudentLesson } from '../api';
import { ButtonLink, Icon, TabPanel, Tabs, TextLink } from '../ui';
import { useState } from 'react';
import { milestonesOf, sectionsOf } from './lessonData';
import { useLessonLinks } from './lessonLinks';
import { HeritageLinks, LessonFigure, Paragraphs, QuizList } from './LessonParts';

// Bài học — bố cục cấp 2 (khối 6-9): đầu bài có ảnh lớn, ba bước chuyển qua lại tự do bằng tab (Đọc bài · Dòng thời gian của bài ·
// Bài kiểm tra), cột bên phải liệt kê bài kiểm tra kèm trạng thái với riêng em. Bài đọc có hình kèm chú thích, ý chính đóng khung,
// thẻ di sản của bài.

type TabId = 'READ' | 'TIMELINE' | 'QUIZ';
const PREFIX = 'bai-hoc-cap-2';

export function LevelTwoLesson({ lesson }: { lesson: StudentLesson }) {
  const links = useLessonLinks();
  const [tab, setTab] = useState<TabId>('READ');
  const milestones = milestonesOf(lesson);
  const body = sectionsOf(lesson, 'READING', 'IMAGE');
  const hero = sectionsOf(lesson, 'IMAGE').find((s) => s.imageUrl)?.imageUrl ?? lesson.heritages.find((h) => h.thumbnailUrl)?.thumbnailUrl ?? null;
  const tabs = lesson.layout.steps
    .filter((s) => s.key === 'READ' || s.key === 'TIMELINE' || s.key === 'QUIZ')
    .map((s) => ({
      id: s.key as TabId,
      label: s.key === 'READ' ? 'Đọc bài' : s.key === 'TIMELINE' ? 'Dòng thời gian của bài' : 'Bài kiểm tra',
    }));
  const firstTimeline = lesson.heritages.find((h) => h.hasTimeline);

  return (
    <section data-bo-cuc="cap-2" aria-labelledby="tieu-de-bai">
      {!links.preview && <title>{`${lesson.title ?? 'Bài học'} · DiViet`}</title>}
      <header
        className="relative flex min-h-56 items-end bg-surface-container-low bg-cover bg-center"
        style={hero ? { backgroundImage: `linear-gradient(to top, rgb(0 0 0 / 0.75), rgb(0 0 0 / 0.1)), url("${hero}")` } : undefined}
      >
        {/* Trên ảnh đầu bài, chữ dùng token on-image (trắng): bảng màu Tailwind đã thay bằng token nên không có lớp text-white. */}
        <div className={`dsv-content py-6 ${hero ? 'text-on-image' : 'text-on-surface'}`}>
          {links.home && (
            <ButtonLink to={links.home} variant="link" className={hero ? 'text-on-image!' : undefined}>
              <Icon name="arrow-left" size={16} />
              Trang học của em
            </ButtonLink>
          )}
          <p className="mt-3 type-label-kicker">
            BÀI HỌC · MÃ <span translate="no">{lesson.accessCode}</span>
          </p>
          <h1 id="tieu-de-bai" className="mt-1 type-h1">
            {lesson.title}
          </h1>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 type-body-s">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="users" size={16} />
              Lớp {lesson.className}
            </span>
            {lesson.teacherName && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user" size={16} />
                {lesson.teacherName}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icon name="file-text" size={16} />
              {lesson.quizzes.length} bài kiểm tra
            </span>
          </p>
        </div>
      </header>

      <div className="dsv-content dsv-section">
        <div className="grid gap-(--dsv-block-gap) lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-4">
              <Tabs idPrefix={PREFIX} label="Các bước của bài" items={tabs} value={tab} onChange={setTab} />
              <p className="type-body-s text-on-surface-variant">Em có thể chuyển qua lại giữa các bước bất cứ lúc nào.</p>
            </div>

            <TabPanel idPrefix={PREFIX} id={tab}>
              {tab === 'READ' && (
                <div className="mt-6 flex flex-col gap-5">
                  <h2 className="type-h2 text-on-surface">Đọc bài</h2>
                  <div className="flex flex-col gap-4 type-body-m text-on-surface">
                    <Paragraphs text={lesson.summary} />
                  </div>
                  {body.map((section, index) =>
                    section.type === 'IMAGE' ? (
                      <LessonFigure key={index} url={section.imageUrl} caption={section.body} image={section.image} />
                    ) : (
                      <div key={index} className="flex flex-col gap-4 type-body-m text-on-surface">
                        {section.title && <h3 className="type-h3">{section.title}</h3>}
                        <Paragraphs text={section.body} />
                      </div>
                    ),
                  )}

                  {lesson.keyPoints.length > 0 && (
                    <section aria-labelledby="y-chinh" className="flex flex-col gap-3">
                      <h2 id="y-chinh" className="type-h3 text-on-surface">
                        Ý chính
                      </h2>
                      <ol className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
                        {lesson.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-3 type-body-m">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary-container type-label text-on-secondary-container">
                              {index + 1}
                            </span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  <section aria-labelledby="di-san-trong-bai" className="flex flex-col gap-3">
                    <h2 id="di-san-trong-bai" className="type-h3 text-on-surface">
                      Di sản trong bài
                    </h2>
                    <HeritageLinks heritages={lesson.heritages} />
                  </section>
                </div>
              )}

              {tab === 'TIMELINE' && (
                <div className="mt-6 flex flex-col gap-5">
                  <h2 className="type-h2 text-on-surface">Dòng thời gian của bài</h2>
                  {milestones.length === 0 ? (
                    <p className="type-body-m text-on-surface-variant">Bài này chưa có mốc thời gian.</p>
                  ) : (
                    <ol className="flex flex-col border-l-2 border-border-strong pl-5">
                      {milestones.map((m, index) => (
                        <li key={index} className="relative pb-5">
                          <span aria-hidden="true" className="absolute top-1.5 -left-[27px] size-3 rounded-full bg-primary" />
                          <p className="type-h4 text-primary">{m.milestoneLabel ?? m.milestoneYear}</p>
                          <p className="mt-1 type-body-m text-on-surface">{m.body}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                  {firstTimeline && links.timeline(firstTimeline.slug) && (
                    <TextLink to={links.timeline(firstTimeline.slug)!} className="w-fit">
                      Xem dòng thời gian đầy đủ của {firstTimeline.name}
                    </TextLink>
                  )}
                </div>
              )}

              {tab === 'QUIZ' && (
                <div className="mt-6 flex flex-col gap-4">
                  <h2 className="type-h2 text-on-surface">Bài kiểm tra của bài</h2>
                  <p className="type-body-s text-on-surface-variant">Mỗi em chỉ làm mỗi bài kiểm tra một lần.</p>
                  <QuizList code={lesson.accessCode} quizzes={lesson.quizzes} variant="card" />
                </div>
              )}
            </TabPanel>
          </div>

          {tab !== 'QUIZ' && (
            <aside aria-labelledby="bai-kiem-tra-cua-bai" className="flex flex-col gap-3 lg:pt-14">
              <h2 id="bai-kiem-tra-cua-bai" className="type-h3 text-on-surface">
                Bài kiểm tra của bài
              </h2>
              <p className="type-body-s text-on-surface-variant">Mỗi em chỉ làm mỗi bài kiểm tra một lần.</p>
              <QuizList code={lesson.accessCode} quizzes={lesson.quizzes} variant="card" />
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
