// Thông báo cho học sinh: thầy cô gửi cho cả lớp về một bài học hoặc bài kiểm tra (giao bài về nhà), em xem ở nút Thông báo.

export type StudentNotificationKind = 'LESSON' | 'QUIZ';

export interface StudentNotification {
  id: number;
  kind: StudentNotificationKind;
  title: string;
  body: string;
  lessonId: number;
  /** Mã bài học để mở bài ngay, không phải gõ mã. */
  lessonCode: string | null;
  /** Có giá trị với thông báo về bài kiểm tra. */
  quizId: number | null;
  createdAt: string | null;
  isRead: boolean;
}

export interface StudentNotificationPage {
  items: StudentNotification[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  unreadCount: number;
}

/** Kết quả thầy cô gửi thông báo: số em nhận được và câu báo. */
export interface NotifyClassResult {
  sentTo: number;
  message: string;
}
