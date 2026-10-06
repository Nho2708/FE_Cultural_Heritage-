import { createClassRecommendationsApi, createStatisticsApi } from '@dsvhvn/dung-chung/api';
import { apiClient } from './client';

// Endpoint của luồng Thống kê và gợi ý (khu giáo viên): kết quả bài kiểm tra, tiến độ và mức thành thạo của lớp, hồ sơ học tập của
// một học sinh, gợi ý ôn tập cho lớp. Giáo viên chỉ xem lớp và bài của mình; lớp hay bài của người khác trả 404.

export const statisticsApi = createStatisticsApi(apiClient);
export const classRecommendationsApi = createClassRecommendationsApi(apiClient);
