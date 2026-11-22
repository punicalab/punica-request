import { RequestError } from './errors';
import type { HttpResponse, RequestContext, ResponseType } from './types';

/** What a body is, going by its `Content-Type`. */
const sniff = (contentType: string | null): ResponseType => {
  if (!contentType) return 'text';
  if (/[/+]json\s*(;|$)/i.test(contentType)) return 'json';

  if (
    /^\s*text\//i.test(contentType) ||
    /[/+]xml\b/i.test(contentType) ||
    /x-www-form-urlencoded/i.test(contentType) ||
    // Text that is no JSON document: lines of JSON, scripts, YAML
    /json|javascript|ecmascript|yaml/i.test(contentType)
  ) {
    return 'text';
  }

  return 'blob';
};

/**
 * Reads the body of a response, once.
 *
 * Within 2xx the `responseType` of the request decides, if it has one. Any
 * other response is read by its `Content-Type`, so that the body of an
 * error is there as what the server sent. No body is `undefined`.
 * @param raw - The response of the adapter
 * @param context - The request
 */
export const readResponse = async (
  raw: Response,
  context: RequestContext
): Promise<HttpResponse> => {
  const response: HttpResponse = {
    ok: raw.ok,
    status: raw.status,
    headers: raw.headers,
    data: undefined,
    raw
  };

  if (
    context.method === 'HEAD' ||
    raw.status === 204 ||
    raw.status === 205 ||
    raw.status === 304 ||
    raw.body === null
  ) {
    return response;
  }

  const asked = raw.ok ? context.responseType : undefined;

  if (asked === 'stream') {
    response.data = raw.body;

    return response;
  }

  switch (asked ?? sniff(raw.headers.get('content-type'))) {
    case 'json': {
      const text = await raw.text();

      if (text === '') break;

      try {
        response.data = JSON.parse(text);
      } catch (cause) {
        // Promised JSON and brought something else. An error keeps what came
        if (raw.ok) throw new RequestError('parse', context, cause);

        response.data = text;
      }

      break;
    }
    case 'blob': {
      const blob = await raw.blob();

      // Asked for: an empty blob is still the answer
      if (asked || blob.size > 0) response.data = blob;

      break;
    }
    case 'arrayBuffer':
      response.data = await raw.arrayBuffer();
      break;
    case 'formData':
      try {
        response.data = await raw.formData();
      } catch (cause) {
        throw new RequestError('parse', context, cause);
      }

      break;
    default: {
      const text = await raw.text();

      if (text !== '') response.data = text;
    }
  }

  return response;
};
