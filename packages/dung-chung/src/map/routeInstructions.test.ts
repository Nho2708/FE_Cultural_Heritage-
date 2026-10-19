import { describe, expect, it } from 'vitest';
import type { RouteStep } from './route';
import { instructionText, stepGlyph, wayNameOf } from './routeInstructions';

// Câu hướng dẫn từng bước: đúng loại thao tác và hướng rẽ, kèm tên đường và số hiệu, đủ năm ngôn ngữ và không để lộ dấu giữ chỗ.

const step = (overrides: Partial<RouteStep>): RouteStep => ({
  type: 'turn',
  modifier: 'left',
  name: '',
  ref: null,
  distanceMeters: 100,
  durationSeconds: 10,
  exit: null,
  bearingAfter: null,
  ...overrides,
});

describe('tên đường', () => {
  it('ghép tên và số hiệu, chỉ số hiệu khi không tên', () => {
    expect(wayNameOf({ name: 'Đường Đỗ Mười', ref: 'QL.1' })).toBe('Đường Đỗ Mười (QL.1)');
    expect(wayNameOf({ name: '', ref: 'CT.01' })).toBe('CT.01');
    expect(wayNameOf({ name: 'QL.1', ref: 'QL.1' })).toBe('QL.1');
    expect(wayNameOf({ name: '', ref: null })).toBe('');
  });
});

describe('câu tiếng Việt', () => {
  it('xuất phát theo hướng la bàn, rẽ vào đường, vòng xuyến, cuối đường, đến nơi', () => {
    expect(instructionText(step({ type: 'depart', modifier: 'left', name: 'Phố Lê Thái Tổ', bearingAfter: 191 }), 'vi')).toBe('Xuất phát về hướng nam trên Phố Lê Thái Tổ');
    expect(instructionText(step({ type: 'depart', bearingAfter: 350 }), 'vi')).toBe('Xuất phát về hướng bắc');
    expect(instructionText(step({ type: 'turn', modifier: 'sharp right', name: 'Phố Tràng Thi' }), 'vi')).toBe('Rẽ gắt sang phải vào Phố Tràng Thi');
    expect(instructionText(step({ type: 'turn', modifier: 'left' }), 'vi')).toBe('Rẽ trái');
    expect(instructionText(step({ type: 'new name', modifier: 'straight', name: 'Đường Điện Biên Phủ' }), 'vi')).toBe('Đi tiếp vào Đường Điện Biên Phủ');
    expect(instructionText(step({ type: 'continue', modifier: 'straight', name: 'Đường Giải Phóng' }), 'vi')).toBe('Đi tiếp trên Đường Giải Phóng');
    expect(instructionText(step({ type: 'continue', modifier: 'straight' }), 'vi')).toBe('Đi thẳng');
    expect(instructionText(step({ type: 'rotary', modifier: 'right', exit: 2, name: 'Đường Láng' }), 'vi')).toBe('Vào vòng xuyến, ra ở lối thứ 2 vào Đường Láng');
    expect(instructionText(step({ type: 'roundabout', modifier: 'right', exit: 1 }), 'vi')).toBe('Vào vòng xuyến, ra ở lối thứ nhất');
    expect(instructionText(step({ type: 'exit roundabout', modifier: 'slight right', name: 'Đường Kim Mã' }), 'vi')).toBe('Ra khỏi vòng xuyến vào Đường Kim Mã');
    expect(instructionText(step({ type: 'end of road', modifier: 'right', name: 'Đường Đại Cồ Việt' }), 'vi')).toBe('Cuối đường, rẽ phải vào Đường Đại Cồ Việt');
    expect(instructionText(step({ type: 'fork', modifier: 'slight left' }), 'vi')).toBe('Giữ bên trái ở chỗ rẽ nhánh');
    expect(instructionText(step({ type: 'off ramp', modifier: 'slight right', name: 'Đường cao tốc Pháp Vân - Cầu Giẽ', ref: 'CT.01' }), 'vi')).toBe('Ra ở lối rẽ bên phải vào Đường cao tốc Pháp Vân - Cầu Giẽ (CT.01)');
    expect(instructionText(step({ type: 'merge', modifier: 'slight left', name: 'QL.1', ref: 'QL.1' }), 'vi')).toBe('Nhập làn bên trái vào QL.1');
    expect(instructionText(step({ type: 'on ramp', modifier: 'straight' }), 'vi')).toBe('Đi vào đường dẫn');
    expect(instructionText(step({ type: 'roundabout turn', modifier: 'left' }), 'vi')).toBe('Tại vòng xuyến, rẽ trái');
    expect(instructionText(step({ type: 'turn', modifier: 'uturn' }), 'vi')).toBe('Quay đầu');
    expect(instructionText(step({ type: 'arrive', modifier: 'left' }), 'vi')).toBe('Đến nơi, di sản ở bên trái');
    expect(instructionText(step({ type: 'arrive', modifier: 'straight' }), 'vi')).toBe('Đến nơi, di sản ở phía trước');
  });
});

