import type { HttpResponse, RequestContext } from './types';

// Registered symbols: an error made by one copy of the package (its CommonJS
// build, say) is recognised by another (its ES module build)
const HTTP_ERROR = Symbol.for('@punica/request:HttpError');
const REQUEST_ERROR = Symbol.for('@punica/request:RequestError');

/** A property that is there but stays out of `JSON.stringify` and of logs. */
const hidden = (target: object, name: PropertyKey, value: unknown) =>
  Object.defineProperty(target, name, {
    value,
    enumerable: false,
    writable: false,
    configurable: true
  });

/** The request as it may be written to a log: no query, it may hold secrets. */
const describe = (context: RequestContext) =>
  `${context.method} ${context.url.origin}${context.url.pathname}`;

/**
 * A response came, and its status is outside 2xx.
 */
export class HttpError<T = unknown> extends Error {
  readonly status: number;
  /** The response, its body read: `error.response.data`. */
  declare readonly response: HttpResponse<T>;
  /** The request that was answered. */
  declare readonly context: RequestContext;

  constructor(response: HttpResponse<T>, context: RequestContext) {
    super(
      `Request failed with status ${response.status}: ${describe(context)}`
    );

    this.name = 'HttpError';
    this.status = response.status;
    // Headers hold tokens and cookies: an error that is logged or serialised
    // does not take them along
    hidden(this, 'response', response);
    hidden(this, 'context', context);
  }
}

hidden(HttpError.prototype, HTTP_ERROR, true);

/** Why no response came. */
export type RequestErrorReason = 'network' | 'timeout' | 'abort' | 'parse';

const messages: Record<RequestErrorReason, string> = {
  network: 'Request could not be sent',
  timeout: 'Request timed out',
  abort: 'Request was aborted',
  parse: 'Response could not be read'
};

/**
 * No usable response came: the request could not be sent (`network`), took
 * too long (`timeout`), was cancelled (`abort`), or its response could not
 * be read as what it claims to be (`parse`).
 */
export class RequestError extends Error {
  readonly reason: RequestErrorReason;
  /** What was thrown underneath, if anything. */
  declare readonly cause?: unknown;
  /** The request. */
  declare readonly context: RequestContext;

  constructor(
    reason: RequestErrorReason,
    context: RequestContext,
    cause?: unknown
  ) {
    super(`${messages[reason]}: ${describe(context)}`);

    this.name = 'RequestError';
    this.reason = reason;
    hidden(this, 'context', context);

    if (cause !== undefined) hidden(this, 'cause', cause);
  }
}

hidden(RequestError.prototype, REQUEST_ERROR, true);

const branded = (error: unknown, brand: symbol) =>
  typeof error === 'object' &&
  error !== null &&
  (error as Record<symbol, unknown>)[brand] === true;

/** Whether `error` is an `HttpError`, of any copy of the package. */
export const isHttpError = <T = unknown>(
  error: unknown
): error is HttpError<T> => branded(error, HTTP_ERROR);

/** Whether `error` is a `RequestError`, of any copy of the package. */
export const isRequestError = (error: unknown): error is RequestError =>
  branded(error, REQUEST_ERROR);
