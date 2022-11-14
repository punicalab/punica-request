/**
 *
 * @param parameters
 * @returns
 */
const getUrlParam = (parameters: any): string => {
  if (parameters == null) {
    return '';
  }

  const query: Array<string> = new Array<string>();

  for (const key in parameters) {
    const val = parameters[key];
    if (val != null) {
      query.push(`${key}=${val}`);
    }
  }

  return '?' + query.join('&');
};

export default getUrlParam;
