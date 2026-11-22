import type { CacheEntry, IStorage } from './storage';

/** The options of `StorageSession`. */
export interface StorageSessionOptions {
  /** Goes before every key. `punica-request:` by default. */
  prefix?: string;
}

/** Whether session storage, which holds text, can keep a body. */
const isText = (data: unknown): boolean => {
  if (data === null || typeof data !== 'object') {
    return typeof data !== 'function' && typeof data !== 'symbol';
  }

  const prototype = Object.getPrototypeOf(data);

  // What JSON was parsed into; not a blob, a buffer or form data
  return (
    Array.isArray(data) || prototype === Object.prototype || prototype === null
  );
};

/**
 * Keeps responses in the session storage of the browser: until the tab is
 * closed. It keeps JSON and text; a blob, an array buffer or form data
 * cannot be written as text and is not cached.
 */
export class StorageSession implements IStorage {
  #prefix: string;

  constructor(options: StorageSessionOptions = {}) {
    this.#prefix = options.prefix ?? 'punica-request:';
  }

  public get = async (key: string): Promise<CacheEntry | null> => {
    const written = sessionStorage.getItem(this.#prefix + key);

    if (!written) return null;

    try {
      const entry = JSON.parse(written);

      return entry &&
        typeof entry.status === 'number' &&
        Array.isArray(entry.headers)
        ? entry
        : null;
    } catch {
      // Not written by this storage
      return null;
    }
  };

  public set = async (key: string, entry: CacheEntry): Promise<boolean> => {
    if (!isText(entry.data)) return false;

    sessionStorage.setItem(this.#prefix + key, JSON.stringify(entry));

    return true;
  };

  public delete = async (key: string): Promise<void> => {
    sessionStorage.removeItem(this.#prefix + key);
  };
}
