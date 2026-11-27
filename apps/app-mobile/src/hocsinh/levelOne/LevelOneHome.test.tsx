import { LevelOneHome, givenName, type LevelOneHomeProps } from './LevelOneHome';
import { PATH_TOP, STATION_GAP, pathHeight, roadSegments, stationPoints } from './pathLayout';
import { classLesson, renderLevelOne, studentHome } from './testKit';

// Trang học cấp 1: thẻ bài thầy cô giao (hoặc "Em đang chơi dở", hoặc đã học hết), con đường các bài của lớp với trạng thái đã xong / hiện tại /
// còn lại và trạm Album di sản ở cuối, lối phụ nhập mã, không emoji.

// Máy bật giảm chuyển động: vòng sáng của trạm hiện tại đứng yên (không chạy vòng lặp hoạt hình trong test).
jest.mock('../../motion/useReducedMotion', () => ({ useReducedMotion: () => true }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [{ identifier: 'v', language: 'vi-VN' }]) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EMOJI = /\p{Extended_Pictographic}/u;

function props(overrides: Partial<LevelOneHomeProps> = {}): LevelOneHomeProps {
  return {
    home: studentHome({
      classLessons: [classLesson(1, { title: 'Bánh chưng ngày Tết', completed: true, stars: 3 }), classLesson(2, { title: 'Chùa Một Cột' }), classLesson(3, { title: 'Đèn ông sao' })],
    }),
    schoolName: 'Trường Tiểu học Kim Đồng',
    refreshing: false,
    onRefresh: jest.fn(),
    onOpenLesson: jest.fn(),
    onPlayOn: jest.fn(),
    onAlbum: jest.fn(),
    onEnterCode: jest.fn(),
    ...overrides,
  };
}

describe('hình học con đường', () => {
  it('trạm so le trái phải, trạm cuối (album) ở giữa', () => {
    const points = stationPoints(4, 300);
    expect(points.map((p) => p.x)).toEqual([90, 210, 90, 150]);
    expect(points.map((p) => p.y)).toEqual([PATH_TOP, PATH_TOP + STATION_GAP, PATH_TOP + 2 * STATION_GAP, PATH_TOP + 3 * STATION_GAP]);
    expect(pathHeight(4)).toBeGreaterThan(points[3]!.y);
  });

  it('đường nối liền các trạm bằng các đoạn ngắn theo đường cong', () => {
    const points = stationPoints(3, 300);
    const segments = roadSegments(points, 8);
    expect(segments).toHaveLength(16);
    const total = segments.reduce((sum, s) => sum + s.length, 0);
    const straight = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y) + Math.hypot(points[2]!.x - points[1]!.x, points[2]!.y - points[1]!.y);
    expect(total).toBeGreaterThanOrEqual(straight - 0.001);
    // Đoạn đầu rời trạm đầu theo chiều dọc.
    expect(Math.abs(segments[0]!.angle - Math.PI / 2)).toBeLessThan(0.3);
  });
});

describe('trang học cấp 1', () => {
  it('chào em bằng tên gọi, hai ô số và thẻ bài thầy cô giao', async () => {
    const p = props();
    const view = await renderLevelOne(<LevelOneHome {...p} />);
    expect(givenName('Nguyễn Văn Minh')).toBe('Minh');
    expect(view.has('Chào Minh!')).toBe(true);
    expect(view.has('Hôm nay mình học bài “Chùa Một Cột” nhé!')).toBe(true);
    expect(view.has('12 sao')).toBe(true);
    expect(view.has('5 ngày đã học')).toBe(true);
    expect(view.has('Bài Cô Lan giao')).toBe(true);
    await view.press('Học bài này');
    expect(p.onOpenLesson).toHaveBeenCalledWith('BH2');
    expect(view.texts().filter((text) => EMOJI.test(text))).toEqual([]);
  });

  it('con đường có trạm đã xong, trạm hiện tại "Học tiếp", trạm còn lại vẫn mở và trạm album ở cuối', async () => {
    const p = props();
    const view = await renderLevelOne(<LevelOneHome {...p} />);
    await view.layout('Con đường học của em', 328);
    expect(view.has('Học tiếp')).toBe(true);
    await view.press('Bánh chưng ngày Tết, em đã học xong, 3 trên 3 sao');
    expect(p.onOpenLesson).toHaveBeenLastCalledWith('BH1');
    await view.press('Chùa Một Cột, bài em học tiếp');
    expect(p.onOpenLesson).toHaveBeenLastCalledWith('BH2');
    await view.press('Đèn ông sao');
    expect(p.onOpenLesson).toHaveBeenLastCalledWith('BH3');
    await view.press('Album di sản · 2 thẻ');
    expect(p.onAlbum).toHaveBeenCalled();
    await view.press('Nhập mã');
    expect(p.onEnterCode).toHaveBeenCalled();
    expect(view.has('Trường Tiểu học Kim Đồng')).toBe(true);
    expect(view.has('HS8K2QX7')).toBe(true);
  });

  it('có lượt đang dở thì thẻ thành "Em đang chơi dở" và nút Chơi tiếp', async () => {
    const p = props({
      home: studentHome({
        classLessons: [classLesson(2, { title: 'Chùa Một Cột' })],
        inProgress: [{ attemptId: 9, quizId: 44, quizName: 'Đố vui Chùa Một Cột', lessonId: 2, lessonTitle: 'Chùa Một Cột', startedAt: '2026-10-25T08:00:00Z', deadline: null, remainingSeconds: null }],
      }),
    });
    const view = await renderLevelOne(<LevelOneHome {...p} />);
    expect(view.has('Em đang chơi dở')).toBe(true);
    await view.press('Chơi tiếp');
    expect(p.onPlayOn).toHaveBeenCalledWith(44);
  });

  it('học hết các bài thì mời xem album', async () => {
    const p = props({ home: studentHome({ classLessons: [classLesson(1, { completed: true, stars: 2 })] }) });
    const view = await renderLevelOne(<LevelOneHome {...p} />);
    expect(view.has('Em học hết các bài rồi!')).toBe(true);
    await view.press('Xem album');
    expect(p.onAlbum).toHaveBeenCalled();
  });
});
