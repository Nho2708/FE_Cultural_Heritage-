import { createQuestionsApi } from '@dsvhvn/dung-chung/api';
import { apiClient } from './client';

// Endpoint của luồng Ngân hàng câu hỏi (khu giáo viên). Câu đã duyệt dùng chung mọi trường; câu chờ duyệt, bị loại chỉ người tạo thấy.

export const questionsApi = createQuestionsApi(apiClient);
