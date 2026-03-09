import type { ExperimentStatus } from "@/lib/utils/constants";

export type Experiment = {
  readonly id: string;
  readonly run_id: string;
  readonly sequence: number;
  readonly commit_hash: string;
  readonly metric_value: number;
  readonly memory_gb: number;
  readonly status: ExperimentStatus;
  readonly description: string;
};

export type ParsedTsvRow = {
  readonly commit: string;
  readonly metric_value: number;
  readonly memory_gb: number;
  readonly status: ExperimentStatus;
  readonly description: string;
};

export type TsvStats = {
  readonly baseline_metric: number;
  readonly best_metric: number;
  readonly best_description: string;
  readonly num_experiments: number;
  readonly num_kept: number;
  readonly num_discarded: number;
  readonly num_crashed: number;
  readonly improvement_pct: number;
};
