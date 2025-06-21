/**
 * Merges two configuration objects.
 * @param conf1 - The first configuration object.
 * @param conf2 - The second configuration object.
 * @returns The merged configuration object.
 */
export const mergeConfig = (conf1: any, conf2: any) => {
  // Create copies of the configuration objects to avoid modifying the originals
  conf1 = { ...(conf1 || {}) };
  conf2 = { ...(conf2 || {}) };

  // Iterate over the keys of the second configuration object (conf2)
  for (const key of Object.keys(conf2)) {
    // If the value of a key is an array, concatenate it with the corresponding array in conf1
    if (Array.isArray(conf2[key])) {
      conf2[key] = conf1[key].concat(conf2[key]);
    }
    // If the value of a key is an object, recursively merge it with the corresponding object in conf1
    else if (conf2[key] instanceof Object) {
      Object.assign(conf2[key], mergeConfig(conf1[key], conf2[key]));
    }
  }

  // Merge the modified conf2 back into conf1
  Object.assign(conf1, conf2);

  // Return the merged configuration object
  return conf1;
};
