import { IParams } from '../params';

interface IRequestParams<T> {
  url: string;
  urlParams?: IParams;
  data?: T;
  init?: RequestInit;
}

export default IRequestParams;
