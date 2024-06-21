/**
 * Represents a query object used for making requests with parameters.
 * It is a key-value pair where the key is a string and the value can be of any type.
 * @example
 * const query: Query = {
 *   page: 1,
 *   pageSize: 10,
 *   search: 'keyword'
 * }
 */
export type Query = { [key: string]: any };
