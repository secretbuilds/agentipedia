import type { Domain, HypothesisStatus, MetricDirection } from "@/lib/utils/constants";
import type { UserSummary } from "./user";

export type Hypothesis = {
  readonly id: string;
  readonly user_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly title: string;
  readonly description: string;
  readonly domain: Domain;
  readonly dataset_url: string;
  readonly dataset_name: string;
  readonly metric_name: string;
  readonly metric_direction: MetricDirection;
  readonly baseline_to_beat: number | null;
  readonly starter_code_url: string | null;
  readonly starter_code_file_url: string | null;
  readonly hardware_recommendation: string | null;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
  readonly status: HypothesisStatus;
};

export type HypothesisCard = Hypothesis & {
  readonly user: UserSummary;
  readonly run_count: number;
  readonly best_run: {
    readonly best_metric: number;
    readonly user_handle: string;
  } | null;
};

export type HypothesisFormData = {
  readonly title: string;
  readonly description: string;
  readonly domain: Domain;
  readonly dataset_url: string;
  readonly dataset_name: string;
  readonly metric_name: string;
  readonly metric_direction: MetricDirection;
  readonly baseline_to_beat: number | null;
  readonly starter_code_url: string | null;
  readonly hardware_recommendation: string | null;
  readonly tag_1: string | null;
  readonly tag_2: string | null;
};
