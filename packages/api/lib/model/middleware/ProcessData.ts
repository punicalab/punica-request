import { IConfig } from '../config';
import { IRequestParams } from '../request';

type ProcessData = {
  config: IConfig;
  resolve: any;
  reject: any;
  params: IRequestParams<any>;
  response?: Response;
  body?: any;
};

export default ProcessData;
