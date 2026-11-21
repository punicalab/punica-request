import { IConfig, RequestAPI } from '@punica/request';
import { ErrorMiddleware, RefreshTokenMiddleware } from '..';
import { Recorder, settled } from './support';

describe('RefreshTokenMiddleware', () => {
  const create = (refreshToken: () => Promise<boolean>, valid = () => true) => {
    const adapter = new Recorder(() =>
      valid()
        ? { status: 200, response: null, payload: 'ok' }
        : { status: 401, response: null }
    );
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      responseMiddlewares: [
        new RefreshTokenMiddleware({ tokenProvider: { refreshToken } })
      ]
    });

    return { adapter, api };
  };

  test('refreshes once for requests that fail together and sends them again', async () => {
    let valid = false;
    const refreshToken = jest.fn(async () => (valid = true));
    const { adapter, api } = create(refreshToken, () => valid);
    const responses = await settled(
      Promise.all([api.get({ path: 'a' }), api.post({ path: 'b' })])
    );

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(responses.map(({ payload }) => payload)).toEqual(['ok', 'ok']);
    // Each request again with its own method
    expect(adapter.calls.map(({ method }) => method).sort()).toEqual([
      'GET',
      'GET',
      'POST',
      'POST'
    ]);
  });

  test('does not go on refreshing while the server keeps answering 401', async () => {
    const refreshToken = jest.fn(async () => true);
    const { adapter, api } = create(refreshToken, () => false);
    const response = await settled(api.get({ path: 'a' }));

    expect(response.status).toBe(401);
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(adapter.calls).toHaveLength(2);
  });

  test('a token that could not be refreshed leaves the 401 to what follows', async () => {
    const refreshToken = jest.fn(async () => false);
    const unauthorized = jest.fn(async (): Promise<void> => undefined);
    const adapter = new Recorder(() => ({
      status: 401,
      response: { json: async () => ({ reason: 'expired' }) }
    }));
    const api = new RequestAPI(adapter, {
      hostname: 'https://host/',
      responseMiddlewares: [
        new RefreshTokenMiddleware({ tokenProvider: { refreshToken } }),
        new ErrorMiddleware({
          contentType: 'json',
          error: { 401: unauthorized }
        })
      ]
    });

    await expect(settled(api.get({ path: 'a' }))).rejects.toMatchObject({
      httpResponse: { status: 401 }
    });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(unauthorized).toHaveBeenCalledTimes(1);
    // Not sent again: there is no new token
    expect(adapter.calls).toHaveLength(1);
  });

  test('a provider that refreshes through the same API does not wait for itself', async () => {
    const adapter = new Recorder(() => ({ status: 401, response: null }));
    const config: IConfig = { hostname: 'https://host/' };
    const api = new RequestAPI(adapter, config);

    config.responseMiddlewares = [
      new RefreshTokenMiddleware({
        // Answered with a 401 as well: the session is over
        tokenProvider: {
          refreshToken: async () =>
            (await api.post({ path: 'auth/refresh' })).status === 200
        },
        exclude: ({ params }) => params.path === 'auth/refresh'
      })
    ];

    const response = await settled(api.get({ path: 'a' }));

    expect(response.status).toBe(401);
    expect(adapter.calls.map(({ params }) => params.path)).toEqual([
      'a',
      'auth/refresh'
    ]);
  });

  test('a refresh that throws rejects the requests that wait for it', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation();
    const { api } = create(
      async () => {
        throw new Error('no session');
      },
      () => false
    );

    await expect(settled(api.get({ path: 'a' }))).rejects.toThrow('no session');
    error.mockRestore();
  });
});
