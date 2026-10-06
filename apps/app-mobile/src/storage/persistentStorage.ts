import type { KeyValueStore } from './keyValue';

// Cầu nối giữa nơi lưu bất đồng bộ của điện thoại (SecureStore) và `SessionStore` của gói dùng chung vốn cần một `Storage` đồng bộ:
// nạp sẵn giá trị lúc khởi động, đọc từ bộ nhớ, ghi thì ghi vào bộ nhớ rồi lưu xuống máy ở phía sau.

export class PersistentStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private readonly values = new Map<string, string>();

  private constructor(private readonly backing: KeyValueStore) {}

  /** Nạp các khóa cần dùng từ nơi lưu trên máy rồi trả bộ nhớ đã sẵn sàng. */
  static async load(backing: KeyValueStore, keys: readonly string[]): Promise<PersistentStorage> {
    const storage = new PersistentStorage(backing);
    for (const key of keys) {
      const value = await backing.get(key);
      if (value !== null) storage.values.set(key, value);
    }
    return storage;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
    void this.backing.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
    void this.backing.remove(key);
  }
}
