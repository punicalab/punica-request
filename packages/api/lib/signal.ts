/** The one signal of a request, and what can abort it. */
export interface Abort {
  readonly signal: AbortSignal;
  /** Whether it was the timeout that aborted the request. */
  readonly timedOut: boolean;
  abort(reason?: unknown): void;
  /** The request is over: the timer goes. */
  clearTimer(): void;
  /** Nothing of the request is read any more: the timer and the listener go. */
  dispose(): void;
}

/**
 * One controller per request. The caller's signal and the timeout abort it;
 * so can a middleware. Everything that listens is removed by `dispose`.
 * @param given - The signal the caller gave the request
 * @param timeout - Milliseconds the request may take
 */
export const createAbort = (
  given?: AbortSignal | null,
  timeout?: number
): Abort => {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };
  const onGiven = () => abort(given?.reason);

  if (given?.aborted) {
    onGiven();
  } else {
    given?.addEventListener('abort', onGiven, { once: true });

    // Infinity is no limit; a timer takes no more than 2^31 - 1
    if (
      typeof timeout === 'number' &&
      timeout > 0 &&
      Number.isFinite(timeout)
    ) {
      timer = setTimeout(
        () => {
          timedOut = true;
          abort();
        },
        Math.min(timeout, 2147483647)
      );
    }
  }

  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut;
    },
    abort,
    clearTimer() {
      clearTimeout(timer);
    },
    dispose() {
      clearTimeout(timer);
      given?.removeEventListener('abort', onGiven);
    }
  };
};
