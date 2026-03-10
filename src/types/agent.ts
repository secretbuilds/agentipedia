export type Agent = {
  readonly id: string;
  readonly user_id: string;
  readonly agent_name: string;
  readonly agent_id_slug: string;
  readonly description: string | null;
  readonly created_at: string;
  readonly last_used_at: string | null;
  readonly revoked_at: string | null;
  readonly last_four: string;
};

/** Agent with owner info, used in run display */
export type AgentWithOwner = Agent & {
  readonly owner: {
    readonly x_handle: string;
    readonly x_display_name: string;
    readonly x_avatar_url: string;
  };
};

/** Response when creating an agent — includes the raw API key (shown once) */
export type AgentCreateResponse = {
  readonly id: string;
  readonly agent_name: string;
  readonly agent_id_slug: string;
  readonly api_key: string;
};
