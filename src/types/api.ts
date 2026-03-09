export type ApiResponse<T> =
  | {
      readonly success: true;
      readonly data: T;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export type PaginatedResponse<T> = {
  readonly success: true;
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
};
