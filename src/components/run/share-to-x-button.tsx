"use client";

import { composeTweetText } from "@/lib/x-twitter/compose-tweet-text";
import { TweetIntentButton } from "@/components/shared/tweet-intent-button";
import type { RunDetail } from "@/types/run";

type ShareToXButtonProps = {
  readonly run: RunDetail;
  readonly appUrl: string;
};

export function ShareToXButton({ run, appUrl }: ShareToXButtonProps) {
  const tweetText = composeTweetText({
    hypothesisTitle: run.hypothesis_title,
    baselineMetric: run.baseline_metric,
    bestMetric: run.best_metric,
    improvementPct: run.improvement_pct,
    metricName: run.hypothesis_metric_name,
    metricDirection: run.hypothesis_metric_direction,
    numExperiments: run.num_experiments,
    runUrl: `${appUrl}/runs/${run.id}`,
  });

  return <TweetIntentButton tweetText={tweetText} />;
}
