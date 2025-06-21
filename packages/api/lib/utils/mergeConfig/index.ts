/**
 * Deep-merges two configuration objects.
 * - Arrays are concatenated.
 * - Objects are merged recursively.
 * - Keys with null or undefined in either object are removed from the result.
 *
 * @param conf1 - The base configuration object.
 * @param conf2 - The overriding configuration object.
 * @returns The merged configuration object.
 */
export const mergeConfig = (conf1: any, conf2: any): any => {
  const result: Record<string, any> = {};

  const keys = new Set([
    ...Object.keys(conf1 || {}),
    ...Object.keys(conf2 || {})
  ]);

  for (const key of keys) {
    const val1 = conf1?.[key];
    const val2 = conf2?.[key];

    // If both are null/undefined → skip
    if (val1 == null && val2 == null) continue;

    // If val2 is explicitly null or undefined → skip (delete/ignore key)
    if (val2 == null) continue;

    // If val2 is array → merge arrays
    if (Array.isArray(val2)) {
      result[key] = (Array.isArray(val1) ? val1 : []).concat(val2);
    }

    // If val2 is an object → recursively merge
    else if (typeof val2 === 'object' && !Array.isArray(val2)) {
      result[key] = mergeConfig(
        typeof val1 === 'object' && val1 != null ? val1 : {},
        val2
      );
    }

    // Otherwise, use val2
    else {
      result[key] = val2;
    }
  }

  return result;
};
