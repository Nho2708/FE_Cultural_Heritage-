import type {
  Account,
  ClassRoom,
  ClassStudent,
  ClassStudentList,
  LoginSheet,
  HeritageDetail,
  HeritageEvent,
  HeritageMedia,
  HeritageModel,
  HeritageReference,
  HeritageSummary,
  HeritageTimeline,
  StaffProfile,
  StaffRole,
} from '@dsvhvn/dung-chung/api';
import type { Session } from '@dsvhvn/dung-chung/auth';

export { envelope, mockApi, type FetchCall } from '@dsvhvn/dung-chung/testing';

const NAMES: Record<StaffRole, string> = {
  ADMIN: 'Lê Quản Trị',
  ORG_ADMIN: 'Phạm Thị Hiệu Trưởng',
  TEACHER: 'Trần Văn Bình',
};

const USERNAMES: Record<StaffRole, string> = { ADMIN: 'admin.nho', ORG_ADMIN: 'qt.thcs.a', TEACHER: 'gv.binh' };

const ROLE_NAMES: Record<StaffRole, string> = {
  ADMIN: 'Quản trị hệ thống',
  ORG_ADMIN: 'Quản trị trường',
  TEACHER: 'Giáo viên',
};

export function userOf(role: StaffRole, id = 1): StaffProfile {
  return {
    id,
    username: USERNAMES[role],
    email: `${USERNAMES[role]}@dsvhvn.test`,
    fullName: NAMES[role],
    phone: null,
    avatarUrl: null,
    role,
    roleName: ROLE_NAMES[role],
    status: 'ACTIVE',
    mustChangePassword: false,
    organization: role === 'ADMIN' ? null : { id: 10, name: 'Trường THCS Nguyễn Du' },
    lastLoginAt: '2026-09-26T01:00:00Z',
    createdAt: '2026-09-25T15:04:34.9Z',
  };
}

export function sessionOf(role: StaffRole, overrides: Partial<Session<StaffProfile>> = {}): Session<StaffProfile> {
  return {
    accessToken: `access-${role}`,
    expiresAt: Date.now() + 8 * 60 * 60_000,
    user: userOf(role),
    ...overrides,
  };
}

export function accountOf(id: number, overrides: Partial<Account> = {}): Account {
  return {
    id,
    username: `gv.${id}`,
    email: `gv.${id}@thcs-nguyendu.edu.vn`,
    fullName: `Giáo viên số ${id}`,
    phone: null,
    role: 'TEACHER',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-09-25T15:04:34.9Z',
    ...overrides,
  };
}

export function heritageSummaryOf(id: number, overrides: Partial<HeritageSummary> = {}): HeritageSummary {
  return {
    id,
    name: `Di sản số ${id}`,
    slug: `di-san-so-${id}`,
    thumbnailUrl: null,
    provinceId: 1,
    provinceName: 'Thành phố Huế',
    heritageType: 'TANGIBLE',
    recognitionLevel: 'UNESCO',
    status: 'PUBLISHED',
    timelineCount: 2,
    mediaCount: 3,
    referenceCount: 5,
    createdAt: '2026-09-25T15:04:34.9Z',
    updatedAt: '2026-09-29T01:05:00Z',
    ...overrides,
  };
}

export function heritageMediaOf(id: number, overrides: Partial<HeritageMedia> = {}): HeritageMedia {
  return {
    id,
    heritageId: 1,
    eventId: null,
    mediaType: 'IMAGE',
    url: `https://upload.wikimedia.org/anh-${id}.jpg`,
    caption: `Ảnh số ${id}`,
    credit: 'Tác giả A · CC BY 4.0 · Wikimedia Commons',
    author: 'Tác giả A',
    license: 'CC BY 4.0',
    source: 'Wikimedia Commons',
    sortOrder: id,
    isThumbnail: false,
    ...overrides,
  };
}

export function heritageEventOf(id: number, timelineId: number, overrides: Partial<HeritageEvent> = {}): HeritageEvent {
  return {
    id,
    timelineId,
    name: `Sự kiện số ${id}`,
    description: null,
    startYear: 1800 + id,
    startMonth: null,
    startDay: null,
    endYear: null,
    endMonth: null,
    endDay: null,
    sortOrder: id,
    media: [],
    ...overrides,
  };
}

export function heritageTimelineOf(id: number, overrides: Partial<HeritageTimeline> = {}): HeritageTimeline {
  return {
    id,
    heritageId: 1,
    name: `Giai đoạn số ${id}`,
    description: null,
    startYear: 1800,
    endYear: 1833,
    sortOrder: id,
    events: [],
    ...overrides,
  };
}

