/**
 * Recursively removes all keys from an object whose values are `null` or `undefined`.
 *
 * - Works on plain objects and arrays.
 * - Nested structures are cleaned deeply.
 * - Empty objects and arrays are preserved (unless they contain only nullish values).
 *
 * @param obj - The input object or array to clean.
 * @returns A new object or array with all `null` and `undefined` values removed.
 *
 * @example
 * cleanNulls({
 *   a: 1,
 *   b: null,
 *   c: {
 *     d: undefined,
 *     e: 'test'
 *   },
 *   f: [1, null, 2]
 * })
 * // Returns:
 * // {
 * //   a: 1,
 * //   c: { e: 'test' },
 * //   f: [1, 2]
 * // }
 */
export const cleanNulls = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanNulls).filter((item) => item != null); // optional: remove nulls inside arrays too
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value != null) {
        const cleaned = cleanNulls(value);
        if (cleaned != null) {
          result[key] = cleaned;
        }
      }
    }
    return result;
  }

  return obj;
};