describe('bốn ngôn ngữ còn lại', () => {
  it('tiếng Anh', () => {
    expect(instructionText(step({ type: 'depart', name: 'Le Thai To Street', bearingAfter: 95 }), 'en')).toBe('Head east on Le Thai To Street');
    expect(instructionText(step({ type: 'turn', modifier: 'left', name: 'Trang Thi Street' }), 'en')).toBe('Turn left onto Trang Thi Street');
    expect(instructionText(step({ type: 'roundabout', modifier: 'right', exit: 3 }), 'en')).toBe('At the roundabout, take the 3rd exit');
    expect(instructionText(step({ type: 'roundabout', modifier: 'right', exit: 2, name: 'Ring Road' }), 'en')).toBe('At the roundabout, take the 2nd exit onto Ring Road');
    expect(instructionText(step({ type: 'arrive', modifier: 'right' }), 'en')).toBe('Arrive at the heritage site, on your right');
  });

  it('tiếng Hàn, Trung, Nhật ghép tên đường đúng chỗ', () => {
    expect(instructionText(step({ type: 'turn', modifier: 'left', name: 'Phố Tràng Thi' }), 'ko')).toBe('좌회전 후 Phố Tràng Thi 진입');
    expect(instructionText(step({ type: 'depart', bearingAfter: 0, name: 'Phố Lê Thái Tổ' }), 'ko')).toBe('Phố Lê Thái Tổ에서 북쪽으로 출발');
    expect(instructionText(step({ type: 'turn', modifier: 'right', name: 'Phố Tràng Thi' }), 'zh-Hans')).toBe('右转，进入Phố Tràng Thi');
    expect(instructionText(step({ type: 'roundabout', modifier: 'right', exit: 2 }), 'zh-Hans')).toBe('进入环岛，从第2个出口驶出');
    expect(instructionText(step({ type: 'turn', modifier: 'slight left', name: 'Phố Tràng Thi' }), 'ja')).toBe('斜め左へ進む（Phố Tràng Thi）');
    expect(instructionText(step({ type: 'roundabout', modifier: 'right', exit: 2, name: 'Phố X' }), 'ja')).toBe('ラウンドアバウトに入り、2番目の出口で出る（Phố X）');
    expect(instructionText(step({ type: 'arrive', modifier: 'left' }), 'ja')).toBe('目的地に到着、遺産は左側です');
  });

  it('mọi loại thao tác và hướng rẽ đều có câu ở cả năm ngôn ngữ, không còn dấu giữ chỗ', () => {
    const types: RouteStep['type'][] = ['depart', 'arrive', 'turn', 'new name', 'continue', 'merge', 'on ramp', 'off ramp', 'fork', 'end of road', 'roundabout', 'rotary', 'roundabout turn', 'exit roundabout', 'exit rotary', 'notification', 'use lane'];
    const modifiers: Array<RouteStep['modifier']> = [null, 'left', 'right', 'sharp left', 'sharp right', 'slight left', 'slight right', 'straight', 'uturn'];
    for (const language of ['vi', 'en', 'ko', 'zh-Hans', 'ja'] as const) {
      for (const type of types) {
        for (const modifier of modifiers) {
          for (const name of ['', 'Đường X']) {
            const text = instructionText(step({ type, modifier, name, exit: type.includes('round') || type === 'rotary' ? 2 : null, bearingAfter: 45 }), language);
            expect(text.trim()).not.toBe('');
            expect(text).not.toMatch(/[{}]|undefined|null/);
            // Câu "đến nơi" không nhắc tên đường; mọi câu khác phải mang tên đường khi có.
            expect(!name || type === 'arrive' || text.includes('Đường X')).toBe(true);
          }
        }
      }
    }
  });
});

describe('hình minh họa bước', () => {
  it('mũi tên xoay theo hướng rẽ; xuất phát, đến nơi, vòng xuyến có ký hiệu riêng', () => {
    expect(stepGlyph({ type: 'turn', modifier: 'right' })).toEqual({ kind: 'arrow', rotate: 90 });
    expect(stepGlyph({ type: 'fork', modifier: 'slight left' })).toEqual({ kind: 'arrow', rotate: -45 });
    expect(stepGlyph({ type: 'turn', modifier: 'uturn' })).toEqual({ kind: 'arrow', rotate: 180 });
    expect(stepGlyph({ type: 'new name', modifier: null })).toEqual({ kind: 'arrow', rotate: 0 });
    expect(stepGlyph({ type: 'depart', modifier: 'left' })).toEqual({ kind: 'depart' });
    expect(stepGlyph({ type: 'arrive', modifier: 'left' })).toEqual({ kind: 'arrive' });
    expect(stepGlyph({ type: 'rotary', modifier: 'right' })).toEqual({ kind: 'roundabout' });
  });
});
