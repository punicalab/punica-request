import { ContentType, Query } from '..';

type RequestParams<T> = {
  path: string;
  query?: Query;
  data?: T;
  init?: RequestInit;
  contentType?: ContentType;
  requestURL?: string;
  cache?: boolean;
  [key: string]: any;
};

export default RequestParams;
