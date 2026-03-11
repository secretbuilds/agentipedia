// ---------------------------------------------------------------------------
// Shared action response types
// ---------------------------------------------------------------------------

export type ActionSuccess<T = void> = {
  readonly success: true;
  readonly data: T;
};

export type ActionFailure = {
  readonly success: false;
  readonly error: string;
};

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;
