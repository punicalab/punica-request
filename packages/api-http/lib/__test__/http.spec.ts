import http, { IncomingMessage } from 'http';
import { PassThrough } from 'stream';
import { RequestAPI } from '@punica/request';
import { APIHttp } from '..';

describe('APIHttp', () => {
  afterEach(() => jest.restoreAllMocks());

  /** Answers a request with a response that arrives in the given pieces. */
  const answerWith = (pieces: Buffer[], statusCode = 200) => {
    jest.spyOn(http, 'request').mockImplementation(((
      _options: unknown,
      callback: (response: IncomingMessage) => void
    ) => {
      const response = Object.assign(new PassThrough(), { statusCode });

      return {
        on: (): void => undefined,
        write: (): void => undefined,
        end: () => {
          callback(response as unknown as IncomingMessage);
          pieces.forEach((piece) => response.write(piece));
          response.end();
        }
      };
    }) as never);
  };

  test('reads a response whose characters arrive in pieces', async () => {
    const body = Buffer.from(JSON.stringify({ name: 'Şeker 🍬' }), 'utf8');
    // In the middle of the two bytes of "Ş", and of the four of the sweet
    const first = body.indexOf(0xc5) + 1;
    const second = body.indexOf(0xf0) + 2;

    answerWith([
      body.subarray(0, first),
      body.subarray(first, second),
      body.subarray(second)
    ]);

    const api = new RequestAPI(new APIHttp(), { hostname: 'localhost' });
    const response = await api.get({ path: '/items' });

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ name: 'Şeker 🍬' });
  });

  test('a response that is not 2xx has its status and no payload', async () => {
    answerWith([Buffer.from('{"error":"nope"}')], 404);

    const api = new RequestAPI(new APIHttp(), { hostname: 'localhost' });
    const response = await api.get({ path: '/missing' });

    expect(response.status).toBe(404);
    expect(response.payload).toBeUndefined();
  });
});
