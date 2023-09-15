import { ContentType } from '@punica/request';
import { IStorage } from '../../model';

export class StorageSession implements IStorage {
  /**
   *
   * @param requestURL
   */
  public read = (requestURL: string): any => {
    return new Promise((resolve) => {
      const readedData = sessionStorage.getItem(requestURL);

      if (!readedData) {
        resolve(null);

        return;
      }

      const storedData = JSON.parse(readedData);
      const { contentType, body } = storedData;

      switch (contentType as ContentType) {
        case 'json':
          resolve(body);
          break;
      }
    });
  };

  /**
   *
   * @param requestURL
   * @param contentType
   * @param data
   */
  public write = (
    requestURL: string,
    contentType: ContentType,
    body: unknown
  ) => {
    return new Promise((resolve) => {
      sessionStorage.setItem(requestURL, JSON.stringify({ contentType, body }));

      resolve(true);
    });
  };
}
