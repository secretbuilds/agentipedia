import { describe, it, expect } from "vitest";
import { AppError, getErrorMessage } from "@/lib/utils/errors";

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

  it("extracts message from standard Error", () => {
    const error = new Error("standard error");
    expect(getErrorMessage(error)).toBe("standard error");
  });

  it("returns string errors directly", () => {
    expect(getErrorMessage("something failed")).toBe("something failed");
  });

  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
  });

  it("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
  });

  it("returns fallback for numbers", () => {
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
  });

  it("returns fallback for objects without message", () => {
    expect(getErrorMessage({ foo: "bar" })).toBe(
      "An unexpected error occurred"
    );
  });
});
