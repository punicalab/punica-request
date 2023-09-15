import { IConfig } from '../config';
import { RequestParams } from '../request';

type ProcessData = {
  config: IConfig;
  params: RequestParams<any>;
  response?: Response;
  body?: any;
  resolve: (data?: unknown) => void;
  reject: (reason?: unknown) => void;
};

export default ProcessData;
