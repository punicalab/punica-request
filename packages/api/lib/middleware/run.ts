import { IMiddleware, ProcessData } from '..';

/**
 * Hands a request to a middleware. What the middleware throws, at once or
 * later when its `process` is asynchronous, ends the request: without this
 * it would never settle.
 */
export const run = (middleware: IMiddleware, data: ProcessData): void => {
  try {
    const result: unknown = middleware.process(data);

    if (result instanceof Promise) result.catch(data.reject);
  } catch (error) {
    data.reject(error);
  }
};
