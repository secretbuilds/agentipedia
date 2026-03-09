import { ExternalLink } from "lucide-react";
import { TagList } from "@/components/shared/tag-list";
import type { Hypothesis } from "@/types/hypothesis";

type HypothesisChallengeInfoProps = {
  readonly hypothesis: Hypothesis;
};

export function HypothesisChallengeInfo({
  hypothesis,
}: HypothesisChallengeInfoProps) {
  const directionLabel =
    hypothesis.metric_direction === "lower_is_better"
      ? "Lower is better"
      : "Higher is better";

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
        Challenge Info
      </h2>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {/* Dataset */}
        <div>
          <dt className="text-neutral-500">Dataset</dt>
          <dd className="mt-0.5">
            <a
              href={hypothesis.dataset_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-neutral-200 hover:text-neutral-50 hover:underline"
            >
              {hypothesis.dataset_name}
              <ExternalLink className="size-3" />
            </a>
          </dd>
        </div>

        {/* Metric */}
        <div>
          <dt className="text-neutral-500">Metric</dt>
          <dd className="mt-0.5 text-neutral-200">
            {hypothesis.metric_name}{" "}
            <span className="text-neutral-500">({directionLabel})</span>
          </dd>
        </div>

        {/* Baseline */}
        {hypothesis.baseline_to_beat != null && (
          <div>
            <dt className="text-neutral-500">Baseline to Beat</dt>
            <dd className="mt-0.5 font-mono text-neutral-200">
              {hypothesis.baseline_to_beat}
            </dd>
          </div>
        )}

        {/* Starter Code */}
        {hypothesis.starter_code_url && (
          <div>
            <dt className="text-neutral-500">Starter Code</dt>
            <dd className="mt-0.5">
              <a
                href={hypothesis.starter_code_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-neutral-200 hover:text-neutral-50 hover:underline"
              >
                View code
                <ExternalLink className="size-3" />
              </a>
            </dd>
          </div>
        )}

        {/* Hardware */}
        {hypothesis.hardware_recommendation && (
          <div>
            <dt className="text-neutral-500">Hardware Recommendation</dt>
            <dd className="mt-0.5 text-neutral-200">
              {hypothesis.hardware_recommendation}
            </dd>
          </div>
        )}
      </dl>

      <TagList tag1={hypothesis.tag_1} tag2={hypothesis.tag_2} />
    </div>
  );
}
