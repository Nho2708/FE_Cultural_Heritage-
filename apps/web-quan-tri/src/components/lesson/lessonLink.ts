import { LEARNING_WEB_URL } from '../../config/env';

/** Đường dẫn đưa cho học sinh: web học tập mở bài học theo mã (học sinh vẫn phải đăng nhập). */
export const lessonLink = (code: string) => `${LEARNING_WEB_URL}/bai-hoc/${code}`;
