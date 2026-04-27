/** Base class for Atmosphere transport failures (public XRPC, proxy, relay, or auth). */
export class TransportError extends Error {
  readonly status: number;
  readonly body?: string;
  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'TransportError';
    this.status = status;
    this.body = body;
  }
}

export class NotFoundError extends TransportError {
  constructor(message = 'Not found', body?: string) {
    super(message, 404, body);
    this.name = 'NotFoundError';
  }
}

export class RateLimitedError extends TransportError {
  constructor(message = 'Rate limited', body?: string) {
    super(message, 429, body);
    this.name = 'RateLimitedError';
  }
}

export class AuthNotImplementedError extends Error {
  constructor(message = 'Authenticated transport is not implemented yet') {
    super(message);
    this.name = 'AuthNotImplementedError';
  }
}

export class NotImplementedError extends Error {
  constructor(message = 'Not implemented') {
    super(message);
    this.name = 'NotImplementedError';
  }
}
