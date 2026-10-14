import { createApiClient, createSchoolInquiryApi } from '@dsvhvn/dung-chung/api';
import { API_BASE_URL } from '../../config/env';

/** Liên hệ của trường (trang Dành cho nhà trường): công khai, không gắn token và không mang mã thiết bị của khách. */
export const schoolInquiryApi = createSchoolInquiryApi(createApiClient({ baseUrl: API_BASE_URL, getAccessToken: () => null }));
