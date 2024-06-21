import { Notifier } from '../../utils';
import { IConfig } from '../config';
import { RequestParams } from '../request';

/**
 * Type representing the data to be processed by middleware.
 *
 * This type is used to pass relevant data through the middleware chain. Each middleware
 * can access and modify this data as needed, and it includes information about the request,
 * response, and mechanisms for resolving or rejecting the associated Promise.
 */
export type ProcessData = {
  /**
   * Configuration information for the request.
   *
   * This property contains the configuration settings used for making the request.
   * It includes details such as headers, method, base URL, and any other settings
   * required to configure the request properly.
   */
  config: IConfig;

  /**
   * Parameters of the request.
   *
   * This property includes the parameters associated with the request, such as the
   * endpoint path, query parameters, and any additional settings specific to the request.
   */
  params: RequestParams<any>;

  /**
   * The response object received from the request.
   *
   * This property holds the response object returned by the server after the request
   * is made. It includes details such as status, headers, and the response body.
   * This property is optional because it may not be available until the request is completed.
   */
  response?: Response;

  /**
   * The body of the response.
   *
   * This property contains the actual data returned in the response body. It is often
   * the parsed JSON or text data received from the server. This property is optional
   * because it may not be available until the response is processed.
   */
  body?: any;

  /**
   * A function to resolve the Promise associated with the request.
   *
   * This function is used to resolve the Promise that represents the request's completion.
   * It can be called with an optional data parameter, which will be passed to the Promise's
   * `then` handler. Middleware can use this function to signal that the request has been
   * successfully processed.
   *
   * @param data - The data to be passed to the Promise's `then` handler.
   */
  resolve: (data?: unknown) => void;

  /**
   * A function to reject the Promise associated with the request.
   *
   * This function is used to reject the Promise that represents the request's completion.
   * It can be called with an optional reason parameter, which will be passed to the Promise's
   * `catch` handler. Middleware can use this function to signal that an error occurred while
   * processing the request.
   *
   * @param reason - The reason for rejecting the Promise.
   */
  reject: (reason?: unknown) => void;

  /**
   * Notifier mechanism for monitoring operation outcomes.
   *
   * This property includes an instance of the Notifier class, which is used to manage
   * subscribers and notify them of any data updates. This mechanism is particularly
   * useful for tracking and handling the results of middleware processing, allowing
   * various components to react to changes and updates.
   */
  notifier: Notifier;
};
