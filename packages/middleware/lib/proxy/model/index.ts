import { ContentType } from '@punica/request';

/**
 * Interface representing a storage system.
 */
interface IStorage {
  /**
   * Reads data from the storage based on the provided request URL.
   * @param requestURL - The URL used as a key to retrieve data.
   * @returns A promise that resolves with the retrieved data, or null if not found.
   */
  read: (requestURL: string) => Promise<any>;

  /**
   * Writes data to the storage, associating it with the provided request URL and content type.
   * @param requestURL - The URL used as a key to store the data.
   * @param contentType - The content type of the data.
   * @param body - The data to be stored.
   * @returns A promise that resolves when the data has been successfully stored.
   */
  write: (
    requestURL: string,
    contentType: ContentType,
    body: unknown
  ) => Promise<any>;
}

export { IStorage };
