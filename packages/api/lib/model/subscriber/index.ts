import { ProcessData } from '../middleware';

/**
 * The Subscriber type represents a subscriber object in the Observer Pattern.
 *
 * This type ensures that subscriber objects have a unique `key` and an `update` method
 * to receive and process data updates. The Observer Pattern is commonly used in event-driven
 * programming or scenarios where state changes need to be notified to multiple components.
 *
 * In the context of middleware `processData`, this type is utilized to monitor the
 * outcome of operations. Subscribers can listen for updates and react accordingly, providing
 * a way to track and handle the results of middleware processing.
 */
export type Subscriber = {
  /**
   * A unique identifier for the subscriber, ensuring uniqueness in the observer system.
   * This key is used to prevent duplicate addition of subscribers.
   */
  key: string;

  /**
   * Method called to handle a data update from the Observable (or Notifier).
   *
   * This method is invoked by the Observable (or Notifier) object whenever there is a data
   * change or event of interest. It allows the subscriber to process the received data update
   * accordingly.
   *
   * @param data - The update data provided to the subscriber. This data contains information
   * about the updated state or event and can be of any type. The subscriber should handle
   * this data appropriately based on its intended use.
   * @returns A Promise that resolves when the update operation completes successfully, or
   * rejects if there is an error handling the update.
   */
  update(data: ProcessData): Promise<void>;
};
