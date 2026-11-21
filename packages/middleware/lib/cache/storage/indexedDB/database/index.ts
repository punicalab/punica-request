import { DATABASE_NAME, INDEX, OBJECT_STORE } from '../constants';

class Singleton {
  private static instance: Singleton;
  #opening: Promise<IDBDatabase> | null = null;

  // Private constructor prevents direct instantiation.
  private constructor() {}

  /**
   * Static method to get the singleton instance.
   * If an instance doesn't exist, it creates one.
   * @returns The Singleton instance.
   */
  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }

    return Singleton.instance;
  }

  /**
   * The database, opened once: everyone who asks while it is being opened
   * gets the same one.
   */
  public getDatabase(): Promise<IDBDatabase> {
    this.#opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);

      request.onerror = () => {
        this.#opening = null;
        reject(request.error);
      };

      // Fires once the store below exists, also the first time
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(OBJECT_STORE)) {
          const store = db.createObjectStore(OBJECT_STORE, {
            autoIncrement: true
          });

          store.createIndex(INDEX, INDEX, {
            unique: true
          });
        }
      };
    });

    return this.#opening;
  }
}

export const OperationDatabase = Singleton.getInstance();
