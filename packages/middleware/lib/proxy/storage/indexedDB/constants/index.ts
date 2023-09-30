/**
 * The name of the IndexedDB database used by the proxy middleware.
 */
const DATABASE_NAME = 'PROXY_MIDDLEWARE';

/**
 * The name of the object store within the IndexedDB database where operations are stored.
 */
const OBJECT_STORE = 'OPERATIONS';

/**
 * The name of the index used for querying operations by URL.
 */
const INDEX = 'url';

export { DATABASE_NAME, INDEX, OBJECT_STORE };
