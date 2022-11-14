import { ContentType } from '../content';
import { IParams } from '../params';

interface IRequestParams<T> {
  url: string;
  urlParams?: IParams;
  data?: T;
  init?: RequestInit;
  contentType?: ContentType;
}

export default IRequestParams;
