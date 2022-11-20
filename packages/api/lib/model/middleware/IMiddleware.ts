import { ProcessData } from '.';

interface IMiddleware {
  nextMiddleware: IMiddleware;
  next(data: ProcessData): void;
  process(data: ProcessData): void;
  availableMethods(): Array<string>;
}

export default IMiddleware;
