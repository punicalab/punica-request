import { ProcessData } from '.';
import { RequestMethods } from '..';

interface IMiddleware {
  nextMiddleware: IMiddleware;
  firstMiddleware: IMiddleware;
  next(data: ProcessData): void;
  process(processData: ProcessData): void;
  availableMethods(): Array<keyof RequestMethods>;
}

export default IMiddleware;
