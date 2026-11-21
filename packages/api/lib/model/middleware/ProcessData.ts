import { Notifier } from '../../utils';
import { IConfig } from '../config';
import { RequestParams } from '../request';
import { HttpResponse } from '..';

/**
 * Type representing the data to be processed by middleware.
 *
 * This type is used to pass relevant data through the middleware chain. Each middleware
 * can access and modify this data as needed. It includes information about the request,
 * response, and mechanisms for resolving or rejecting the associated Promise.
 */
export type ProcessData<T = any> = {
  /**
   * Configuration information for the request.
   *
   * This property contains the configuration settings used for making the request.
   * It includes details such as headers, method, base URL, and any other settings
   * required to configure the request properly.
   *
   * @type {IConfig}
   */
  config: IConfig;

  /**
   * Parameters of the request.
   *
   * This property includes the parameters associated with the request, such as the
   * endpoint path, query parameters, and any additional settings specific to the request.
   *
   * @type {RequestParams<any>}
   */
  params: RequestParams<any>;

  /**
   * The response object received from the request.
   *
   * This property holds the response object returned by the server after the request
   * is made. It includes details such as the body, status, and the full response object.
   * This property is optional because it may not be available until the request is completed.
   *
   * @type {HttpResponse}
   */
  httpResponse?: HttpResponse<T>;

  /**
   * Notifier mechanism for monitoring operation outcomes.
   *
   * This property includes an instance of the Notifier class, which is used to manage
   * subscribers and notify them of any data updates. This mechanism is particularly
   * useful for tracking and handling the results of middleware processing, allowing
   * various components to react to changes and updates.
   *
   * @type {Notifier}
   */
  notifier: Notifier;

  /**
   * A function to resolve the Promise associated with the request.
   *
   * This function is used to resolve the Promise that represents the request's completion.
   * It can be called with an optional data parameter, which will be passed to the Promise's
   * `then` handler. Middleware can use this function to signal that the request has been
   * successfully processed.
   *
   * @param data - The data to be passed to the Promise's `then` handler.
   * @type {(data?: unknown) => void}
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
   * @type {(reason?: unknown) => void}
   */
  reject: (reason?: unknown) => void;

  /**
   * Additional properties that can be used as needed.
   * This allows for extending the parameters with custom properties.
   */
  [key: string]: any;
};
