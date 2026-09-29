import type { AuditLogQuery, OrganizationListQuery, TeacherListQuery } from './endpoints';

// Khóa bộ nhớ đệm của React Query. Khóa cha (ví dụ ['org']) dùng để làm mới cả nhóm sau khi ghi.

export const queryKeys = {
  /** Trường của quản trị trường: thông tin, gói, bộ đếm giáo viên (Trường và gói, Giáo viên của trường, thanh báo gói). */
  org: ['org'] as const,
  teachers: (query: TeacherListQuery) => ['org', 'teachers', query] as const,

  organizations: ['admin', 'organizations'] as const,
  organizationList: (query: OrganizationListQuery) => ['admin', 'organizations', 'list', query] as const,
  organization: (id: number) => ['admin', 'organizations', 'detail', id] as const,

  auditLogs: (query: AuditLogQuery) => ['admin', 'audit-logs', query] as const,
};
