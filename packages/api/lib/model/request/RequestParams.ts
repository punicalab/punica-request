import { ContentType, Query } from '..';

/**
 * Represents the parameters for an HTTP request.
 * This type is generic over `T`, where `T` represents the type of data to be sent with the request.
 */
export type RequestParams<T> = {
  /**
   * The path for the request.
   * Example: '/api/v1/resource'
   */
  path: string;

  /**
   * Optional query parameters for the request.
   * Can be an instance of URLSearchParams or a custom Query type.
   * Example: '?search=term&sort=asc'
   */
  query?: URLSearchParams | Query;

  /**
   * Data to be sent with the request (for methods like POST and PUT).
   * The type of data is specified by the generic parameter `T`.
   * Example: { name: 'John', age: 30 }
   */
  data?: T;

  /**
   * Optional request initialization options.
   * These options follow the RequestInit interface used by the Fetch API.
   * Example: { method: 'POST', headers: { 'Content-Type': 'application/json' } }
   */
  init?: RequestInit;

  /**
   * The content type of the request data.
   * Indicates the media type of the resource being sent or requested.
   * Example: 'application/json'
   */
  contentType?: ContentType;

  /**
   * The full request URL, if specified.
   * If not provided, the URL is constructed using the hostname and path.
   * Example: 'https://example.com/api/v1/resource'
   */
  requestURL?: string;

  /**
   * Indicates whether caching should be enabled for the request.
   * If caching is enabled, an expireTime (in milliseconds) can be specified.
   * Example: { expireTime: 60000 } // Cache expires in 60 seconds
   */
  cache?: { expireTime?: number };

  /**
   * Additional properties that can be used as needed.
   * This allows for extending the parameters with custom properties.
   */
  [key: string]: any;
};
