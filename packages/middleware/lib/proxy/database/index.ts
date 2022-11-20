import { DATABASE_NAME, INDEX, OBJECT_STORE } from "../constants";

class Signletion {
  private static instance: Signletion;
  private _database: IDBDatabase;

  /**
   *
   */
  private constructor() {}

  /**
   *
   * @returns
   */
  public static getInstance(): Signletion {
    if (!Signletion.instance) {
      Signletion.instance = new Signletion();
    }

    return Signletion.instance;
  }

  /**
   *
   * @returns
   */
  public getDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);

      /**
       *
       */
      request.onerror = () => {
        reject();
      };

      /**
       *
       * @param event
       */
      request.onsuccess = (event: any) => {
        const db = event.target.result;

        this._database = db;

        resolve(this._database);
      };

      /**
       *
       * @param event
       */
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(OBJECT_STORE)) {
          // create the Operation object store
          // with auto-increment id
          const store = db.createObjectStore(OBJECT_STORE, {
            autoIncrement: true,
          });

          // create an index on the INDEX property
          store.createIndex(INDEX, INDEX, {
            unique: true,
          });

          this._database = db;

          resolve(this._database);
        }
      };
    });
  }
}

export const OperationDatabase = Signletion.getInstance();
