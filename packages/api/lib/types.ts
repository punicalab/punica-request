/** The methods a request is sent with. */
export type HttpMethod =
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * How the body of a response is read. Without one it is read by its
 * `Content-Type`: JSON is parsed, text is text, anything else is a blob.
 * `stream` leaves the body unread, in `data`.
 */
export type ResponseType =
  'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream';

/** One value of a query. `null` and `undefined` are left out. */
export type QueryValue = string | number | boolean | Date | null | undefined;

/** The query of a request. An array repeats its name: `tags=a&tags=b`. */
export type Query =
  { [name: string]: QueryValue | ReadonlyArray<QueryValue> } | URLSearchParams;

/**
 * Headers, as `Headers`, pairs or an object. In an object, `null` and
 * `undefined` remove a header the client would have sent.
 */
export type HeadersInput =
  | Headers
  | ReadonlyArray<readonly [string, string]>
  | { [name: string]: string | null | undefined };

/** What a request takes from `RequestInit` besides what the client sets itself. */
export type RequestInitOptions = Omit<
  RequestInit,
  'method' | 'headers' | 'body' | 'signal'
>;

/**
 * The options of one request. An interface, so that a middleware can add its
 * own by declaration merging:
 *
 * ```ts
 * declare module '@punica/request' {
 *   interface RequestOptions {
 *     cache?: { ttl?: number };
 *   }
 * }
 * ```
 */
export interface RequestOptions {
  /** Added to the address. `null` and `undefined` are left out. */
  query?: Query;
  /** A body that is sent as JSON, with its `Content-Type`. */
  json?: unknown;
  /** A body that is sent as it is: text, `FormData`, a `Blob`, … */
  body?: BodyInit | null;
  /** Added to the headers of the client. */
  headers?: HeadersInput;
  /** How the body of the response is read; by its `Content-Type` if not given. */
  responseType?: ResponseType;
  /** Cancels the request when it is aborted. */
  signal?: AbortSignal | null;
  /** Milliseconds the whole request may take. `0` for no limit. */
  timeout?: number;
  /** `false` to get a response outside 2xx back instead of an `HttpError`. */
  throwHttpErrors?: boolean;
  /** Passed to the adapter: `credentials`, `mode`, `redirect`, … */
  init?: RequestInitOptions;
}

/**
 * One request on its way. Middlewares read it and change it; the adapter
 * sends what it holds.
 */
export interface RequestContext {
  readonly method: HttpMethod;
  /** The options the request was made with, those of middlewares included. */
  readonly options: RequestOptions;
  /**
   * The headers the request itself gave, without those of the client. A
   * middleware that sets a header "unless the request names its own" asks
   * here: `context.requestHeaders.has('Accept-Language')`.
   */
  readonly requestHeaders: Headers;
  /** Aborted when the request is cancelled or timed out. Always there. */
  readonly signal: AbortSignal;
  /** Cancels the request: it rejects with a `RequestError` of reason `abort`. */
  abort(reason?: unknown): void;
  /** Whether a response outside 2xx will reject, for this request. */
  readonly throwHttpErrors: boolean;
  url: URL;
  headers: Headers;
  body?: BodyInit | null;
  responseType?: ResponseType;
  init: RequestInitOptions;
}

/** A response whose body has been read. */
export interface HttpResponse<T = unknown> {
  /** Whether the status is in 200–299. */
  ok: boolean;
  status: number;
  headers: Headers;
  /** The body, read. `undefined` when there is none. */
  data: T;
  /** The response of the adapter. Not there for one a middleware made up. */
  raw?: Response;
}

/** Continues the request and gives its response. May be called again to send it again. */
export type Next = () => Promise<HttpResponse>;

/**
 * A middleware. What it does before `await next()` happens on the way out,
 * what it does after on the way back. It ends the request by returning a
 * response or by throwing.
 */
export type Middleware = (
  context: RequestContext,
  next: Next
) => Promise<HttpResponse>;

/**
 * Sends a request and gives the response as it came: any status, body
 * unread. It rejects only when no response came.
 */
export type Adapter = (context: RequestContext) => Promise<Response>;

/** The configuration of a client. */
export interface ClientConfig {
  /** Sends the requests: `fetchAdapter()`, `httpAdapter()` or your own. */
  adapter: Adapter;
  /**
   * What every path is relative to. They are joined whatever slashes they
   * have: `'https://x/v1'` with `'items'` or `'/items'` is
   * `https://x/v1/items`. A path that leads away from it, to another origin
   * or out of its path (`'../admin'`), is refused. A relative one (`'/api'`)
   * works in a page only; on a server give the whole address.
   */
  baseURL?: string | URL;
  /** Sent with every request. */
  headers?: HeadersInput;
  /** Milliseconds a whole request may take, unless the request says otherwise. */
  timeout?: number;
  /** `false` to get responses outside 2xx back instead of an `HttpError`. */
  throwHttpErrors?: boolean;
  /** Passed to the adapter with every request. */
  init?: RequestInitOptions;
  /** From the outermost to the one next to the adapter. */
  middlewares?: ReadonlyArray<Middleware>;
}

/** A client: requests that share an address, headers and middlewares. */
export interface Client {
  request<T = unknown>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
  get<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
  post<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
  put<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
  patch<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
  delete<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
  head(
    path: string,
    options?: RequestOptions
  ): Promise<HttpResponse<undefined>>;
}

/** One operation of a JSON Patch document (RFC 6902). */
export interface IPatch {
  op: 'test' | 'remove' | 'add' | 'replace' | 'move' | 'copy';
  path: string;
  value?: unknown;
  from?: string;
}
