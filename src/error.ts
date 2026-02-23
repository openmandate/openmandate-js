export class OpenMandateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenMandateError";
  }
}

export class APIError extends OpenMandateError {
  readonly statusCode: number;
  readonly code: string | null;
  readonly details: unknown[] | null;
  readonly headers: Record<string, string>;
  readonly requestID: string | null;

  constructor(
    message: string,
    options: {
      statusCode: number;
      code?: string | null;
      details?: unknown[] | null;
      headers?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = "APIError";
    this.statusCode = options.statusCode;
    this.code = options.code ?? null;
    this.details = options.details ?? null;
    this.headers = options.headers ?? {};
    this.requestID =
      options.headers?.["x-request-id"] ??
      options.headers?.["x-amzn-requestid"] ??
      null;
  }
}

export class BadRequestError extends APIError {
  constructor(message = "The request was invalid.", code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode: 400, code, details, headers });
    this.name = "BadRequestError";
  }
}

export class AuthenticationError extends APIError {
  constructor(message = "Invalid API key or missing authentication.", code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode: 401, code, details, headers });
    this.name = "AuthenticationError";
  }
}

export class PermissionDeniedError extends APIError {
  constructor(message = "You don't have permission to access this resource.", code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode: 403, code, details, headers });
    this.name = "PermissionDeniedError";
  }
}

export class NotFoundError extends APIError {
  constructor(message = "The requested resource was not found.", code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode: 404, code, details, headers });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends APIError {
  constructor(message = "The request conflicts with the current state of the resource.", code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode: 409, code, details, headers });
    this.name = "ConflictError";
  }
}

export class ValidationError extends APIError {
  constructor(message = "The request body failed validation.", code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode: 422, code, details, headers });
    this.name = "ValidationError";
  }
}

export class RateLimitError extends APIError {
  constructor(message = "Rate limit exceeded. Please slow down.", code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode: 429, code, details, headers });
    this.name = "RateLimitError";
  }
}

export class InternalServerError extends APIError {
  constructor(message = "The server encountered an internal error.", statusCode = 500, code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) {
    super(message, { statusCode, code, details, headers });
    this.name = "InternalServerError";
  }
}

export class APIConnectionError extends OpenMandateError {
  constructor(message = "Failed to connect to the OpenMandate API.") {
    super(message);
    this.name = "APIConnectionError";
  }
}

export class APITimeoutError extends APIConnectionError {
  constructor(message = "Request to the OpenMandate API timed out.") {
    super(message);
    this.name = "APITimeoutError";
  }
}

const STATUS_CODE_TO_ERROR: Record<number, new (message: string, code?: string | null, details?: unknown[] | null, headers?: Record<string, string>) => APIError> = {
  400: BadRequestError,
  401: AuthenticationError,
  403: PermissionDeniedError,
  404: NotFoundError,
  409: ConflictError,
  422: ValidationError,
  429: RateLimitError,
};

export function makeAPIError(
  statusCode: number,
  body: Record<string, unknown> | null,
  headers?: Record<string, string>,
): APIError {
  const errorBody = (body?.error ?? {}) as { message?: string; code?: string; details?: unknown[] };
  const message = errorBody.message ?? `HTTP ${statusCode} error`;
  const code = errorBody.code ?? null;
  const details = errorBody.details ?? null;

  const ErrorClass = STATUS_CODE_TO_ERROR[statusCode];
  if (ErrorClass) {
    return new ErrorClass(message, code, details, headers);
  }

  if (statusCode >= 500) {
    return new InternalServerError(message, statusCode, code, details, headers);
  }

  return new APIError(message, { statusCode, code, details, headers });
}
