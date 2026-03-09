export interface Run {
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
}

export interface RunCard extends Run {
  readonly user: {
    readonly x_handle: string;
    readonly x_display_name: string;
    readonly x_avatar_url: string;
  };
}

export interface RunDetail extends RunCard {
  readonly experiments: readonly Experiment[];
}

export interface RunFormData {
  readonly goal: string;
  readonly hardware: string;
  readonly time_budget: string;
  readonly model_size: string;
  readonly tag_1?: string;
  readonly tag_2?: string;
  readonly forked_from?: string;
  readonly post_to_x?: boolean;
}

// Re-export for convenience
import type { Experiment } from "./experiment";
export type { Experiment };
