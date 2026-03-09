export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "TSV_PARSE_ERROR"
  | "STORAGE_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

const GENERIC_ERROR = "An unexpected error occurred. Please try again.";

/**
 * Extract a user-safe error message.
 *
 * Only returns specific messages for AppError (intentionally user-facing).
 * All other errors return a generic message to avoid leaking server internals.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  return GENERIC_ERROR;
}

/**
 * Extract the full error detail for server-side logging only.
 * NEVER send the result of this function to clients.
 */
export function getInternalErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
