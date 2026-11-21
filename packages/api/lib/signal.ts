/** The one signal of a request, and what can abort it. */
export interface Abort {
  readonly signal: AbortSignal;
  /** Whether it was the timeout that aborted the request. */
  readonly timedOut: boolean;
  abort(reason?: unknown): void;
  /**
   * The request is over: the timer and the listener go.
   * @param keepCaller - The caller's signal still aborts, for a body that
   * is read after the request
   */
  dispose(keepCaller?: boolean): void;
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

    if (typeof timeout === 'number' && timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        abort();
      }, timeout);
    }
  }

  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut;
    },
    abort,
    dispose(keepCaller = false) {
      clearTimeout(timer);

      if (!keepCaller) given?.removeEventListener('abort', onGiven);
    }
  };
};
