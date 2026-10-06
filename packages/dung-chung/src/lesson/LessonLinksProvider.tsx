import type { ReactNode } from 'react';
import { LessonLinksContext, type LessonLinks } from './lessonLinks';

export function LessonLinksProvider({ links, children }: { links: LessonLinks; children: ReactNode }) {
  return <LessonLinksContext.Provider value={links}>{children}</LessonLinksContext.Provider>;
}
