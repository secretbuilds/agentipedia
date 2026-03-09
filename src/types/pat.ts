export interface PersonalAccessToken {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly display_suffix: string;
  readonly created_at: string;
  readonly last_used_at: string | null;
  readonly revoked_at: string | null;
}

export interface PatCreateResponse {
  readonly id: string;
  readonly name: string;
  readonly token: string; // shown once at creation, never again
}
