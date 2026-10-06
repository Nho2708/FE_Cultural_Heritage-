import { createAdminQuestionsApi, createOverviewApi } from '@dsvhvn/dung-chung/api';
import { apiClient } from './client';

// Endpoint của luồng Quản trị và tổng quan: Tổng quan trường (quản trị trường), Tổng quan hệ thống và biểu đồ theo thời gian,
// Kiểm duyệt ngân hàng câu hỏi (quản trị hệ thống). Vai trò khác nhận 403 từ máy chủ.

export const overviewApi = createOverviewApi(apiClient);
export const adminQuestionsApi = createAdminQuestionsApi(apiClient);
