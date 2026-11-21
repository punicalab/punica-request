import type { HttpResponse, RequestContext } from '@punica/request';
import type { Middleware } from '@punica/request';

/** What `onError` calls for a response outside 2xx. */
export type ErrorHandler = (
  response: HttpResponse,
  context: RequestContext
) => void | Promise<void>;

/** A handler per status, and one for the statuses that have none. */
export interface ErrorHandlers {
  [status: number]: ErrorHandler | undefined;
  default?: ErrorHandler;
}

/**
 * Does something about responses outside 2xx in one place: go to the login
 * page on a 401, show a message on a 500. The request still rejects with
 * its `HttpError` afterwards; a handler reacts, it does not answer.
 *
 * A request made with `throwHttpErrors: false` deals with its response
 * itself and is left alone.
 *
 * It goes first in the list, so that it sees the response the caller will
 * get, after a token was refreshed for example.
 *
 * ```ts
 * onError({
 *   401: () => router.push('/login'),
 *   default: (response) => toast(`Error ${response.status}`)
 * })
 * ```
 * @param handlers - What to do, by status
 */
export const onError = (handlers: ErrorHandlers): Middleware => {
  if (!handlers || typeof handlers !== 'object') {
    throw new TypeError(
      'onError needs its handlers: onError({ 401: (response, context) => { … } }).'
    );
  }

  return async function onError(context, next) {
    const response = await next();

    // A request that was cancelled meanwhile has rejected already
    if (!response.ok && context.throwHttpErrors && !context.signal.aborted) {
      await (handlers[response.status] ?? handlers.default)?.(
        response,
        context
      );
    }

    return response;
  };
};
