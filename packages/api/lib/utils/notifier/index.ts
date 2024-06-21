import { Subscriber } from '../../model';

/**
 * The Notifier class is responsible for managing subscribers and notifying them of any data updates.
 *
 * This class allows adding, removing, notifying, and clearing subscribers. It is used in the middleware
 * `processData` to monitor the outcome of operations, providing a way to track and handle the results
 * of middleware processing.
 */
export class Notifier {
  #subscribers: Map<string, Subscriber> = new Map();

  /**
   * Adds a subscriber to the list of subscribers.
   *
   * @param subscriber - The subscriber to be added.
   */
  addSubscriber(subscriber: Subscriber): void {
    if (!this.#subscribers.has(subscriber.key)) {
      this.#subscribers.set(subscriber.key, subscriber);
    }
  }

  /**
   * Removes a subscriber from the list of subscribers.
   *
   * @param subscriber - The subscriber to be removed.
   */
  removeSubscriber(subscriber: Subscriber): void {
    if (this.#subscribers.has(subscriber.key)) {
      this.#subscribers.delete(subscriber.key);
    }
  }

  /**
   * Removes all subscribers from the list of subscribers.
   */
  clearSubscribers(): void {
    this.#subscribers.clear();
  }

  /**
   * Notifies all subscribers with the provided data.
   *
   * @param data - The data to be sent to all subscribers.
   */
  async notifySubscribers(data: any) {
    for await (const subscriber of this.#subscribers.values()) {
      await subscriber.update(data);
    }
  }
}
