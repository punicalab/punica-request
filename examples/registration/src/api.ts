// The client of the application, as an application sets one up: the rules
// that hold for every request are the list of middlewares.
import { createClient, when } from '@punica/request';
import type { Adapter, Middleware } from '@punica/request';
import {
  cache,
  cancel,
  cookie,
  onError,
  refreshToken,
  tokenAuth
} from '@punica/request-middleware';
import type { IStorage } from '@punica/request-middleware';

declare module '@punica/request' {
  interface RequestOptions {
    /** The request deals with its failure itself: no message is shown. */
    ignoreNotification?: boolean;
  }
}

/** What a failed response of this API holds. */
export interface ApiError {
  errors: Record<string, string[]>;
}

/** What differs between a browser and a server. */
export interface Environment {
  adapter: Adapter;
  baseURL: string;
  storage: IStorage;
  /** Where the token is: a cookie in the browser, a variable elsewhere. */
  token: {
    get(): string | null;
    set(value: string | null): void;
    cookieName?: string;
  };
  /** The language of the page. */
  language: () => string;
  /** Shows a message to the user. */
  notify: (message: string) => void;
}

/** Sends the language of the page, unless the request names its own. */
const acceptLanguage =
  (language: () => string): Middleware =>
  (context, next) => {
    if (!context.requestHeaders.has('Accept-Language')) {
      context.headers.set('Accept-Language', language());
    }

    return next();
  };

export const createApi = (environment: Environment) => {
  const { adapter, baseURL, storage, token, language, notify } = environment;
  const latest = cancel();
  let refreshes = 0;

  const api = createClient({
    baseURL,
    adapter,
    headers: { Accept: 'application/json' },
    timeout: 1000,
    init: { mode: 'cors' },
    middlewares: [
      onError({
        default: (response, context) => {
          if (context.options.ignoreNotification) return;

          const { errors } = (response.data ?? { errors: {} }) as ApiError;

          Object.values(errors).forEach(([message]) => notify(message));
        }
      }),
      refreshToken({
        refresh: async () => {
          refreshes += 1;

          const { data } = await api.post<{ token: string }>('auth/refresh');

          token.set(data.token);
        },
        exclude: (context) => context.url.pathname.endsWith('/auth/refresh')
      }),
      acceptLanguage(language),
      token.cookieName
        ? tokenAuth({ cookieName: token.cookieName })
        : tokenAuth({ getToken: () => token.get() }),
      when(
        (context) =>
          context.method !== 'GET' && typeof document !== 'undefined',
        cookie({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
      ),
      cache({ storage }),
      when((context) => context.url.pathname.endsWith('/search'), latest)
    ]
  });

  return { api, latest, refreshes: () => refreshes };
};
