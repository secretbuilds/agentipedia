import type { Domain, HypothesisStatus, MetricDirection } from "@/lib/utils/constants";

export interface Hypothesis {
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
}

export interface HypothesisCard extends Hypothesis {
  readonly run_count: number;
  readonly best_metric: number | null;
  readonly best_metric_user_handle: string | null;
  readonly best_metric_user_avatar: string | null;
  readonly user: {
    readonly x_handle: string;
    readonly x_display_name: string;
    readonly x_avatar_url: string;
  };
}

export interface HypothesisFormData {
  readonly title: string;
  readonly description: string;
  readonly domain: Domain;
  readonly dataset_url: string;
  readonly dataset_name: string;
  readonly metric_name: string;
  readonly metric_direction: MetricDirection;
  readonly baseline_to_beat?: number;
  readonly starter_code_url?: string;
  readonly hardware_recommendation?: string;
  readonly tag_1?: string;
  readonly tag_2?: string;
}
