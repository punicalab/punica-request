import type { CacheEntry, IStorage } from './storage';

/** The options of `StorageIndexedDB`. */
export interface StorageIndexedDBOptions {
  /** The name of the database. `PUNICA_REQUEST_CACHE` by default. */
  databaseName?: string;
}

const STORE = 'RESPONSES';

/** Databases that are open or being opened, by name: one each. */
const databases = new Map<string, Promise<IDBDatabase>>();

const open = (name: string, version?: number): Promise<IDBDatabase> => {
  const known = databases.get(name);

  if (known && version === undefined) return known;

  const opening: Promise<IDBDatabase> = new Promise<IDBDatabase>(
    (resolve, reject) => {
      // Whatever version it has: one that another script upgraded opens too
      const request = indexedDB.open(name, version);
      const forget = () => {
        if (databases.get(name) === opening) databases.delete(name);
      };

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      // Fires once the store exists, also the first time
      request.onsuccess = () => {
        // There, but without the store: made by something else. One
        // version further, where the store is created
        if (!request.result.objectStoreNames.contains(STORE)) {
          const next = request.result.version + 1;

          request.result.close();
          forget();
          open(name, next).then(resolve, reject);

          return;
        }

        // Another tab wants to change the database: let it
        request.result.onversionchange = () => {
          request.result.close();
          forget();
        };
        // Closed by the browser, when the data of the site is cleared
        request.result.onclose = forget;
        resolve(request.result);
      };
      request.onerror = () => {
        forget();
        reject(request.error);
      };
    }
  );

  databases.set(name, opening);

  return opening;
};

/** Runs one request in a transaction of its own and gives its result. */
const run = async <T>(
  name: string,
  mode: IDBTransactionMode,
  request: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const opened = open(name);
  let transaction: IDBTransaction;

  try {
    transaction = (await opened).transaction(STORE, mode);
  } catch (error) {
    // The connection was closed under us: once more, with a new one
    if ((error as { name?: string } | null)?.name !== 'InvalidStateError') {
      throw error;
    }

    if (databases.get(name) === opened) databases.delete(name);

    transaction = (await open(name)).transaction(STORE, mode);
  }

  return new Promise<T>((resolve, reject) => {
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
