import { OBJECT_STORE } from '../constants';

/**
 *
 * @param db
 * @param id
 * @returns
 */
export const deleteContact = (
  db: IDBDatabase,
  id: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const txn = db.transaction(OBJECT_STORE, 'readwrite');
    const store = txn.objectStore(OBJECT_STORE);
    const query = store.delete(id);

    query.onerror = function () {
      reject();
    };

    txn.oncomplete = function () {
      resolve(true);
    };
  });
};
