import { ContentType } from '@punica/request';

interface IStorage {
  read: (requestURL: string) => Promise<any>;
  write: (
    requestURL: string,
    contentType: ContentType,
    body: unknown
  ) => Promise<any>;
}

export { IStorage };
