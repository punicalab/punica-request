import { RequestAPI } from '@punica/request';
import { APIFetch } from '..';

describe('APIFetch', () => {
  const fetchMock = jest.fn();
  const api = new RequestAPI(new APIFetch(), {
    hostname: 'https://host/',
    requestInit: { headers: { Accept: 'application/json' } }
  });

  beforeAll(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  beforeEach(() => fetchMock.mockReset());

  test('sends the request and reads the payload as asked', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    );

    const response = await api.post({
      path: 'items',
      data: JSON.stringify({ name: 'a' }),
      contentType: 'json',
      init: { headers: { 'Content-Type': 'application/json' } }
    });

    expect(response).toMatchObject({ status: 200, payload: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://host/items',
      expect.objectContaining({
        method: 'POST',
        body: '{"name":"a"}',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })
    );
  });

  test('a response that is not 2xx resolves, with its status and no payload', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));

    const response = await api.get({ path: 'missing', contentType: 'json' });

    expect(response.status).toBe(404);
    expect(response.payload).toBeUndefined();
  });

  test('a request that cannot be sent rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get({ path: 'items' })).rejects.toThrow('Failed to fetch');
  });
});
