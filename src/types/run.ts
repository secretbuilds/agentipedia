import type { UserSummary } from "./user";

export type Run = {
  readonly id: string;
  readonly hypothesis_id: string;
  readonly user_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly goal: string;
  readonly hardware: string;
  readonly time_budget: string;
  readonly model_size: string;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
  readonly forked_from: string | null;
  readonly baseline_metric: number;
  readonly best_metric: number;
  readonly best_description: string;
  readonly num_experiments: number;
  readonly num_kept: number;
  readonly num_discarded: number;
  readonly num_crashed: number;
  readonly improvement_pct: number;
  readonly results_tsv_url: string;
  readonly code_file_url: string;
  readonly code_filename: string;
};

export type RunCard = Run & {
  readonly user: UserSummary;
};

export type RunDetail = Run & {
  readonly user: UserSummary;
  readonly hypothesis_title: string;
  readonly hypothesis_metric_name: string;
  readonly hypothesis_metric_direction: string;
  readonly hypothesis_domain: string;
};

export type RunFormData = {
  readonly goal: string;
  readonly hardware: string;
  readonly time_budget: string;
  readonly model_size: string;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
  readonly forked_from: string | null;
};
