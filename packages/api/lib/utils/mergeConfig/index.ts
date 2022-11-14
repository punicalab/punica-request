/**
 *
 * @param conf1
 * @param conf2
 * @returns
 */
const mergeConfig = (conf1: any, conf2: any) => {
  conf1 = { ...(conf1 || {}) };
  conf2 = { ...(conf2 || {}) };

  for (const key of Object.keys(conf2)) {
    if (Array.isArray(conf2[key])) {
      conf2[key] = conf1[key].concat(conf2[key]);
    } else if (conf2[key] instanceof Object) {
      Object.assign(conf2[key], mergeConfig(conf1[key], conf2[key]));
    }
  }

  Object.assign(conf1, conf2);

  return conf1;
};

export default mergeConfig;
