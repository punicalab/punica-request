import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import type { Adapter } from '@punica/request';

/** The options of the http adapter. */
export interface HttpAdapterOptions {
  /** The agent of requests to `http:` addresses: connection pooling, a proxy. */
  httpAgent?: http.Agent;
  /** The agent of requests to `https:` addresses. */
  httpsAgent?: https.Agent;
  /**
   * Passed to `http.request` / `https.request` with every request: `ca`,
   * `rejectUnauthorized`, `family`, `localAddress`, …
   */
  requestOptions?: https.RequestOptions;
}

/** Statuses whose responses have no body. */
const BODILESS = new Set([204, 205, 304]);

/**
 * Sends requests with the `http` and `https` modules of Node: for agents,
 * certificates and what else `fetch` does not reach.
 *
 * It does not follow redirects (a 3xx is the response) and does not
 * decompress; it sends no `Accept-Encoding` of its own.
 *
 * ```ts
 * const api = createClient({ baseURL, adapter: httpAdapter() });
 * ```
 * @param options - The options of the adapter
 */
export const httpAdapter =
  (options: HttpAdapterOptions = {}): Adapter =>
  async (context) => {
    const { url, method, signal } = context;
    const secure = url.protocol === 'https:';
    const headers: http.OutgoingHttpHeaders = {};
    let body: Buffer | undefined;

    if (context.body !== null && context.body !== undefined) {
      // A Request knows how each kind of body is written, and its type:
      // the boundary of form data, the encoding of a query
      // (at an address of its own: the real one may hold credentials, which
      // a Request refuses)
      const written = new Request('http://localhost/', {
        method,
        headers: context.headers,
        body: context.body
      });

      body = Buffer.from(await written.arrayBuffer());
      written.headers.forEach((value, name) => (headers[name] = value));
      headers['content-length'] = body.byteLength;
    } else {
      context.headers.forEach((value, name) => (headers[name] = value));
    }

    return new Promise<Response>((resolve, reject) => {
      const request = (secure ? https : http).request(
        url,
        {
          ...options.requestOptions,
          agent:
            (secure ? options.httpsAgent : options.httpAgent) ??
            options.requestOptions?.agent,
          method,
          headers,
          signal
        },
        (incoming) => {
          const status = incoming.statusCode ?? 0;
          const received = new Headers();

          // Pairs, so that a header sent twice (Set-Cookie) is there twice
          for (let i = 0; i < incoming.rawHeaders.length; i += 2) {
            received.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
          }

          const empty = method === 'HEAD' || BODILESS.has(status);

          if (empty) incoming.resume();

          try {
            resolve(
              new Response(
                empty ? null : (Readable.toWeb(incoming) as ReadableStream),
                {
                  status,
                  statusText: incoming.statusMessage,
                  headers: received
                }
              )
            );
          } catch (error) {
            incoming.destroy();
            reject(error);
          }
        }
      );

      request.on('error', reject);
      // `timeout` of requestOptions: the socket was idle for that long
      request.on('timeout', () =>
        request.destroy(new Error('The socket timed out'))
      );
      // A server that switches protocols is not answering the request
      request.on('upgrade', (_incoming, socket) => {
        socket.destroy();
        reject(new Error('The server switched protocols instead of answering'));
      });
      // Whatever else happened: a request that is over has not been answered
      request.on('close', () =>
        reject(new Error('The connection was closed before a response came'))
      );
      request.end(body);
    });
  };
