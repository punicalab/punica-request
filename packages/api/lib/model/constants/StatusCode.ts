export enum StatusCode {
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.2.1}
   *
   * @description The 100 (Continue) status code indicates that the initial part of a
   * request has been received and has not yet been rejected by the
   * server.  The server intends to send a final response after the
   * request has been fully received and acted upon.
   */
  CONTINUE = 100,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.2.2}
   *
   * @description The 101 (Switching Protocols) status code indicates that the server
   * understands and is willing to comply with the client's request, via
   * the Upgrade header field (Section 6.7 of [RFC7230]), for a change in
   * the application protocol being used on this connection.  The server
   * MUST generate an Upgrade header field in the response that indicates
   * which protocol(s) will be switched to immediately after the empty
   * line that terminates the 101 response.
   */
  SWITCHING_PROTOCOLS = 101,
  /**
   * @see {@link https://tools.ietf.org/html/rfc2518#section-10.1}
   *
   * @description The 102 (Processing) status code is an interim response used to
   inform the client that the server has accepted the complete request,
   but has not yet completed it.  This status code SHOULD only be sent
   when the server has a reasonable expectation that the request will
   take significant time to complete. As guidance, if a method is taking
   longer than 20 seconds (a reasonable, but arbitrary value) to process
   the server SHOULD return a 102 (Processing) response. The server MUST
   send a final response after the request has been completed.
   */
  PROCESSING = 102,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.3.1}
   *
   * @description The 200 (OK) status code indicates that the request has succeeded.
   * The payload sent in a 200 response depends on the request method.
   * For the methods defined by this specification, the intended meaning
   * of the payload can be summarized as:

   * * GET a representation of the target resource;
   * * HEAD the same representation as GET, but without the representation data;
   * * POST a representation of the status of, or results obtained from, the action;
   * * PUT, DELETE  a representation of the status of the action;
   * * OPTIONS  a representation of the communications options;
   * * TRACE  a representation of the request message as received by the end server.
   */
  OK = 200,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.3.2}
   *
   * @description The 201 (Created) status code indicates that the request has been
   * fulfilled and has resulted in one or more new resources being
   * created.  The primary resource created by the request is identified
   * by either a Location header field in the response or, if no Location
   * field is received, by the effective request URI.
   */
  CREATED = 201,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.3.3}
   *
   * @description The 202 (Accepted) status code indicates that the request has been
   * accepted for processing, but the processing has not been completed.
   * The request might or might not eventually be acted upon, as it might
   * be disallowed when processing actually takes place.  There is no
   * facility in HTTP for re-sending a status code from an asynchronous
   * operation.
   */
  ACCEPTED = 202,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.3.4}
   *
   * @description The 203 (Non-Authoritative Information) status code indicates that
   * the request was successful but the enclosed payload has been modified
   * from that of the origin server's 200 (OK) response by a transforming
   * proxy. This status code allows the proxy to notify recipients when a transformation
   * has been applied, since that knowledge might impact later decisions regarding the
   * content.  For example, future cache validation requests for the
   * content might only be applicable along the same request path (through
   * the same proxies).
   */
  NON_AUTHORITATIVE_INFORMATION = 203,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.3.5}
   *
   * @description The 204 (No Content) status code indicates that the server has
   * successfully fulfilled the request and that there is no additional
   * content to send in the response payload body.  Metadata in the
   * response header fields refer to the target resource and its selected
   * representation after the requested action was applied.
   */
  NO_CONTENT = 204,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.3.6}
   *
   * @description The 205 (Reset Content) status code indicates that the server has
   * fulfilled the request and desires that the user agent reset the
   * "document view", which caused the request to be sent, to its original
   * state as received from the origin server.
   */
  RESET_CONTENT = 205,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7233#section-4.1}
   *
   * @description The 206 (Partial Content) status code indicates that
   * the server is successfully fulfilling a range request for the target resource by
   * transferring one or more parts of the selected representation that
   * correspond to the satisfiable ranges found in the request's Range
   * header field.
   */
  PARTIAL_CONTENT = 206,
  /**
   * @see {@link https://tools.ietf.org/html/rfc2518#section-10.2}
   *
   * @description The 207 (Multi-Status) status code provides status for multiple
   * independent operations.
   */
  MULTI_STATUS = 207,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.4.1}
   *
   * @description The 300 (Multiple Choices) status code indicates that the target
   * resource has more than one representation, each with its own more
   * specific identifier, and information about the alternatives is being
   * provided so that the user (or user agent) can select a preferred
   * representation by redirecting its request to one or more of those
   * identifiers.  In other words, the server desires that the user agent
   * engage in reactive negotiation to select the most appropriate
   * representation(s) for its needs.
   */
  MULTIPLE_CHOICES = 300,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.4.2}
   *
   * @description The 301 (Moved Permanently) status code indicates that the target
   * resource has been assigned a new permanent URI and any future
   * references to this resource ought to use one of the enclosed URIs.
   * Clients with link-editing capabilities ought to automatically re-link
   * references to the effective request URI to one or more of the new
   * references sent by the server, where possible.
   */
  MOVED_PERMANENTLY = 301,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.4.3}
   *
   * @description The 302 (Found) status code indicates that the target resource
   * resides temporarily under a different URI.  Since the redirection
   * might be altered on occasion, the client ought to continue to use the
   * effective request URI for future requests.
   */
  MOVED_TEMPORARILY = 302,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.4.4}
   *
   * @description The 303 (See Other) status code indicates that the server is
   * redirecting the user agent to a different resource, as indicated by a
   * URI in the Location header field, which is intended to provide an
   * indirect response to the original request.  A user agent can perform
   * a retrieval request targeting that URI (a GET or HEAD request if
   * using HTTP), which might also be redirected, and present the eventual
   * result as an answer to the original request.  Note that the new URI
   * in the Location header field is not considered equivalent to the
   * effective request URI.
   */
  SEE_OTHER = 303,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7232#section-4.1}
   *
   * @description The 304 (Not Modified) status code indicates that a conditional GET
   * or HEAD request has been received and would have resulted in a 200
   * (OK) response if it were not for the fact that the condition
   * evaluated to false.  In other words, there is no need for the server
   * to transfer a representation of the target resource because the
   * request indicates that the client, which made the request
   * conditional, already has a valid representation; the server is
   * therefore redirecting the client to make use of that stored
   * representation as if it were the payload of a 200 (OK) response.
   */
  NOT_MODIFIED = 304,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.4.5}
   *
   * @description The 305 (Use Proxy) status code was defined in a previous version of
   * this specification and is now deprecated (Appendix B).
   */
  USE_PROXY = 305,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.4.7}
   *
   * @description The 307 (Temporary Redirect) status code indicates that the target
   * resource resides temporarily under a different URI and the user agent
   * MUST NOT change the request method if it performs an automatic
   * redirection to that URI.  Since the redirection can change over time,
   * the client ought to continue using the original effective request URI
   * for future requests.
   */
  TEMPORARY_REDIRECT = 307,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7538#section-3}
   *
   * @description The 308 (Permanent Redirect) status code indicates that the target
   * resource has been assigned a new permanent URI and any future
   * references to this resource ought to use one of the enclosed URIs.
   * Clients with link editing capabilities ought to automatically re-link
   * references to the effective request URI (Section 5.5 of [RFC7230]) to
   * one or more of the new references sent by the server, where possible.
   */
  PERMANENT_REDIRECT = 308,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.1}
   *
   * @description The 400 (Bad Request) status code indicates that the server cannot or
   * will not process the request due to something that is perceived to be
   * a client error (e.g., malformed request syntax, invalid request
   * message framing, or deceptive request routing).
   */
  BAD_REQUEST = 400,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7235#section-3.1}
   *
   * @description The 401 (Unauthorized) status code indicates that the request has not
   * been applied because it lacks valid authentication credentials for
   * the target resource.  The server generating a 401 response MUST send
   * a WWW-Authenticate header field (Section 4.1) containing at least one
   * challenge applicable to the target resource.
   */
  UNAUTHORIZED = 401,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.2}
   *
   * @description The 402 (Payment Required) status code is reserved for future use.
   */
  PAYMENT_REQUIRED = 402,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.3}
   *
   * @description The 403 (Forbidden) status code indicates that the server understood
   * the request but refuses to authorize it.  A server that wishes to
   * make public why the request has been forbidden can describe that
   * reason in the response payload (if any).
   */
  FORBIDDEN = 403,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.4}
   *
   * @description The 404 (Not Found) status code indicates that the origin server did
   * not find a current representation for the target resource or is not
   * willing to disclose that one exists.  A 404 status code does not
   * indicate whether this lack of representation is temporary or
   * permanent; the 410 (Gone) status code is preferred over 404 if the
   * origin server knows, presumably through some configurable means, that
   * the condition is likely to be permanent.
   */
  NOT_FOUND = 404,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.5}
   *
   * @description The 405 (Method Not Allowed) status code indicates that the method
   * received in the request-line is known by the origin server but not
   * supported by the target resource.  The origin server MUST generate an
   * Allow header field in a 405 response containing a list of the target
   * resource's currently supported methods.
   */
  METHOD_NOT_ALLOWED = 405,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.6}
   *
   * @description The 406 (Not Acceptable) status code indicates that the target
   * resource does not have a current representation that would be
   * acceptable to the user agent, according to the proactive negotiation
   * header fields received in the request, and the server
   * is unwilling to supply a default representation.
   */
  NOT_ACCEPTABLE = 406,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7235#section-3.2}
   *
   * @description The 407 (Proxy Authentication Required) status code is similar to 401
   * (Unauthorized), but it indicates that the client needs to
   * authenticate itself in order to use a proxy.  The proxy MUST send a
   * Proxy-Authenticate header field containing a challenge
   * applicable to that proxy for the target resource.  The client MAY
   * repeat the request with a new or replaced Proxy-Authorization header
   * field.
   */
  PROXY_AUTHENTICATION_REQUIRED = 407,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.7}
   *
   * @description The 408 (Request Timeout) status code indicates that the server did
   * not receive a complete request message within the time that it was
   * prepared to wait.  A server SHOULD send the "close" connection option
   * in the response, since 408 implies that the server has decided to close
   * the connection rather than continue waiting.  If the client has an outstanding
   * request in transit, the client MAY repeat that request on a new connection.
   */
  REQUEST_TIMEOUT = 408,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.8}
   *
   * @description The 409 (Conflict) status code indicates that the request could not
   * be completed due to a conflict with the current state of the target
   * resource.  This code is used in situations where the user might be
   * able to resolve the conflict and resubmit the request.  The server
   * SHOULD generate a payload that includes enough information for a user
   * to recognize the source of the conflict.
   */
  CONFLICT = 409,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.9}
   *
   * @description The 410 (Gone) status code indicates that access to the target
   * resource is no longer available at the origin server and that this
   * condition is likely to be permanent.  If the origin server does not
   * know, or has no facility to determine, whether or not the condition
   * is permanent, the status code 404 (Not Found) ought to be used
   * instead.
   */
  GONE = 410,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.10}
   *
   * @description The 411 (Length Required) status code indicates that the server
   * refuses to accept the request without a defined Content-Length.
   * The client MAY repeat the request if it adds a valid Content-Length
   * header field containing the length of the message body in the request message.
   */
  LENGTH_REQUIRED = 411,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7232#section-4.2}
   *
   * @description The 412 (Precondition Failed) status code indicates that one or more
   * conditions given in the request header fields evaluated to false when
   * tested on the server.  This response code allows the client to place
   * preconditions on the current resource state (its current
   * representations and metadata) and, thus, prevent the request method
   * from being applied if the target resource is in an unexpected state.
   */
  PRECONDITION_FAILED = 412,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.11}
   *
   * @description The 413 (Payload Too Large) status code indicates that the server is
   * refusing to process a request because the request payload is larger
   * than the server is willing or able to process.  The server MAY close
   * the connection to prevent the client from continuing the request.
   */
  REQUEST_TOO_LONG = 413,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.12}
   *
   * @description The 414 (URI Too Long) status code indicates that the server is
   * refusing to service the request because the request-target is longer
   * than the server is willing to interpret. This rare condition is only likely to
   * occur when a client has improperly converted a POST request to a GET request
   * with long query information, when the client has descended into a "black hole" of
   * redirection (e.g., a redirected URI prefix that points to a suffix of
   * itself) or when the server is under attack by a client attempting to
   * exploit potential security holes.
   */
  REQUEST_URI_TOO_LONG = 414,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.13}
   *
   * @description The 415 (Unsupported Media Type) status code indicates that the
   * origin server is refusing to service the request because the payload
   * is in a format not supported by this method on the target resource.
   * The format problem might be due to the request's indicated
   * Content-Type or Content-Encoding, or as a result of inspecting the
   * data directly.
   */
  UNSUPPORTED_MEDIA_TYPE = 415,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7233#section-4.4}
   *
   * @description The 416 (Range Not Satisfiable) status code indicates that none of
    the ranges in the request's Range header field overlap
    the current extent of the selected resource or that the set of ranges
    requested has been rejected due to invalid ranges or an excessive
    request of small or overlapping ranges.
   */
  REQUESTED_RANGE_NOT_SATISFIABLE = 416,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.5.14}
   *
   * @description The 417 (Expectation Failed) status code indicates that the
   * expectation given in the request's Expect header field
   * could not be met by at least one of the inbound servers.
   */
  EXPECTATION_FAILED = 417,
  /**
   * @see {@link https://tools.ietf.org/html/rfc2324#section-2.3.2}
   *
   * @description Any attempt to brew coffee with a teapot should result in the error
   * code "418 I'm a teapot". The resulting entity body MAY be short and
   * stout.
   */
  IM_A_TEAPOT = 418,
  /**
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7540#section-9.1.2}
   *
   * @description The 421 (Misdirected Request) status code indicates that the request
   * was directed at a server that is not able to produce a response.
   * This can be sent by a server that is not configured to produce
   * responses for the combination of scheme and authority that are
   * included in the request URI.
   */
  MISDIRECTED_REQUEST = 421,
  /**
   * @see {@link https://tools.ietf.org/html/rfc2518#section-10.3}
   *
   * @description The 422 (Unprocessable Entity) status code means the server
   * understands the content type of the request entity (hence a
   * 415(Unsupported Media Type) status code is inappropriate), and the
   * syntax of the request entity is correct (thus a 400 (Bad Request)
   * status code is inappropriate) but was unable to process the contained
   * instructions.  For example, this error condition may occur if an XML
   * request body contains well-formed (i.e., syntactically correct), but
   * semantically erroneous XML instructions.
   */
  UNPROCESSABLE_ENTITY = 422,
  /**
   * @see {@link https://tools.ietf.org/html/rfc2518#section-10.4}
   *
   * @description The 423 (Locked) status code means the source or destination resource
   * of a method is locked.
   */
  LOCKED = 423,
  /**
   * @see {@link https://tools.ietf.org/html/rfc2518#section-10.5}
   *
   * @description The 424 (Failed Dependency) status code means that the method could
   * not be performed on the resource because the requested action
   * depended on another action and that action failed.  For example, if a
   * command in a PROPPATCH method fails then, at minimum, the rest of the
   * commands will also fail with 424 (Failed Dependency).
   */
  FAILED_DEPENDENCY = 424,
  /**
   * @see {@link https://tools.ietf.org/html/rfc6585#section-3}
   *
   * @description The 428 status code indicates that the origin server requires the
   * request to be conditional.
   */
  PRECONDITION_REQUIRED = 428,
  /**
   * @see {@link https://tools.ietf.org/html/rfc6585#section-4}
   *
   * @description The 429 status code indicates that the user has sent too many
   * requests in a given amount of time ("rate limiting").
   */
  TOO_MANY_REQUESTS = 429,
  /**
   * @see {@link https://tools.ietf.org/html/rfc6585#section-5}
   *
   * @description The 431 status code indicates that the server is unwilling to process
   * the request because its header fields are too large.  The request MAY
   * be resubmitted after reducing the size of the request header fields.
   */
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.6.1}
   *
   * @description The 500 (Internal Server Error) status code indicates that the server
   * encountered an unexpected condition that prevented it from fulfilling
   * the request.
   */
  INTERNAL_SERVER_ERROR = 500,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.6.2}
   *
   * @description The 501 (Not Implemented) status code indicates that the server does
   * not support the functionality required to fulfill the request.  This
   * is the appropriate response when the server does not recognize the
   * request method and is not capable of supporting it for any resource.
   */
  NOT_IMPLEMENTED = 501,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.6.3}
   *
   * @description The 502 (Bad Gateway) status code indicates that the server, while
   * acting as a gateway or proxy, received an invalid response from an
   * inbound server it accessed while attempting to fulfill the request.
   */
  BAD_GATEWAY = 502,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.6.4}
   *
   * @description The 503 (Service Unavailable) status code indicates that the server
   * is currently unable to handle the request due to a temporary overload
   * or scheduled maintenance, which will likely be alleviated after some
   * delay.  The server MAY send a Retry-After header field
   * to suggest an appropriate amount of time for the client to wait
   * before retrying the request.
   */
  SERVICE_UNAVAILABLE = 503,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.6.5}
   *
   * @description The 504 (Gateway Timeout) status code indicates that the server,
   * while acting as a gateway or proxy, did not receive a timely response
   * from an upstream server it needed to access in order to complete the
   * request.
   */
  GATEWAY_TIMEOUT = 504,
  /**
   * @see {@link https://tools.ietf.org/html/rfc7231#section-6.6.6}
   *
   * @description The 505 (HTTP Version Not Supported) status code indicates that the
   * server does not support, or refuses to support, the major version of
   * HTTP that was used in the request message.
   */
  HTTP_VERSION_NOT_SUPPORTED = 505,
  /**
   * @see {@link https://tools.ietf.org/html/rfc2518#section-10.6}
   *
   * @description The 507 (Insufficient Storage) status code means the method could not
   * be performed on the resource because the server is unable to store
   * the representation needed to successfully complete the request.  This
   * condition is considered to be temporary.  If the request which
   * received this status code was the result of a user action, the
   * request MUST NOT be repeated until it is requested by a separate user
   * action.
   */
  INSUFFICIENT_STORAGE = 507,
  /**
   * @see {@link https://tools.ietf.org/html/rfc6585#section-6}
   *
   * @description The 511 status code indicates that the client needs to authenticate
   * to gain network access.
   */
  NETWORK_AUTHENTICATION_REQUIRED = 511
}