export function heritageReferenceOf(id: number, overrides: Partial<HeritageReference> = {}): HeritageReference {
  return {
    id,
    heritageId: 1,
    title: `Tài liệu số ${id}`,
    url: 'https://dsvh.gov.vn/tai-lieu',
    sourceType: 'WEBSITE',
    sourceTypeLabel: 'Website',
    ...overrides,
  };
}

export function heritageModelOf(id: number, overrides: Partial<HeritageModel> = {}): HeritageModel {
  return {
    id,
    heritageId: 1,
    title: 'Cổng Ngọ Môn',
    fileUrl: `/files/models/${'a1b2c3d4e5f60718293a4b5c6d7e8f9'}${id}.glb`,
    fileFormat: 'GLB',
    fileSizeBytes: 4_404_019,
    posterUrl: null,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    author: 'Nguyễn Văn An',
    sourceUrl: 'https://sketchfab.com/3d-models/ngo-mon',
    credit: 'Nguyễn Văn An · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon',
    status: 'DRAFT',
    statusLabel: 'Nháp',
    isVisibleToPublic: false,
    sortOrder: null,
    createdAt: '2026-10-06T15:04:34.9Z',
    updatedAt: '2026-10-06T16:05:00Z',
    ...overrides,
  };
}

export function heritageDetailOf(overrides: Partial<HeritageDetail> = {}): HeritageDetail {
  return {
    id: 1,
    name: 'Quần thể di tích Cố đô Huế',
    slug: 'quan-the-di-tich-co-do-hue',
    shortDescription: 'Hệ thống thành quách, cung điện, đền miếu của triều Nguyễn.',
    content: 'Nội dung tóm lược.',
    heritageType: 'TANGIBLE',
    recognitionLevel: 'UNESCO',
    recognizedYear: 1993,
    province: { id: 1, code: '46', name: 'Thành phố Huế', region: 'Trung' },
    address: 'Phường Phú Xuân',
    latitude: 16.4637,
    longitude: 107.5909,
    placeId: null,
    thumbnailUrl: null,
    status: 'DRAFT',
    createdAt: '2026-09-25T15:04:34.9Z',
    updatedAt: '2026-09-29T01:05:00Z',
    readiness: { isReady: true, missing: [], warnings: [] },
    timelines: [],
    media: [],
    references: [],
    ...overrides,
  };
}

export function classOf(id: number, overrides: Partial<ClassRoom> = {}): ClassRoom {
  return {
    id,
    name: '7A1',
    grade: 7,
    schoolLevel: 2,
    schoolLevelName: 'Cấp 2',
    schoolYear: '2026-2027',
    activeStudentCount: 3,
    maxStudents: 60,
    lessonCount: 0,
    neverLoggedInCount: 1,
    createdAt: '2026-10-06T01:00:00Z',
    ...overrides,
  };
}

export function classStudentOf(id: number, overrides: Partial<ClassStudent> = {}): ClassStudent {
  return {
    id,
    studentCode: `HS8K2QX${id}`,
    fullName: `Học sinh số ${id}`,
    isActive: true,
    lastLoginAt: '2026-10-05T01:00:00Z',
    passwordChanged: true,
    createdAt: '2026-10-04T01:00:00Z',
    ...overrides,
  };
}

/** Phiếu đăng nhập như máy chủ trả sau khi tạo tài khoản hoặc đặt lại mật khẩu. */
export function sheetOf(students: ReadonlyArray<{ id: number; name: string; code: string; password: string }>, className = '7A1'): LoginSheet {
  return {
    className,
    loginUrl: 'http://localhost:5174/dang-nhap',
    appDownloadUrl: null,
    instructions: [
      'Mở trang học tập: http://localhost:5174/dang-nhap',
      'Hoặc cài ứng dụng DSVHVN trên điện thoại, mở ứng dụng và chọn chế độ "Học sinh" (không chọn "Khách tham quan").',
      'Đăng nhập bằng mã học sinh và mật khẩu tạm ghi trên phiếu.',
    ],
    firstLoginReminder: 'Em sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.',
    notice: 'Mật khẩu tạm chỉ hiện một lần. Hãy in hoặc tải phiếu đăng nhập trước khi rời trang; nếu mất phiếu, dùng "Đặt lại mật khẩu".',
    entries: students.map((s) => ({
      studentId: s.id,
      fullName: s.name,
      className,
      studentCode: s.code,
      temporaryPassword: s.password,
    })),
  };
}

export function studentPage(items: ClassStudent[], overrides: Partial<ClassStudentList> = {}): ClassStudentList {
  return {
    items,
    page: 1,
    pageSize: 20,
    totalItems: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    activeCount: items.filter((s) => s.isActive).length,
    maxStudents: 60,
    ...overrides,
  };
}
