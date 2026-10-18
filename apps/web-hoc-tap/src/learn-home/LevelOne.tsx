import { cn } from '@dsvhvn/dung-chung';
import { studentCodeOf, type StudentClassDetail, type StudentProfile } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { Illustration, SpeakButton } from '@dsvhvn/dung-chung/lesson';
import { classFacts } from './classroom';
import { LearningSections } from './LearningSections';
import { useStudentHome } from './useStudentHome';
import { takeQuizPath } from '../quiz/quizData';
import { lessonPath } from '../lessons/lessonData';
import { Link } from 'react-router';

// Trang học của em — bản cấp 1 (khối 1-5): Thiết kế chuẩn gamification theo phong cách Duolingo:
// 1. Cột chính: Con đường bài học uốn lượn ziczac (Winding Snake Path), Unit Banner xanh lá, các trạm nút tròn 3D có bóng đổ dày,
//    nút đang làm có bong bóng "BẮT ĐẦU!" nảy nhịp nhàng, Rương kho báu Di Sản ở cuối chặng.
// 2. Cột phụ: Bảng chỉ số Duolingo (🔥 Streak, ⭐ Sao, ❤️ Trái tim), Nhiệm vụ mở mã bài học, Hộ chiếu Lớp của em.
// 3. Linh vật hoạt hình đứng cạnh đường đi cổ vũ bé bằng bong bóng thoại hoạt hình.

const X_OFFSETS = [0, -48, -80, -48, 0, 48, 80, 48, 0];

