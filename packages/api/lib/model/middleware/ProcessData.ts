import { IRequestParams } from '../request';

type ProcessData = {
  resolve: any;
  reject: any;
  params: IRequestParams<any>;
  response?: Response;
  body?: any;
};

export default ProcessData;
