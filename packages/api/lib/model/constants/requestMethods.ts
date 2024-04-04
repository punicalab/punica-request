type RequestMethods = {
  /**
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7231#section-4.3.1}
   *
   * @description The GET method requests transfer of a current selected representation
   * for the target resource.  GET is the primary mechanism of information
   * retrieval and the focus of almost all performance optimizations.
   * Hence, when people speak of retrieving some identifiable information
   * via HTTP, they are generally referring to making a GET request.
   */
  GET: 'GET';
  /**
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7231#section-4.3.1}
   *
   * @description The POST method requests that the target resource process the
   * representation enclosed in the request according to the resource's
   * own specific semantics.  For example, POST is used for the following
   * functions (among others):
   *
   * * Providing a block of data, such as the fields entered into an HTML form, to a data-handling process;
   * * Posting a message to a bulletin board, newsgroup, mailing list, blog, or similar group of articles;
   * * Creating a new resource that has yet to be identified by the origin server; and
   * * Appending data to a resource's existing representation(s).
   */
  POST: 'POST';
  /**
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7231#section-4.3.1}
   *
   * @description The PUT method requests that the state of the target resource be
   * created or replaced with the state defined by the representation
   * enclosed in the request message payload.  A successful PUT of a given
   * representation would suggest that a subsequent GET on that same
   * target resource will result in an equivalent representation being
   * sent in a 200 (OK) response.  However, there is no guarantee that
   * such a state change will be observable, since the target resource
   * might be acted upon by other user agents in parallel, or might be
   * subject to dynamic processing by the origin server, before any
   * subsequent GET is received.  A successful response only implies that
   * the user agent's intent was achieved at the time of its processing by
   * the origin server.
   */
  PUT: 'PUT';
  /**
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7231#section-4.3.1}
   *
   * @description The DELETE method requests that the origin server remove the
   * association between the target resource and its current
   * functionality.  In effect, this method is similar to the rm command
   * in UNIX: it expresses a deletion operation on the URI mapping of the
   * origin server rather than an expectation that the previously
   * associated information be deleted.
   */
  DELETE: 'DELETE';
  /**
   * @see {@link https://datatracker.ietf.org/doc/html/rfc5789#section-2}
   *
   * @description The PATCH method requests that a set of changes described in the
   * request entity be applied to the resource identified by the Request-
   * URI.  The set of changes is represented in a format called a "patch
   * document" identified by a media type.  If the Request-URI does not
   * point to an existing resource, the server MAY create a new resource,
   * depending on the patch document type (whether it can logically modify
   * a null resource) and permissions, etc.
   */
  PATCH: 'PATCH';
};

export default RequestMethods;
