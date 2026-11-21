import type { CacheEntry, IStorage } from './storage';

/** The options of `StorageIndexedDB`. */
export interface StorageIndexedDBOptions {
  /** The name of the database. `PUNICA_REQUEST_CACHE` by default. */
  databaseName?: string;
}

const STORE = 'RESPONSES';

/** Databases that are open or being opened, by name: one each. */
const databases = new Map<string, Promise<IDBDatabase>>();

const open = (name: string): Promise<IDBDatabase> => {
  let opening = databases.get(name);

  if (!opening) {
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      // Fires once the store exists, also the first time
      request.onsuccess = () => {
        // Another tab wants to change the database: let it
        request.result.onversionchange = () => {
          request.result.close();
          databases.delete(name);
        };
        resolve(request.result);
      };
      request.onerror = () => {
        databases.delete(name);
        reject(request.error);
      };
      request.onblocked = () => {
        databases.delete(name);
        reject(new Error(`The database ${name} is blocked by another tab.`));
      };
    });

    databases.set(name, opening);
  }

  return opening;
};

/** Runs one request in a transaction of its own and gives its result. */
const run = async <T>(
  name: string,
  mode: IDBTransactionMode,
  request: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await open(name);

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const pending = request(transaction.objectStore(STORE));

    transaction.oncomplete = () => resolve(pending.result);
    transaction.onerror = () => reject(transaction.error ?? pending.error);
    transaction.onabort = () => reject(transaction.error ?? pending.error);
  });
};

/**
 * Keeps responses in IndexedDB: across tabs and visits. It keeps whatever
 * IndexedDB can copy, which includes blobs and array buffers.
 */
export class StorageIndexedDB implements IStorage {
  #name: string;

  constructor(options: StorageIndexedDBOptions = {}) {
    // Not the database of 2.x, whose records were of another shape
    this.#name = options.databaseName ?? 'PUNICA_REQUEST_CACHE';
  }

  public get = (key: string): Promise<CacheEntry | undefined> =>
    run<CacheEntry | undefined>(this.#name, 'readonly', (store) =>
      store.get(key)
    );

  public set = async (key: string, entry: CacheEntry): Promise<boolean> => {
    await run(this.#name, 'readwrite', (store) => store.put(entry, key));

    return true;
  };

  public delete = async (key: string): Promise<void> => {
    await run(this.#name, 'readwrite', (store) => store.delete(key));
  };
}
