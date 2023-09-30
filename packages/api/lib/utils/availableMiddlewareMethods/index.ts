import { BaseMiddleware } from '../..';

/**
 * Filters and returns an array of middlewares that support a specific HTTP method.
 *
 * @param methodName - The HTTP method (e.g., GET, POST, PUT, DELETE).
 * @param middlewares - An array of middlewares to filter.
 * @returns An array of middlewares that support the specified HTTP method.
 */
const availableMiddlewareMethods = (
  methodName: string,
  middlewares: Array<BaseMiddleware>
): Array<BaseMiddleware> => {
  return (middlewares || []).filter((m) => {
    const methods = m.availableMethods();
    const method = methods.find((m) => m == methodName.toUpperCase());

    return method != null;
  });
};

export default availableMiddlewareMethods;
