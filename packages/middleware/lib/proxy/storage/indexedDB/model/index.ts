import { ContentType } from '@punica/request';

export type IndexedDBConection = {
  db: any;
  databaseName: string;
  indexName: string;
};

export type Record = {
  requestURL: string;
  contentType: ContentType;
  body: any;
};
