import { ContentType } from '@punica/request';
import { IStorage } from '../../model';

/**
 * StorageSession is an implementation of the IStorage interface for session storage.
 * It allows reading and writing data to the session storage.
 */
export class StorageSession implements IStorage {
  /**
   * Reads data from session storage based on the provided request URL.
   * @param requestURL - The URL for which data is to be read from session storage.
   * @returns A Promise that resolves to the stored data or null if not found.
   */
  public read = (requestURL: string): Promise<any> => {
    return new Promise((resolve) => {
      const readedData = sessionStorage.getItem(requestURL);

      if (!readedData) {
        resolve(null);
        return;
      }

      const storedData = JSON.parse(readedData);
      const { contentType, body, expireAt } = storedData;

      // Check if data has expired
      if (expireAt && Date.now() > expireAt) {
        sessionStorage.removeItem(requestURL); // Remove expired data from storage
        resolve(null);
      } else {
        switch (contentType as ContentType) {
          case 'json':
            resolve(body);
            break;
        }
      }
    });
  };

  /**
   * Writes data to session storage for the provided request URL.
   * @param requestURL - The URL to be associated with the stored data.
   * @param contentType - The content type of the data.
   * @param body - The data to be stored.
   * @returns A Promise that resolves to true after the data is successfully stored.
   */
  public write = (
    requestURL: string,
    contentType: ContentType,
    body: unknown,
    expireTime: number
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const expirationTime = Date.now() + expireTime;

      sessionStorage.setItem(
        requestURL,
        JSON.stringify({ contentType, body, expireAt: expirationTime })
      );
      resolve(true);
    });
  };
}
