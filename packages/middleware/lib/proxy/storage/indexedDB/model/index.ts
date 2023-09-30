import { ContentType } from '@punica/request';

/**
 * Represents the connection information for an IndexedDB database.
 */
export type IndexedDBConection = {
  // The IndexedDB database instance.
  db: any;
  // The name of the IndexedDB database.
  databaseName: string;
  // The name of the index used in the database.
  indexName: string;
};

/**
 * Represents a record in the IndexedDB database.
 */
export type Record = {
  // The URL associated with the record.
  requestURL: string;
  // The content type of the record.
  contentType: ContentType;
  // The content/body of the record.
  body: any;
};
