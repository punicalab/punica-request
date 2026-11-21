import type { Query, QueryValue } from './types';

/** What a relative address is relative to: the page, where there is one. */
const page = (): string | undefined =>
  typeof document !== 'undefined' && document.baseURI
    ? document.baseURI
    : undefined;

const parse = (value: string, base?: string | URL): URL | undefined => {
  try {
    return new URL(value, base);
  } catch {
    return undefined;
  }
};

/**
 * The base address of a client, as a URL whose path ends with a slash, so
 * that paths are added to it instead of replacing its last part.
 * @param baseURL - What the client was given
 */
export const resolveBase = (baseURL?: string | URL): URL | undefined => {
  if (baseURL === undefined || baseURL === null || baseURL === '') {
    return undefined;
  }

  const text = String(baseURL);
  let url = parse(text);

  if (!url) {
    const relativeTo = page();

    if (!relativeTo) {
      throw new TypeError(
        `baseURL "${text}" is relative and there is no page it could be relative to. Give the whole address, like "https://api.example.com/v1".`
      );
    }

    url = parse(text, relativeTo);
  }

  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new TypeError(`baseURL "${text}" is not an http(s) address.`);
  }

  if (url.search || url.hash) {
    throw new TypeError(
      `baseURL "${text}" has a query or a fragment. Put what every request needs in a middleware, or in "query" of the request.`
    );
  }

  if (!url.pathname.endsWith('/')) url.pathname += '/';

  return url;
};

const text = (value: Exclude<QueryValue, null | undefined>) =>
  value instanceof Date ? value.toISOString() : String(value);

/**
 * Adds a query to an address. `null` and `undefined` are left out; an array
 * repeats its name.
 * @param url - The address
 * @param query - What is added
 */
export const appendQuery = (url: URL, query?: Query): void => {
  if (!query) return;

  if (query instanceof URLSearchParams) {
    query.forEach((value, name) => url.searchParams.append(name, value));

    return;
  }

  for (const name of Object.keys(query)) {
    const value = query[name];
    const values: ReadonlyArray<QueryValue> = Array.isArray(value)
      ? value
      : [value as QueryValue];

    for (const one of values) {
      if (one !== null && one !== undefined) {
        url.searchParams.append(name, text(one));
      }
    }
  }
};

/**
 * The address of a request.
 *
 * With a base, the path is added to it whatever slashes either has, and a
 * path that leads to another origin is refused: the client's headers, which
 * may hold a token, are meant for its own server.
 * @param base - The base address of the client
 * @param path - The path of the request
 * @param query - The query of the request
 */
export const buildURL = (
  base: URL | undefined,
  path: string,
  query?: Query
): URL => {
  if (typeof path !== 'string') {
    throw new TypeError(
      'The path of a request is a string: api.get("items", { query }).'
    );
  }

  let url: URL | undefined;

  if (base) {
    // "/items" is under the base, not at the root of its server
    url = parse(path.replace(/^\/+/, ''), base);

    if (!url || url.origin !== base.origin) {
      throw new TypeError(
        `"${path}" leads away from the baseURL of the client (${base.origin}). Use a path under it, or a client of its own for the other address.`
      );
    }
  } else {
    url = parse(path) ?? (page() ? parse(path, page()) : undefined);

    if (!url) {
      throw new TypeError(
        `"${path}" is not a whole address and the client has no baseURL.`
      );
    }
  }

  appendQuery(url, query);

  return url;
};
