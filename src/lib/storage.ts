/**
 * Local Storage Adapter compatible with AsyncStorage API semantics
 */

class WebAsyncStorage {
  private memoryFallback: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return this.memoryFallback.get(key) || null;
    } catch {
      return this.memoryFallback.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        this.memoryFallback.set(key, value);
      }
    } catch {
      this.memoryFallback.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      } else {
        this.memoryFallback.delete(key);
      }
    } catch {
      this.memoryFallback.delete(key);
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      } else {
        this.memoryFallback.clear();
      }
    } catch {
      this.memoryFallback.clear();
    }
  }
}

export const AsyncStorage = new WebAsyncStorage();
export default AsyncStorage;
