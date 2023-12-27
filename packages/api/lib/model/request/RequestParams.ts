import { ContentType, Query } from '..';

// Represents the parameters for an HTTP request.
type RequestParams<T> = {
  // The path for the request.
  path: string;

  // Optional query parameters for the request.
  query?: URLSearchParams | Query;

  // Data to be sent with the request (for methods like POST and PUT).
  data?: T;

  // Optional request initialization options.
  init?: RequestInit;

  // The content type of the request data.
  contentType?: ContentType;

  // The full request URL, if specified.
  requestURL?: string;

  // Indicates whether caching should be enabled for the request.
  cache?: boolean;

  // Additional properties that can be used as needed.
  [key: string]: any;
};

export default RequestParams;
