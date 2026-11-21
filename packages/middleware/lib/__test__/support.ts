import {
  HttpResponse,
  IConfig,
  IRequest,
  RequestParams
} from '@punica/request';

type Answer = (
  method: string,
  params: RequestParams<any>
) => HttpResponse | Promise<HttpResponse>;

/** An adapter that records what it is asked to send and answers as told. */
export class Recorder implements IRequest {
  public calls: Array<{ method: string; params: RequestParams<any> }> = [];

  constructor(
    public answer: Answer = () => ({
      status: 200,
      response: null,
      payload: { ok: true }
    })
  ) {}

  public set config(_value: IConfig) {}

  #send(method: string, params: RequestParams<any>): Promise<HttpResponse> {
    this.calls.push({ method, params });

    return Promise.resolve().then(() => this.answer(method, params));
  }

  public get = (params: RequestParams<any>) => this.#send('GET', params);
  public delete = (params: RequestParams<any>) => this.#send('DELETE', params);
  public post = (params: RequestParams<any>) => this.#send('POST', params);
  public put = (params: RequestParams<any>) => this.#send('PUT', params);
  public patch = (params: RequestParams<any>) => this.#send('PATCH', params);
}

/** Fails a test that would otherwise wait for a promise that never settles. */
export const settled = <T>(
  promise: Promise<T>,
  milliseconds = 500
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error('did not settle')), milliseconds)
    )
  ]);
