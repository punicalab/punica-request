type ContentType =
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/arrayBuffer}
   *
   * @description The arrayBuffer() method of the Response interface takes a Response stream and reads it to completion.
   * It returns a promise that resolves with an ArrayBuffer.
   */
  | 'arrayBuffer'
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/blob}
   *
   * @description The blob() method of the Response interface takes a Response stream and reads it to completion.
   * It returns a promise that resolves with a Blob.
   */
  | 'blob'
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/formData}
   *
   * @description The formData() method of the Response interface takes a Response stream and reads it to completion.
   * It returns a promise that resolves with a FormData object.
   */
  | 'formData'
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/json}
   *
   * @description The json() method of the Response interface takes a Response stream and reads it to completion.
   * It returns a promise which resolves with the result of parsing the body text as JSON.
   */
  | 'json'
  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/text}
   *
   * @description The text() method of the Response interface takes a Response stream and reads it to completion.
   * It returns a promise that resolves with a String.
   * The response is always decoded using UTF-8.
   */
  | 'text';

export default ContentType;
