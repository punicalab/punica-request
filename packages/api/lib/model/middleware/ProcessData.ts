import { IConfig } from '../config';
import { RequestParams } from '../request';

// Type representing the data to be processed by middleware.
type ProcessData = {
  // Configuration information for the request.
  config: IConfig;
  // Parameters of the request.
  params: RequestParams<any>;
  // The response object received from the request.
  response?: Response;
  // The body of the response.
  body?: any;
  // A function to resolve the Promise associated with the request.
  resolve: (data?: unknown) => void;
  // A function to reject the Promise associated with the request.
  reject: (reason?: unknown) => void;
};

export default ProcessData;
