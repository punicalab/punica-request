import type { Middleware, RequestContext } from './types';

/**
 * Limits a middleware to some requests; the others pass it by.
 *
 * ```ts
 * when((context) => context.method === 'GET', cancel())
 * ```
 * @param predicate - Whether the middleware takes part in a request
 * @param middleware - The middleware
 */
export const when =
  (
    predicate: (context: RequestContext) => boolean,
    middleware: Middleware
  ): Middleware =>
  (context, next) =>
    predicate(context) ? middleware(context, next) : next();
