export { OpenMandate } from "./client.js";
export type { OpenMandateOptions } from "./client.js";

export {
  OpenMandateError,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APITimeoutError,
} from "./error.js";

export { Page } from "./pagination.js";
export { PagePromise } from "./page-promise.js";

export type {
  Mandate,
  MandateStatus,
  CloseReason,
  Match,
  MatchStatus,
  Contact,
  Question,
  QuestionOption,
  QuestionConstraints,
  IntakeAnswer,
  Compatibility,
  Strength,
  Concern,
  ContactParam,
  AnswerParam,
  CorrectionParam,
} from "./types.js";
