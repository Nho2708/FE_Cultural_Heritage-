import type { StudentLesson } from '../api';
import { LevelOneLesson, type LessonPosition } from './LevelOneLesson';
import { LevelThreeLesson } from './LevelThreeLesson';
import { LevelTwoLesson } from './LevelTwoLesson';

/** Chọn bố cục theo cấp của lớp: học sinh và giáo viên không chọn bố cục, cấp quyết định. */
export function LessonView({
  lesson,
  initialPosition,
  onPositionChange,
}: {
  lesson: StudentLesson;
  initialPosition?: LessonPosition;
  onPositionChange?: (position: LessonPosition) => void;
}) {
  switch (lesson.schoolLevel) {
    case 1:
      return <LevelOneLesson key={lesson.id} lesson={lesson} initialPosition={initialPosition} onPositionChange={onPositionChange} />;
    case 2:
      return <LevelTwoLesson key={lesson.id} lesson={lesson} />;
    default:
      return <LevelThreeLesson key={lesson.id} lesson={lesson} />;
  }
}
