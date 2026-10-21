import type { LanguageCode } from '../api/discovery';
import type { ManeuverModifier, RouteStep } from './route';

// Câu hướng dẫn từng bước theo ngôn ngữ giao diện (năm ngôn ngữ của phần công khai), dựng từ loại thao tác, hướng rẽ, tên đường và số lối ra
// mà OSRM trả về. Viết tay một bảng gọn thay vì dùng thư viện osrm-text-instructions: thư viện đó gộp 31 ngôn ngữ vào gói (CommonJS, không tách được)
// và bản tiếng Việt dùng phương ngữ ("Quẹo trái"), còn ở đây chỉ cần năm ngôn ngữ với câu chữ thống nhất ("Rẽ trái vào Phố Tràng Thi").
// Tên đường là chữ thuần do OSM trả, nơi hiển thị phải đặt bằng textContent, không chèn HTML.

type Direction = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';

/** Hướng la bàn từ góc phương vị (0 là bắc, tăng theo chiều kim đồng hồ). */
function directionOf(bearing: number): Direction {
  const degree = ((bearing % 360) + 360) % 360;
  if (degree <= 22.5 || degree > 337.5) return 'north';
  if (degree <= 67.5) return 'northeast';
  if (degree <= 112.5) return 'east';
  if (degree <= 157.5) return 'southeast';
  if (degree <= 202.5) return 'south';
  if (degree <= 247.5) return 'southwest';
  if (degree <= 292.5) return 'west';
  return 'northwest';
}

type Side = 'left' | 'right' | 'straight';

/** Bên nào của hướng rẽ (rẽ gắt hay chếch đều về một bên). */
function sideOf(modifier: ManeuverModifier | null): Side {
  if (!modifier || modifier === 'straight' || modifier === 'uturn') return 'straight';
  return modifier.endsWith('left') ? 'left' : 'right';
}

/** Tên đường kèm số hiệu nếu có: "Đường Đỗ Mười (QL.1)", chỉ số hiệu khi đường không tên. */
export function wayNameOf(step: Pick<RouteStep, 'name' | 'ref'>): string {
  if (step.name && step.ref && step.name !== step.ref) return `${step.name} (${step.ref})`;
  return step.name || step.ref || '';
}

interface Phrases {
  direction: Record<Direction, string>;
  /** Câu rẽ không kèm đường, theo hướng rẽ. */
  turn: Record<ManeuverModifier, string>;
  turnDefault: string;
  /** Ghép hành động với đường đi vào: "Rẽ trái" + "Phố X" → "Rẽ trái vào Phố X". */
  onto: (action: string, way: string) => string;
  depart: (direction: string, way: string) => string;
  arrive: Record<Side, string>;
  continueOn: (way: string) => string;
  continueStraight: string;
  newName: (way: string) => string;
  merge: Record<Side, string>;
  onRamp: string;
  offRamp: Record<Side, string>;
  fork: Record<Side, string>;
  endOfRoad: Record<Side, string>;
  roundabout: (exit: number | null) => string;
  roundaboutTurn: Record<Side, string>;
  exitRoundabout: string;
}

const EN_ORDINAL = new Intl.PluralRules('en-US', { type: 'ordinal' });
const EN_SUFFIX: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
const ordinalEn = (n: number) => `${n}${EN_SUFFIX[EN_ORDINAL.select(n)] ?? 'th'}`;

