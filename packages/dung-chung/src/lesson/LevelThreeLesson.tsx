import type { StudentLesson } from '../api';
import { ButtonLink, Icon, type IconName } from '../ui';
import { Link } from 'react-router';
import { milestonesOf, sectionsOf } from './lessonData';
import { useLessonLinks } from './lessonLinks';
import { LessonFigure, Paragraphs, QuizList } from './LessonParts';

// Bài học — bố cục cấp 3 (khối 10-12): trang tài liệu. Mục lục cố định ở bên trái, một cột nội dung rộng, đề mục và đường kẻ phân
// cách, đoạn trích tư liệu gốc có khung và nguồn, câu hỏi gợi suy nghĩ (không chấm điểm, không lưu câu trả lời), liên kết di sản,
// bài kiểm tra dạng dòng. Không linh vật, không thẻ hình lớn.

interface LinkRow {
  key: string;
  to: string;
  icon: IconName;
  label: string;
}

interface TocItem {
  id: string;
  label: string;
}

export function LevelThreeLesson({ lesson }: { lesson: StudentLesson }) {
  const links = useLessonLinks();
  const readings = sectionsOf(lesson, 'READING');
  const milestones = milestonesOf(lesson);
  const excerpts = sectionsOf(lesson, 'SOURCE_EXCERPT');
  const reflections = sectionsOf(lesson, 'REFLECTION');

  const toc: TocItem[] = [
    { id: 'noi-dung-chinh', label: 'Nội dung chính' },
    ...readings.map((r, index) => ({ id: `phan-${index + 1}`, label: r.title ?? `Phần ${index + 1}` })),
    ...(milestones.length > 0 ? [{ id: 'cac-moc', label: 'Các mốc thời gian' }] : []),
    ...(excerpts.length > 0 ? [{ id: 'tu-lieu-goc', label: 'Tư liệu gốc' }] : []),
    ...(reflections.length > 0 ? [{ id: 'cau-hoi', label: 'Câu hỏi gợi suy nghĩ' }] : []),
    ...(lesson.keyPoints.length > 0 ? [{ id: 'y-chinh', label: 'Ý chính' }] : []),
    { id: 'lien-ket', label: 'Liên kết' },
    { id: 'bai-kiem-tra', label: 'Bài kiểm tra của bài' },
  ];
  const first = lesson.heritages[0];
  const firstTo = first ? links.heritage(first.slug) : null;
  const mapped = lesson.heritages.find((h) => h.latitude !== null && h.longitude !== null && links.map(h.slug));
  const linkRows: LinkRow[] = [
    ...(first && firstTo ? [{ key: 'chi-tiet', to: firstTo, icon: 'file-text' as const, label: `Chi tiết di sản: ${first.name}` }] : []),
    ...(mapped ? [{ key: `ban-do-${mapped.id}`, to: links.map(mapped.slug)!, icon: 'map' as const, label: 'Xem vị trí trên bản đồ di sản' }] : []),
    ...lesson.heritages
      .filter((h) => h.hasTimeline && links.timeline(h.slug))
      .map((h) => ({ key: `dong-thoi-gian-${h.id}`, to: links.timeline(h.slug)!, icon: 'clock' as const, label: `Dòng thời gian của di sản: ${h.name}` })),
  ];
  const images = sectionsOf(lesson, 'IMAGE').filter((s) => s.imageUrl);

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-3" aria-labelledby="tieu-de-bai">
      {!links.preview && <title>{`${lesson.title ?? 'Bài học'} · Vietnam Heritage`}</title>}
      <div className="grid gap-(--dsv-block-gap) lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="h-fit lg:sticky lg:top-20">
          <nav aria-label="Mục lục" className="rounded-md border border-border bg-surface p-2">
            <p className="flex items-center gap-2 px-3 py-2 type-label text-on-surface-variant">
              <Icon name="list" size={16} />
              Mục lục
            </p>
            <ul>
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="block rounded-sm px-3 py-2 type-body-m text-on-surface hover:bg-surface-container-low">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {links.home && (
            <p className="mt-3 px-1">
              <ButtonLink to={links.home} variant="link">
                <Icon name="arrow-left" size={16} />
                Trang học của em
              </ButtonLink>
            </p>
          )}
        </div>

        <article className="min-w-0">
          <p className="type-label-kicker text-on-surface-muted">
            BÀI HỌC · MÃ <span translate="no">{lesson.accessCode}</span>
          </p>
          <h1 id="tieu-de-bai" className="mt-1 type-h1 text-on-surface">
            {lesson.title}
          </h1>
          <p className="mt-2 type-body-s text-on-surface-variant">
            Lớp {lesson.className}
            {lesson.teacherName ? ` · ${lesson.teacherName}` : ''}
            {lesson.heritages.length > 0 ? ` · Di sản: ${lesson.heritages.map((h) => h.name).join(', ')}` : ''} · {lesson.quizzes.length} bài kiểm tra
          </p>

          <hr className="my-6 border-border" />

          <section id="noi-dung-chinh" aria-labelledby="noi-dung-chinh-tieu-de" className="scroll-mt-20">
            <h2 id="noi-dung-chinh-tieu-de" className="type-h2 text-on-surface">
              Nội dung chính
            </h2>
            <div className="mt-3 flex flex-col gap-3 type-body-m text-on-surface">
              <Paragraphs text={lesson.summary} />
            </div>
            {images.map((image, index) => (
              <LessonFigure key={index} url={image.imageUrl} caption={image.body} image={image.image} className="mt-4 max-w-md" />
            ))}
          </section>

          {readings.map((reading, index) => (
            <section key={index} id={`phan-${index + 1}`} aria-labelledby={`phan-${index + 1}-tieu-de`} className="scroll-mt-20">
              <hr className="my-6 border-border" />
              <h2 id={`phan-${index + 1}-tieu-de`} className="type-h2 text-on-surface">
                {reading.title ?? `Phần ${index + 1}`}
              </h2>
              <div className="mt-3 flex flex-col gap-3 type-body-m text-on-surface">
                <Paragraphs text={reading.body} />
              </div>
            </section>
          ))}

          {milestones.length > 0 && (
            <section id="cac-moc" aria-labelledby="cac-moc-tieu-de" className="scroll-mt-20">
              <hr className="my-6 border-border" />
              <h2 id="cac-moc-tieu-de" className="type-h2 text-on-surface">
                Các mốc thời gian
              </h2>
              <dl className="mt-3 divide-y divide-border rounded-md border border-border bg-surface type-body-m">
                {milestones.map((m, index) => (
                  <div key={index} className="grid grid-cols-[110px_1fr] gap-4 px-4 py-3">
                    <dt className="font-medium text-on-surface">{m.milestoneLabel ?? m.milestoneYear}</dt>
                    <dd className="text-on-surface-variant">{m.body}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {excerpts.length > 0 && (
            <section id="tu-lieu-goc" aria-labelledby="tu-lieu-goc-tieu-de" className="scroll-mt-20">
              <hr className="my-6 border-border" />
              <h2 id="tu-lieu-goc-tieu-de" className="type-h2 text-on-surface">
                Tư liệu gốc
              </h2>
              <p className="mt-3 type-body-m text-on-surface">Các đoạn trích dưới đây là tư liệu để em đọc và đối chiếu.</p>
              <div className="mt-3 flex flex-col gap-4">
                {excerpts.map((excerpt, index) => (
                  <blockquote key={index} className="rounded-sm border-l-4 border-primary bg-surface-container-low px-5 py-4">
                    <p className="flex items-center gap-2 type-label text-on-surface-variant">
                      <Icon name="quote" size={16} />
                      Tư liệu
                    </p>
                    <p className="mt-2 type-body-m text-on-surface italic">“{excerpt.body}”</p>
                    <p className="mt-2 type-body-s text-on-surface-variant">Nguồn: {excerpt.sourceCitation}</p>
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {reflections.length > 0 && (
            <section id="cau-hoi" aria-labelledby="cau-hoi-tieu-de" className="scroll-mt-20">
              <hr className="my-6 border-border" />
              <h2 id="cau-hoi-tieu-de" className="type-h2 text-on-surface">
                Câu hỏi gợi suy nghĩ
              </h2>
              <p className="mt-3 flex items-center gap-2 rounded-sm bg-surface-container-low px-3 py-2 type-body-s text-on-surface-variant">
                <Icon name="info" size={16} className="shrink-0" />
                Câu hỏi chỉ để em suy nghĩ: không chấm điểm và không lưu câu trả lời.
              </p>
              <ol className="mt-3 flex list-decimal flex-col gap-3 pl-6 type-body-m text-on-surface">
                {reflections.map((q, index) => (
                  <li key={index}>{q.body}</li>
                ))}
              </ol>
            </section>
          )}

          {lesson.keyPoints.length > 0 && (
            <section id="y-chinh" aria-labelledby="y-chinh-tieu-de" className="scroll-mt-20">
              <hr className="my-6 border-border" />
              <h2 id="y-chinh-tieu-de" className="type-h2 text-on-surface">
                Ý chính
              </h2>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-6 type-body-m text-on-surface">
                {lesson.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>
          )}

          <section id="lien-ket" aria-labelledby="lien-ket-tieu-de" className="scroll-mt-20">
            <hr className="my-6 border-border" />
            <h2 id="lien-ket-tieu-de" className="type-h2 text-on-surface">
              Liên kết
            </h2>
            {lesson.heritages.length === 0 ? (
              <p className="mt-3 type-body-m text-on-surface-variant">Chưa có di sản đang hiển thị.</p>
            ) : linkRows.length === 0 ? (
              <p className="mt-3 type-body-m text-on-surface-variant">
                Di sản của bài: {lesson.heritages.map((h) => h.name).join(', ')}.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface type-body-m">
                {linkRows.map((row) => (
                  <li key={row.key}>
                    <Link className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low" to={row.to}>
                      <Icon name={row.icon} size={18} />
                      <span className="min-w-0 flex-1">{row.label}</span>
                      <Icon name="chevron-right" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="bai-kiem-tra" aria-labelledby="bai-kiem-tra-tieu-de" className="scroll-mt-20">
            <hr className="my-6 border-border" />
            <h2 id="bai-kiem-tra-tieu-de" className="type-h2 text-on-surface">
              Bài kiểm tra của bài
            </h2>
            <p className="mt-3 mb-3 type-body-s text-on-surface-variant">
              Mỗi bài kiểm tra cấp 3 có thời gian làm bài và đồng hồ đếm ngược. Hết giờ, bài tự nộp. Mỗi em chỉ làm một lần.
            </p>
            <QuizList code={lesson.accessCode} quizzes={lesson.quizzes} variant="row" />
          </section>
        </article>
      </div>
    </section>
  );
}
