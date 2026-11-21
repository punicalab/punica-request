/** A response as a cache keeps it. */
export interface CacheEntry {
  status: number;
  /** The headers, as pairs. */
  headers: Array<[string, string]>;
  /** The body, as it was read. */
  data: unknown;
  /** The moment (`Date.now()`) after which the entry is not used. Never, if not given. */
  expiresAt?: number;
}

/**
 * Where `cache` keeps responses. Implement it to keep them somewhere of your
 * own; the middleware looks after the expiry.
 */
export interface IStorage {
  /** The entry of a key, or nothing. */
  get(key: string): Promise<CacheEntry | null | undefined>;
  /** Keeps an entry, in place of the one the key had. */
  set(key: string, entry: CacheEntry): Promise<unknown>;
  /** Removes the entry of a key. Called for entries that have expired. */
  delete?(key: string): Promise<unknown>;
}