const PHRASES: Record<LanguageCode, Phrases> = {
  vi: {
    direction: { north: 'bắc', northeast: 'đông bắc', east: 'đông', southeast: 'đông nam', south: 'nam', southwest: 'tây nam', west: 'tây', northwest: 'tây bắc' },
    turn: {
      left: 'Rẽ trái',
      right: 'Rẽ phải',
      'sharp left': 'Rẽ gắt sang trái',
      'sharp right': 'Rẽ gắt sang phải',
      'slight left': 'Rẽ chếch sang trái',
      'slight right': 'Rẽ chếch sang phải',
      straight: 'Đi thẳng',
      uturn: 'Quay đầu',
    },
    turnDefault: 'Rẽ',
    onto: (action, way) => `${action} vào ${way}`,
    depart: (direction, way) => (way ? `Xuất phát về hướng ${direction} trên ${way}` : `Xuất phát về hướng ${direction}`),
    arrive: { left: 'Đến nơi, di sản ở bên trái', right: 'Đến nơi, di sản ở bên phải', straight: 'Đến nơi, di sản ở phía trước' },
    continueOn: (way) => `Đi tiếp trên ${way}`,
    continueStraight: 'Đi thẳng',
    newName: (way) => `Đi tiếp vào ${way}`,
    merge: { left: 'Nhập làn bên trái', right: 'Nhập làn bên phải', straight: 'Nhập làn' },
    onRamp: 'Đi vào đường dẫn',
    offRamp: { left: 'Ra ở lối rẽ bên trái', right: 'Ra ở lối rẽ bên phải', straight: 'Ra ở lối rẽ' },
    fork: { left: 'Giữ bên trái ở chỗ rẽ nhánh', right: 'Giữ bên phải ở chỗ rẽ nhánh', straight: 'Đi tiếp ở chỗ rẽ nhánh' },
    endOfRoad: { left: 'Cuối đường, rẽ trái', right: 'Cuối đường, rẽ phải', straight: 'Cuối đường, đi tiếp' },
    roundabout: (exit) => (exit ? `Vào vòng xuyến, ra ở lối thứ ${exit === 1 ? 'nhất' : exit}` : 'Vào vòng xuyến'),
    roundaboutTurn: { left: 'Tại vòng xuyến, rẽ trái', right: 'Tại vòng xuyến, rẽ phải', straight: 'Tại vòng xuyến, đi thẳng' },
    exitRoundabout: 'Ra khỏi vòng xuyến',
  },
  en: {
    direction: { north: 'north', northeast: 'northeast', east: 'east', southeast: 'southeast', south: 'south', southwest: 'southwest', west: 'west', northwest: 'northwest' },
    turn: {
      left: 'Turn left',
      right: 'Turn right',
      'sharp left': 'Make a sharp left',
      'sharp right': 'Make a sharp right',
      'slight left': 'Bear left',
      'slight right': 'Bear right',
      straight: 'Continue straight',
      uturn: 'Make a U-turn',
    },
    turnDefault: 'Turn',
    onto: (action, way) => `${action} onto ${way}`,
    depart: (direction, way) => (way ? `Head ${direction} on ${way}` : `Head ${direction}`),
    arrive: { left: 'Arrive at the heritage site, on your left', right: 'Arrive at the heritage site, on your right', straight: 'Arrive at the heritage site, straight ahead' },
    continueOn: (way) => `Continue on ${way}`,
    continueStraight: 'Continue straight',
    newName: (way) => `Continue onto ${way}`,
    merge: { left: 'Merge left', right: 'Merge right', straight: 'Merge' },
    onRamp: 'Take the ramp',
    offRamp: { left: 'Take the exit on the left', right: 'Take the exit on the right', straight: 'Take the exit' },
    fork: { left: 'Keep left at the fork', right: 'Keep right at the fork', straight: 'Continue at the fork' },
    endOfRoad: { left: 'At the end of the road, turn left', right: 'At the end of the road, turn right', straight: 'At the end of the road, continue' },
    roundabout: (exit) => (exit ? `At the roundabout, take the ${ordinalEn(exit)} exit` : 'Enter the roundabout'),
    roundaboutTurn: { left: 'At the roundabout, turn left', right: 'At the roundabout, turn right', straight: 'At the roundabout, continue straight' },
    exitRoundabout: 'Exit the roundabout',
  },
  ko: {
    direction: { north: '북', northeast: '북동', east: '동', southeast: '남동', south: '남', southwest: '남서', west: '서', northwest: '북서' },
    turn: {
      left: '좌회전',
      right: '우회전',
      'sharp left': '왼쪽으로 급회전',
      'sharp right': '오른쪽으로 급회전',
      'slight left': '왼쪽으로 약간 꺾기',
      'slight right': '오른쪽으로 약간 꺾기',
      straight: '직진',
      uturn: '유턴',
    },
    turnDefault: '회전',
    onto: (action, way) => `${action} 후 ${way} 진입`,
    depart: (direction, way) => (way ? `${way}에서 ${direction}쪽으로 출발` : `${direction}쪽으로 출발`),
    arrive: { left: '목적지 도착, 유적지는 왼쪽에 있습니다', right: '목적지 도착, 유적지는 오른쪽에 있습니다', straight: '목적지 도착, 유적지는 정면에 있습니다' },
    continueOn: (way) => `${way} 따라 계속 직진`,
    continueStraight: '계속 직진',
    newName: (way) => `직진 후 ${way} 진입`,
    merge: { left: '왼쪽 차로로 합류', right: '오른쪽 차로로 합류', straight: '합류' },
    onRamp: '진입로로 진입',
    offRamp: { left: '왼쪽 출구로 진출', right: '오른쪽 출구로 진출', straight: '출구로 진출' },
    fork: { left: '갈림길에서 왼쪽 유지', right: '갈림길에서 오른쪽 유지', straight: '갈림길에서 계속 직진' },
    endOfRoad: { left: '도로 끝에서 좌회전', right: '도로 끝에서 우회전', straight: '도로 끝에서 계속 진행' },
    roundabout: (exit) => (exit ? `회전교차로에서 ${exit}번째 출구로 진출` : '회전교차로 진입'),
    roundaboutTurn: { left: '회전교차로에서 좌회전', right: '회전교차로에서 우회전', straight: '회전교차로에서 직진' },
    exitRoundabout: '회전교차로에서 진출',
  },
  'zh-Hans': {
    direction: { north: '北', northeast: '东北', east: '东', southeast: '东南', south: '南', southwest: '西南', west: '西', northwest: '西北' },
    turn: {
      left: '左转',
      right: '右转',
      'sharp left': '向左急转',
      'sharp right': '向右急转',
      'slight left': '稍向左转',
      'slight right': '稍向右转',
      straight: '直行',
      uturn: '掉头',
    },
    turnDefault: '转弯',
    onto: (action, way) => `${action}，进入${way}`,
    depart: (direction, way) => (way ? `沿${way}向${direction}出发` : `向${direction}出发`),
    arrive: { left: '到达目的地，遗产地在左侧', right: '到达目的地，遗产地在右侧', straight: '到达目的地，遗产地在正前方' },
    continueOn: (way) => `沿${way}继续直行`,
    continueStraight: '继续直行',
    newName: (way) => `继续直行，进入${way}`,
    merge: { left: '向左并线', right: '向右并线', straight: '并线' },
    onRamp: '驶入匝道',
    offRamp: { left: '从左侧出口驶出', right: '从右侧出口驶出', straight: '从出口驶出' },
    fork: { left: '在岔路口靠左行驶', right: '在岔路口靠右行驶', straight: '在岔路口继续直行' },
    endOfRoad: { left: '到道路尽头后左转', right: '到道路尽头后右转', straight: '到道路尽头后继续行驶' },
    roundabout: (exit) => (exit ? `进入环岛，从第${exit}个出口驶出` : '进入环岛'),
    roundaboutTurn: { left: '在环岛左转', right: '在环岛右转', straight: '在环岛直行' },
    exitRoundabout: '驶出环岛',
  },
  ja: {
    direction: { north: '北', northeast: '北東', east: '東', southeast: '南東', south: '南', southwest: '南西', west: '西', northwest: '北西' },
    turn: {
      left: '左折',
      right: '右折',
      'sharp left': '大きく左折',
      'sharp right': '大きく右折',
      'slight left': '斜め左へ進む',
      'slight right': '斜め右へ進む',
      straight: '直進',
      uturn: 'Uターン',
    },
    turnDefault: '曲がる',
    onto: (action, way) => `${action}（${way}）`,
    depart: (direction, way) => (way ? `${way}を${direction}方向へ出発` : `${direction}方向へ出発`),
    arrive: { left: '目的地に到着、遺産は左側です', right: '目的地に到着、遺産は右側です', straight: '目的地に到着、遺産は正面です' },
    continueOn: (way) => `${way}を直進`,
    continueStraight: '直進',
    newName: (way) => `そのまま${way}に入る`,
    merge: { left: '左側に合流', right: '右側に合流', straight: '合流' },
    onRamp: 'ランプに入る',
    offRamp: { left: '左側の出口で降りる', right: '右側の出口で降りる', straight: '出口で降りる' },
    fork: { left: '分岐で左側を進む', right: '分岐で右側を進む', straight: '分岐をそのまま進む' },
    endOfRoad: { left: '突き当たりを左折', right: '突き当たりを右折', straight: '突き当たりをそのまま進む' },
    roundabout: (exit) => (exit ? `ラウンドアバウトに入り、${exit}番目の出口で出る` : 'ラウンドアバウトに入る'),
    roundaboutTurn: { left: 'ラウンドアバウトで左折', right: 'ラウンドアバウトで右折', straight: 'ラウンドアバウトを直進' },
    exitRoundabout: 'ラウンドアバウトを出る',
  },
};