export function LevelOne({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const name = user.fullName ?? 'em';
  const { data: home } = useStudentHome();
  // Xác định trạng thái các bài học của học sinh:
  const openQuizzes = home?.openQuizzes ?? [];
  const myLessons = [...(home?.myLessons ?? [])].sort((a, b) => a.lessonId - b.lessonId);
  const inProgress = home?.inProgress ?? [];

  const isLessonDone = (l: (typeof myLessons)[number]) =>
    l.quizzesPublished > 0 && l.quizzesDone >= l.quizzesPublished;

  const unfinishedLesson = myLessons.find((l) => !isLessonDone(l));
  const allDone =
    myLessons.length > 0 &&
    myLessons.every(isLessonDone) &&
    openQuizzes.length === 0 &&
    inProgress.length === 0;

  const cheer = home?.cheer ?? 'Cùng vượt qua các trạm trên con đường di sản để nhận Sao và mở Rương Kho Báu! 🌟';
  const greeting = `Chào ${name}! Hôm nay mình cùng khám phá nhé!`;
  const facts = classFacts(classroom).filter((f) => ['Lớp', 'Giáo viên', 'Trường'].includes(f.label));

  // Tạo các trạm trên con đường học tập từ chính dữ liệu bài của học sinh:
  const pathNodes = (() => {
    const nodes: Array<{
      id: string;
      title: string;
      type: 'active' | 'done' | 'lesson' | 'quiz' | 'locked' | 'chest';
      icon: string;
      bubble?: string | null;
      to: string | null;
    }> = [];

    const focusProgress = inProgress[0];
    const focusOpenQuiz = !focusProgress ? openQuizzes[0] : undefined;
    const focusLesson = !focusProgress && !focusOpenQuiz ? unfinishedLesson : undefined;

    // 1. Trạm đang làm dở (nếu có)
    if (focusProgress) {
      const code = myLessons.find((l) => l.lessonId === focusProgress.lessonId)?.accessCode;
      nodes.push({
        id: `doing-${focusProgress.attemptId}`,
        title: focusProgress.quizName ?? 'Thử thách dở dang',
        type: 'active',
        icon: '⚡',
        bubble: 'LÀM TIẾP! ▶',
        to: code ? takeQuizPath(code, focusProgress.quizId) : pathOf('enterCode'),
      });
    }

    // 2. Các bài kiểm tra mở chưa nộp
    openQuizzes.forEach((q) => {
      if (q.quizId === focusProgress?.quizId) return;
      const isFocus = q === focusOpenQuiz;
      const code = q.needsLessonCode ? null : myLessons.find((l) => l.lessonId === q.lessonId)?.accessCode;
      nodes.push({
        id: `quiz-${q.quizId}`,
        title: q.name ?? 'Thử thách Đố vui',
        type: isFocus ? 'active' : q.needsLessonCode ? 'locked' : 'quiz',
        icon: isFocus ? '🎮' : q.needsLessonCode ? '🔒' : '🏛️',
        bubble: isFocus ? 'BẮT ĐẦU! ▼' : null,
        to: code ? takeQuizPath(code, q.quizId) : pathOf('enterCode'),
      });
    });

    // 3. Các bài học thật của học sinh: bài đã hoàn thành chuyển thành ⭐, bài chưa xong đầu tiên nhận tiêu điểm BẮT ĐẦU!
    myLessons.forEach((l) => {
      const done = isLessonDone(l);
      const isFocus = l === focusLesson;
      nodes.push({
        id: `lesson-${l.lessonId}`,
        title: l.title ?? 'Bài học Di sản',
        type: done ? 'done' : isFocus ? 'active' : 'lesson',
        icon: done ? '⭐' : '📖',
        bubble: isFocus ? 'BẮT ĐẦU! ▼' : null,
        to: l.accessCode ? lessonPath(l.accessCode) : pathOf('enterCode'),
      });
    });

    // 4. Nếu học sinh chưa có bài nào
    if (nodes.length === 0) {
      nodes.push({
        id: 'start-empty',
        title: 'Khởi hành: Nhập mã bài',
        type: 'active',
        icon: '🔑',
        bubble: 'BẮT ĐẦU! ▼',
        to: pathOf('enterCode'),
      });
    }

    // 5. Trạm đích cuối cùng: Rương Kho Báu Di Sản (chỉ khi hoàn thành hết các bài mới mở quà)
    nodes.push({
      id: 'chest-end',
      title: 'Rương Kho Báu Di Sản',
      type: 'chest',
      icon: '🎁',
      bubble: allDone ? 'MỞ QUÀ! 🎁' : null,
      to: pathOf('progress'),
    });

    return nodes;
  })();

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1">
      <title>Trang học của em · Vietnam Heritage</title>
      <div className="mx-auto w-full max-w-[1040px]">
        {/* Banner chính: Gộp Lời chào + Chặng 1 — tông Xanh Ngọc Di Sản mịn màng, thanh lịch */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 sm:p-7 text-white shadow-md border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="size-16 sm:size-20 shrink-0">
                <Illustration state="chao" className="size-full text-white drop-shadow-md" />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="rounded-full bg-white/20 backdrop-blur-xs px-3 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-50">
                    CHẶNG 1 · LỚP {classroom.name}
                  </span>
                  {classroom.teacherName && (
                    <span className="text-xs font-bold text-emerald-100">
                      👩‍🏫 Thầy cô: {classroom.teacherName}
                    </span>
                  )}
                </div>
                <h1 className="type-h1 font-black text-white tracking-tight leading-tight mt-1.5">
                  {greeting}
                </h1>
                <p className="text-emerald-100 font-medium text-xs sm:text-sm mt-1">
                  {cheer}
                </p>
              </div>
            </div>
            <SpeakButton
              text={`${greeting} ${cheer}`}
              label="Nghe lời chào và lời cổ vũ"
              size="md"
              className="dsv-speak-btn shrink-0 shadow-md"
            />
          </div>
        </div>

        {/* Bố cục 2 cột kiểu Duolingo trên máy tính — vừa vặn màn hình, không bị tràn thanh cuộn ngang */}
        <div className="grid w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          
          {/* CỘT CHÍNH: Con đường học tập Duolingo (The Winding Snake Path) */}
          <div className="flex min-w-0 flex-col gap-6">
            
            {/* CON ĐƯỜNG UỐN LƯỢN (Đặt trong khung nền mịn màng, dịu mắt) */}
            <div className="relative flex flex-col items-center py-8 px-4 sm:px-6 rounded-3xl bg-white/80 backdrop-blur-xs border border-emerald-100 shadow-xs">
              
              <div className="flex flex-col items-center w-full py-2">
                {pathNodes.map((node, index) => {
                  const xOffset = X_OFFSETS[index % X_OFFSETS.length] ?? 0;
                  const isActive = node.type === 'active';
                  const isDone = node.type === 'done';
                  const isLesson = node.type === 'lesson';
                  const isChest = node.type === 'chest';

                  const nodeClass = isActive
                    ? 'duo-node-active'
                    : isDone
                      ? 'duo-node-done'
                      : isLesson
                        ? 'duo-node-lesson'
                        : isChest
                          ? cn('duo-node-chest', allDone && 'animate-bounce')
                          : 'duo-node-locked';

                  return (
                    <div key={node.id} className="flex flex-col items-center relative my-1">
                      {/* Nút trạm tròn 3D Duolingo */}
                      <div
                        style={{ transform: `translateX(${xOffset}px)` }}
                        className="transition-transform duration-300 relative flex flex-col items-center"
                      >
                        {/* Bong bóng dẫn đường chỉ trạm hiện tại hoặc chúc mừng Rương kho báu */}
                        {node.bubble && (
                          <div
                            className={cn(
                              'duo-start-bubble mb-2',
                              isChest && 'border-amber-400 border-b-amber-500 text-amber-700 shadow-amber-200'
                            )}
                          >
                            {node.bubble}
                          </div>
                        )}

                        {node.to ? (
                          <ButtonLink
                            to={node.to}
                            className={cn(nodeClass, 'no-underline')}
                            title={node.title}
                          >
                            <span className="text-2xl sm:text-3xl select-none" aria-hidden="true">
                              {node.icon}
                            </span>
                          </ButtonLink>
                        ) : (
                          <div className={nodeClass} title={node.title}>
                            <span className="text-2xl sm:text-3xl select-none" aria-hidden="true">
                              {node.icon}
                            </span>
                          </div>
                        )}

                        {/* Tên trạm hiển thị tự nhiên, không bị gò bó trong hộp hẹp */}
                        <p className="mt-2 text-xs font-black text-emerald-950 text-center max-w-[150px] leading-tight">
                          {node.title}
                        </p>
                      </div>

                      {/* Các phiến đá nối giữa các trạm — uốn lượn liên tục theo hướng ziczac với màu xanh ngọc dịu mát */}
                      {index < pathNodes.length - 1 && (() => {
                        const nextX = X_OFFSETS[(index + 1) % X_OFFSETS.length] ?? 0;
                        const p1 = Math.round(xOffset + (nextX - xOffset) * 0.28);
                        const p2 = Math.round(xOffset + (nextX - xOffset) * 0.55);
                        const p3 = Math.round(xOffset + (nextX - xOffset) * 0.82);

                        return (
                          <div
                            className="flex flex-col items-center gap-2 my-2.5 relative w-full pointer-events-none select-none"
                            aria-hidden="true"
                          >
                            <span
                              style={{ transform: `translateX(${p1}px)` }}
                              className="block w-4 h-3 rounded-full bg-emerald-100 border border-emerald-300 shadow-[0_2px_0_#A7F3D0]"
                            />
                            <span
                              style={{ transform: `translateX(${p2}px)` }}
                              className="block w-4 h-3 rounded-full bg-emerald-100 border border-emerald-300 shadow-[0_2px_0_#A7F3D0]"
                            />
                            <span
                              style={{ transform: `translateX(${p3}px)` }}
                              className="block w-4 h-3 rounded-full bg-emerald-100 border border-emerald-300 shadow-[0_2px_0_#A7F3D0]"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>


            </div>

            {/* Chi tiết danh sách bài chơi, bài học & gợi ý (theo hợp đồng kiểm thử) */}
            <div className="mt-4">
              {/* Tiêu đề ngăn cách: phân biệt con đường tổng quan phía trên và danh sách chi tiết hành động bên dưới */}
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className="flex-1 h-px bg-emerald-200" />
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800/80 flex items-center gap-1.5">
                  <span aria-hidden="true">📋</span>
                  Chi tiết bài học
                </span>
                <div className="flex-1 h-px bg-emerald-200" />
              </div>
              <LearningSections level={1} />
            </div>

          </div>

          {/* CỘT PHỤ: Thanh chỉ số Duolingo, Hộ chiếu học sinh & Nhiệm vụ mở mã (Sidebar) */}
          <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20">
            
            {/* Thanh trạng thái Duolingo (Streak, Sao, Huy hiệu) */}
            <div className="duo-card p-5">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-950/70 mb-3 text-center">
                THÀNH TÍCH CỦA EM
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  to={pathOf('progress')}
                  className="flex flex-col items-center justify-between h-[96px] p-2 rounded-2xl bg-orange-50 border border-orange-200 border-b-3 border-b-orange-400 transition-all hover:-translate-y-0.5 active:translate-y-0.5 no-underline cursor-pointer group text-center min-w-0"
                  title="Xem số ngày chăm chỉ trên trang tiến độ"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">🔥</span>
                  <span className="text-sm font-black text-orange-600 truncate max-w-full">
                    {home?.streakDays ? `${home.streakDays} ngày` : '0 ngày'}
                  </span>
                  <span className="text-[10px] font-bold text-orange-950/70 uppercase tracking-wide truncate max-w-full whitespace-nowrap">
                    Chăm chỉ
                  </span>
                </Link>
                <Link
                  to={pathOf('progress')}
                  className="flex flex-col items-center justify-between h-[96px] p-2 rounded-2xl bg-amber-50 border border-amber-200 border-b-3 border-b-amber-400 transition-all hover:-translate-y-0.5 active:translate-y-0.5 no-underline cursor-pointer group text-center min-w-0"
                  title="Xem tổng số sao đạt được"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">⭐</span>
                  <span className="text-sm font-black text-amber-700 truncate max-w-full">
                    {home?.totalStars ?? 0} sao
                  </span>
                  <span className="text-[10px] font-bold text-amber-950/70 uppercase tracking-wide truncate max-w-full whitespace-nowrap">
                    Sao thưởng
                  </span>
                </Link>
                <Link
                  to={`${pathOf('progress')}?tab=huy-hieu`}
                  className="flex flex-col items-center justify-between h-[96px] p-2 rounded-2xl bg-purple-50 border border-purple-200 border-b-3 border-b-purple-400 transition-all hover:-translate-y-0.5 active:translate-y-0.5 no-underline cursor-pointer group text-center min-w-0"
                  title="Xem bộ sưu tập huy hiệu của em"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">🏆</span>
                  <span className="text-sm font-black text-purple-700 truncate max-w-full">
                    {home?.recentBadges?.length ?? 0} huy hiệu
                  </span>
                  <span className="text-[10px] font-bold text-purple-950/70 uppercase tracking-wide truncate max-w-full whitespace-nowrap">
                    Huy hiệu
                  </span>
                </Link>
              </div>
            </div>

            {/* Khối nhiệm vụ: Nhập mã bài học */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 p-5 text-white shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-xl shadow-inner">
                  🔑
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                    {myLessons.length === 0 ? 'MỞ KHÓA TRẠM MỚI' : 'BÀI HỌC MỚI TỪ THẦY CÔ?'}
                  </span>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {myLessons.length === 0 ? 'Em đã có mã bài học chưa?' : 'Nhập mã để mở thêm bài nhé!'}
                  </h3>
                </div>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium mb-4">
                {myLessons.length === 0
                  ? 'Nhập mã thầy cô đưa để vào chặng khám phá và nhận sao thưởng nhé!'
                  : 'Khi thầy cô giao bài mới, em nhập mã ở đây để mở thêm trạm học!'}
              </p>
              <ButtonLink
                to={pathOf('enterCode')}
                size="lg"
                className="duo-btn-yellow w-full py-3.5 text-sm font-black shadow-md flex items-center justify-center gap-2"
              >
                <Icon name="key" size={18} />
                Nhập mã bài học
              </ButtonLink>
            </div>

            {/* Thẻ học sinh: Lớp của em (Hộ chiếu thám hiểm) */}
            <section aria-labelledby="lop-cua-em" className="duo-card p-5">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" aria-hidden="true">🎒</span>
                  <h2 id="lop-cua-em" className="type-h3 font-black text-emerald-950">
                    Lớp của em
                  </h2>
                </div>
                <SpeakButton
                  text={`Em học lớp ${classroom.name}. ${classroom.teacherName ? `Thầy cô phụ trách là ${classroom.teacherName}.` : ''}`}
                  label="Nghe thông tin lớp của em"
                  size="sm"
                  className="dsv-speak-btn"
                />
              </div>

              <dl className="mt-4 flex flex-col gap-2.5">
                {facts.map((fact) => {
                  const isClass = fact.label === 'Lớp';
                  const isTeacher = fact.label === 'Giáo viên';
                  const icon = isClass ? '📚' : isTeacher ? '👩‍🏫' : '🏫';
                  const cardClass = isClass
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                    : isTeacher
                      ? 'border-rose-200 bg-rose-50/70 text-rose-950'
                      : 'border-amber-200 bg-amber-50/70 text-amber-950';

                  return (
                    <div key={fact.label} className={cn('rounded-2xl border-2 p-3 flex items-center justify-between', cardClass)}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{icon}</span>
                        <dt className="text-xs font-black uppercase tracking-wider opacity-80">{fact.label}</dt>
                      </div>
                      <dd className="text-sm font-black line-clamp-1">{fact.value}</dd>
                    </div>
                  );
                })}
              </dl>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                <p className="text-xs font-black text-emerald-950 mb-1.5">Mã học sinh của em:</p>
                <span className="inline-block rounded-full border-2 border-emerald-500 bg-white px-4 py-1 font-mono font-black text-base text-emerald-800 shadow-xs">
                  {studentCodeOf(user)}
                </span>
                <div className="mt-2.5 pt-2 border-t border-emerald-200/60">
                  <Link
                    to={pathOf('profile')}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <Icon name="user" size={15} />
                    Xem Hộ chiếu Di sản của em ▶
                  </Link>
                </div>
              </div>
            </section>

          </div>

        </div>
      </div>
    </section>
  );
}
