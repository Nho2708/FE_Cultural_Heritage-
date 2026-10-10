import { parseTestDeviceIds } from './testDevices';

describe('danh sách thiết bị thử của AdMob', () => {
  it('không đặt thì rỗng', () => {
    expect(parseTestDeviceIds(undefined)).toEqual([]);
    expect(parseTestDeviceIds('')).toEqual([]);
  });

  it('tách theo dấu phẩy, bỏ khoảng trắng và mục rỗng', () => {
    expect(parseTestDeviceIds(' 4593B5A7CE273BA9DC05A8AF447DD14E , ,ABC123 ')).toEqual(['4593B5A7CE273BA9DC05A8AF447DD14E', 'ABC123']);
  });
});
