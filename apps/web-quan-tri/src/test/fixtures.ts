import type {
  Account,
  HeritageDetail,
  HeritageEvent,
  HeritageMedia,
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
