import { BaseMiddleware } from '../..';

/**
 *
 * @param methodName
 * @param middlewares
 * @returns
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
