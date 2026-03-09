export type PersonalAccessToken = {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly created_at: string;
  readonly last_used_at: string | null;
  readonly revoked_at: string | null;
  readonly last_four: string;
};

export type PatCreateResponse = {
  readonly id: string;
  readonly name: string;
  readonly token: string;
};
