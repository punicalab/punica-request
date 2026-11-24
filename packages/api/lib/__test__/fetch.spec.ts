import { createClient, toFetch, type Middleware } from '..';
import { recorder, json, hanging } from './support';

describe('toFetch', () => {
  it('sends the method, headers and body, and hands a success on unread', async () => {
    const { adapter, sent } = recorder(
      new Response('data: one\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' }
      })
    );
    const fetch = toFetch(createClient({ adapter }));
    const res = await fetch('https://example.com/hook?x=1', {
      method: 'post',
      headers: { 'x-key': 'k' },
      body: 'hello',
      redirect: 'manual'
    });

    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toBe('https://example.com/hook?x=1');
    expect(sent[0].headers['x-key']).toBe('k');
    expect(sent[0].body).toBe('hello');
    expect(sent[0].context.init.redirect).toBe('manual');
    expect(res.bodyUsed).toBe(false);
    expect(await res.text()).toBe('data: one\n\n');
  });

  it('gives every status back as a Response, with the body the server sent', async () => {
    const { adapter } = recorder(json({ error: 'nope' }, 422));
    const res = await toFetch(createClient({ adapter }))(
      'https://example.com/a'
    );

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(await res.json()).toEqual({ error: 'nope' });
  });

  it('keeps a text error as text', async () => {
    const { adapter } = recorder(
      new Response('down', { status: 503, statusText: 'Service Unavailable' })
    );
    const res = await toFetch(createClient({ adapter }))(
      'https://example.com/a'
    );

    expect(res.status).toBe(503);
    expect(res.statusText).toBe('Service Unavailable');
    expect(await res.text()).toBe('down');
  });

  it('runs the middlewares, and makes a Response of an answer one made up', async () => {
    const seen: string[] = [];
    const log: Middleware = async (context, next) => {
      seen.push(context.url.pathname);

      return next();
    };
    const cached: Middleware = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      data: { from: 'cache' }
    });
    const { adapter, sent } = recorder();
    const res = await toFetch(
      createClient({ adapter, middlewares: [log, cached] })
    )('https://example.com/b');

    expect(seen).toEqual(['/b']);
    expect(sent).toHaveLength(0);
    expect(await res.json()).toEqual({ from: 'cache' });
  });

  it('rejects an abort with the signal reason, as fetch does', async () => {
    const fetch = toFetch(createClient({ adapter: hanging }));
    const controller = new AbortController();
    const reason = new DOMException('gone', 'AbortError');
    const done = fetch('https://example.com/a', { signal: controller.signal });

    controller.abort(reason);
    await expect(done).rejects.toBe(reason);
  });

  it('rejects the time a signal gave as a TimeoutError', async () => {
    const fetch = toFetch(createClient({ adapter: hanging }));

    await expect(
      fetch('https://example.com/a', { signal: AbortSignal.timeout(10) })
    ).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it("rejects the client's own timeout as a TimeoutError", async () => {
    const fetch = toFetch(createClient({ adapter: hanging, timeout: 10 }));

    await expect(fetch('https://example.com/a')).rejects.toMatchObject({
      name: 'TimeoutError'
    });
  });

  it("rejects no answer with the adapter's own error", async () => {
    const failed = new TypeError('fetch failed');
    const { adapter } = recorder(failed);

    await expect(
      toFetch(createClient({ adapter }))('https://example.com/a')
    ).rejects.toBe(failed);
  });

  it('refuses a method the client does not send', async () => {
    const { adapter } = recorder();

    await expect(
      toFetch(createClient({ adapter }))('https://example.com/a', {
        method: 'TRACE'
      })
    ).rejects.toThrow(TypeError);
  });
});
