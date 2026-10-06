import { createQuizzesApi } from '@dsvhvn/dung-chung/api';
import { apiClient } from './client';

// Endpoint của luồng Bài kiểm tra (khu giáo viên). Giáo viên chỉ thấy và sửa bài do mình tạo cho bài học của mình; bài của người khác
// trả 404. Lớp làm bài là lớp của bài học nên không có tham số lớp và không có mã riêng: học sinh vào bằng mã bài học.

export const quizzesApi = createQuizzesApi(apiClient);
