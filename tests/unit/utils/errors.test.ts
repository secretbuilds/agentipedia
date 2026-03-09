import { describe, it, expect } from "vitest";
import { AppError, getErrorMessage, getInternalErrorMessage } from "@/lib/utils/errors";

const GENERIC_ERROR = "An unexpected error occurred. Please try again.";

describe("AppError", () => {
  it("creates an error with code and message", () => {
    const error = new AppError("NOT_FOUND", "Hypothesis not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Hypothesis not found");
    expect(error.name).toBe("AppError");
  });

  it("is an instance of Error", () => {
    const error = new AppError("UNAUTHORIZED", "Not authenticated");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it("preserves stack trace", () => {
    const error = new AppError("INTERNAL_ERROR", "Something broke");
    expect(error.stack).toBeDefined();
  });

  it("supports all error codes", () => {
    const codes = [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "VALIDATION_ERROR",
      "RATE_LIMITED",
      "FILE_TOO_LARGE",
      "INVALID_FILE_TYPE",
      "TSV_PARSE_ERROR",
      "STORAGE_ERROR",
      "INTERNAL_ERROR",
    ] as const;

    for (const code of codes) {
      const error = new AppError(code, `Error: ${code}`);
      expect(error.code).toBe(code);
    }
  });
});

describe("getErrorMessage", () => {
  it("extracts message from AppError", () => {
    const error = new AppError("NOT_FOUND", "Run not found");
    expect(getErrorMessage(error)).toBe("Run not found");
  });

  it("returns generic message for standard Error (prevents internal leaks)", () => {
    const error = new Error("connection refused: postgres://...");
    expect(getErrorMessage(error)).toBe(GENERIC_ERROR);
  });

  it("returns generic message for string errors", () => {
    expect(getErrorMessage("something failed")).toBe(GENERIC_ERROR);
  });

  it("returns generic message for null", () => {
    expect(getErrorMessage(null)).toBe(GENERIC_ERROR);
  });

  it("returns generic message for undefined", () => {
    expect(getErrorMessage(undefined)).toBe(GENERIC_ERROR);
  });

  it("returns generic message for numbers", () => {
    expect(getErrorMessage(42)).toBe(GENERIC_ERROR);
  });

  it("returns generic message for objects without message", () => {
    expect(getErrorMessage({ foo: "bar" })).toBe(GENERIC_ERROR);
  });
});

describe("getInternalErrorMessage", () => {
  it("extracts message from standard Error", () => {
    const error = new Error("detailed internal error");
    expect(getInternalErrorMessage(error)).toBe("detailed internal error");
  });

  it("returns string errors directly", () => {
    expect(getInternalErrorMessage("something failed")).toBe("something failed");
  });

  it("returns fallback for unknown types", () => {
    expect(getInternalErrorMessage(42)).toBe("Unknown error");
    expect(getInternalErrorMessage(null)).toBe("Unknown error");
  });
});
