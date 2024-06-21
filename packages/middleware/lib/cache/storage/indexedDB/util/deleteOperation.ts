import { OBJECT_STORE } from '../constants';

/**
 * Deletes a contact from the IndexedDB database.
 * @param db - The IndexedDB database instance.
 * @param id - The ID of the contact to be deleted.
 * @returns A Promise that resolves to true if the deletion is successful, or rejects if there's an error.
 */
export const deleteOperation = (
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