/** Câu hướng dẫn cho một bước, bằng ngôn ngữ đã chọn. Tiếng Nhật và Hàn ghi hành động rồi tên đường trong ngoặc hoặc sau "후", tiếng khác ghép thành một câu. */
export function instructionText(step: RouteStep, language: LanguageCode): string {
  const p = PHRASES[language];
  const way = wayNameOf(step);
  const side = sideOf(step.modifier);
  const turn = step.modifier ? p.turn[step.modifier] : p.turnDefault;
  const withWay = (action: string) => (way ? p.onto(action, way) : action);

  switch (step.type) {
    case 'depart':
      return p.depart(p.direction[directionOf(step.bearingAfter ?? 0)], way);
    case 'arrive':
      return p.arrive[side];
    case 'continue':
    case 'notification':
    case 'use lane':
      if (!step.modifier || step.modifier === 'straight') return way ? p.continueOn(way) : p.continueStraight;
      return withWay(turn);
    case 'new name':
      if (!step.modifier || step.modifier === 'straight') return way ? p.newName(way) : p.continueStraight;
      return withWay(turn);
    case 'merge':
      return withWay(p.merge[side]);
    case 'on ramp':
      return withWay(p.onRamp);
    case 'off ramp':
      return withWay(p.offRamp[side]);
    case 'fork':
      return withWay(p.fork[side]);
    case 'end of road':
      return withWay(p.endOfRoad[side]);
    case 'roundabout':
    case 'rotary':
      return withWay(p.roundabout(step.exit));
    case 'roundabout turn':
      return withWay(p.roundaboutTurn[side]);
    case 'exit roundabout':
    case 'exit rotary':
      return withWay(p.exitRoundabout);
    default:
      return withWay(turn);
  }
}

/** Hình minh họa của một bước: mũi tên xoay theo hướng rẽ, hoặc ký hiệu xuất phát, đến nơi, vòng xuyến. */
export type StepGlyph = { kind: 'arrow'; rotate: number } | { kind: 'depart' } | { kind: 'arrive' } | { kind: 'roundabout' };

const ROTATION: Record<ManeuverModifier, number> = {
  straight: 0,
  'slight right': 45,
  right: 90,
  'sharp right': 135,
  uturn: 180,
  'sharp left': -135,
  left: -90,
  'slight left': -45,
};

export function stepGlyph(step: Pick<RouteStep, 'type' | 'modifier'>): StepGlyph {
  if (step.type === 'depart') return { kind: 'depart' };
  if (step.type === 'arrive') return { kind: 'arrive' };
  if (step.type === 'roundabout' || step.type === 'rotary' || step.type === 'roundabout turn') return { kind: 'roundabout' };
  return { kind: 'arrow', rotate: step.modifier ? ROTATION[step.modifier] : 0 };
}
