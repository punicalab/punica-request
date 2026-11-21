import type { HeadersInput, HttpMethod, RequestOptions } from './types';

/** Adds headers to `target`. In an object, `null` and `undefined` remove one. */
const apply = (target: Headers, input?: HeadersInput): void => {
  if (!input) return;

  if (input instanceof Headers) {
    input.forEach((value, name) => target.set(name, value));
  } else if (Array.isArray(input)) {
    for (const [name, value] of input as ReadonlyArray<
      readonly [string, string]
    >) {
      target.set(name, value);
    }
  } else {
    const record = input as { [name: string]: string | null | undefined };

    for (const name of Object.keys(record)) {
      const value = record[name];

      if (value === null || value === undefined) target.delete(name);
      else target.set(name, String(value));
    }
  }
};

/**
 * The headers of a request: those of the client, then its own.
 * @param inputs - From the least to the most specific
 */
export const mergeHeaders = (
  ...inputs: Array<HeadersInput | undefined>
): Headers => {
  const headers = new Headers();

  for (const input of inputs) apply(headers, input);

  return headers;
};

const is = <T>(value: unknown, type: string): value is T =>
  Object.prototype.toString.call(value) === `[object ${type}]`;

/**
 * Refuses a body that cannot be sent, before anything is sent.
 * @param method - The method of the request
 * @param body - Its body
 */
export const assertBody = (
  method: HttpMethod,
  body: BodyInit | null | undefined
): void => {
  if (body === null || body === undefined) return;

  if (method === 'GET' || method === 'HEAD') {
    throw new TypeError(
      `A ${method} request cannot have a body. Send what it needs in "query".`
    );
  }

  if (is<ReadableStream>(body, 'ReadableStream')) {
    // A stream is read once: the request could not be sent again
    throw new TypeError(
      'A stream cannot be the body of a request. Send a Blob, a string, FormData or an ArrayBuffer.'
    );
  }
};

/**
 * The body a request is sent with, and the `Content-Type` that belongs to it.
 * @param method - The method of the request
 * @param options - The options of the request
 * @param headers - The headers of the request, which are changed
 * @param own - The headers the request itself gave
 */
export const prepareBody = (
  method: HttpMethod,
  options: RequestOptions,
  headers: Headers,
  own: Headers
): BodyInit | null | undefined => {
  const { json, body } = options;

  if (json !== undefined && body !== undefined && body !== null) {
    throw new TypeError(
      'A request has "json" or "body", not both: "json" is serialised for you, "body" is sent as it is.'
    );
  }

  if (json !== undefined) {
    const serialised = JSON.stringify(json);

    if (serialised === undefined) {
      throw new TypeError('"json" holds a value that JSON cannot express.');
    }

    assertBody(method, serialised);

    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    return serialised;
  }

  assertBody(method, body);

  // These bodies say what they are themselves; the multipart boundary is
  // known to nobody else. A default of the client must not speak for them
  if (is<FormData>(body, 'FormData')) {
    headers.delete('content-type');
  } else if (
    !own.has('content-type') &&
    (is<URLSearchParams>(body, 'URLSearchParams') ||
      (is<Blob>(body, 'Blob') && body.type) ||
      (is<File>(body, 'File') && body.type))
  ) {
    headers.delete('content-type');
  }

  return body;
};
