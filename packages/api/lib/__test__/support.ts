import type { Adapter, RequestContext } from '..';

/** What an adapter was asked to send, copied at that moment. */
export interface Sent {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  context: RequestContext;
}

type Answer =
  | Response
  | Error
  | ((context: RequestContext) => Response | Promise<Response>);

/**
 * An adapter that records what it is asked to send and answers from a list,
 * the last answer over and over.
 * @param answers - A response, an error to reject with, or a function
 */
export const recorder = (...answers: Answer[]) => {
  const sent: Sent[] = [];
  const adapter: Adapter = async (context) => {
    const headers: Record<string, string> = {};

    context.headers.forEach((value, name) => (headers[name] = value));
    sent.push({
      method: context.method,
      url: context.url.href,
      headers,
      body: context.body,
      context
    });

    const answer = answers[Math.min(sent.length, answers.length) - 1];

    if (answer === undefined) return json({});
    if (answer instanceof Error) throw answer;

    return typeof answer === 'function' ? answer(context) : answer.clone();
  };

  return { adapter, sent };
};

/** A JSON response. */
export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });

/** An adapter that answers when the request is aborted, as fetch does: by rejecting. */
export const hanging: Adapter = (context) =>
  new Promise((_, reject) => {
    context.signal.addEventListener('abort', () =>
      reject(new DOMException('This operation was aborted', 'AbortError'))
    );
  });
