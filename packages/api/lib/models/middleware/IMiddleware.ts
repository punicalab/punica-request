import { ProcessData } from '.';

interface IMiddleware {
  nextMiddleware: IMiddleware;
  next(data: ProcessData): void;
  process(data: ProcessData): void;
}

export default IMiddleware;
