import { DATABASE_NAME, INDEX, OBJECT_STORE } from '../constants';

class Singleton {
  private static instance: Singleton;
  #database: IDBDatabase | null = null;

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
   * Asynchronously opens or creates the IndexedDB database and returns it.
   * If the database is already opened, it returns the existing instance.
   * @returns A Promise that resolves with the IDBDatabase instance.
   */
  public getDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.#database) {
        resolve(this.#database);
        return;
      }

      const request = indexedDB.open(DATABASE_NAME, 1);

      request.onerror = () => {
        reject();
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result;
        this.#database = db;
        resolve(this.#database);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(OBJECT_STORE)) {
          const store = db.createObjectStore(OBJECT_STORE, {
            autoIncrement: true
          });

          store.createIndex(INDEX, INDEX, {
            unique: true
          });

          this.#database = db;
          resolve(this.#database);
        }
      };
    });
  }
}

export const OperationDatabase = Singleton.getInstance();
