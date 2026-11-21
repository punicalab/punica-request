import { ContentType } from '@punica/request';
import { IStorage } from '../../model';

/** What session storage can keep: it holds text. */
const KEPT: ContentType[] = ['json', 'text'];

/**
 * Keeps responses in the session storage of the browser: until the tab is
 * closed. Payloads read as `json` or `text` are kept; a blob, an array
 * buffer or form data cannot be written as text and is not cached.
 */
export class StorageSession implements IStorage {
  /**
   * Reads data from session storage.
   * @param requestURL - The key under which the data is stored.
   * @returns A Promise that resolves to the stored data or null if not found.
   */
  public read = async (requestURL: string): Promise<any> => {
    const readedData = sessionStorage.getItem(requestURL);

    if (!readedData) return null;

    try {
      const { contentType, body, expireAt } = JSON.parse(readedData);

      if (expireAt && Date.now() > expireAt) {
        sessionStorage.removeItem(requestURL); // Remove expired data from storage

        return null;
      }

      return KEPT.includes(contentType) ? body : null;
    } catch {
      // Not written by this storage
      return null;
    }
  };

  /**
   * Writes data to session storage.
   * @param requestURL - The key under which the data will be stored.
   * @param contentType - The content type the payload was read as.
   * @param body - The data to be stored.
   * @param expireTime - The time after which the data should expire, in milliseconds.
   * @returns A Promise that resolves to whether the data was stored.
   */
  public write = async (
    requestURL: string,
    contentType: ContentType,
    body: unknown,
    expireTime?: number
  ): Promise<boolean> => {
    if (!KEPT.includes(contentType)) return false;

    sessionStorage.setItem(
      requestURL,
      JSON.stringify({
        contentType,
        body,
        expireAt: expireTime ? Date.now() + expireTime : null
      })
    );

    return true;
  };
}
