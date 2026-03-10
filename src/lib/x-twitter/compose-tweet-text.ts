/**
 * Composes tweet text from run data.
 *
 * X/Twitter counts all URLs as 23 characters (t.co shortener).
 * Total limit is 280 characters.
 */

const T_CO_LENGTH = 23;
const TWEET_LIMIT = 280;

type ComposeTweetInput = {
  readonly hypothesisTitle: string;
  readonly baselineMetric: number;
  readonly bestMetric: number;
  readonly improvementPct: number;
  readonly metricName: string;
  readonly metricDirection: string;
  readonly numExperiments: number;
  readonly runUrl: string;
};

function formatMetricValue(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(4);
}

function truncateToFit(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "\u2026";
}

export function composeTweetText(input: ComposeTweetInput): string {
  const arrow = input.metricDirection === "lower_is_better" ? "\u2193" : "\u2191";
  const baseline = formatMetricValue(input.baselineMetric);
  const best = formatMetricValue(input.bestMetric);
  const improvement = Math.abs(input.improvementPct).toFixed(1);

  // The URL will be shortened to T_CO_LENGTH by X, plus a space before it
  const urlSlot = T_CO_LENGTH + 1;

  // Build the tweet body (without URL)
  const parts = [
    `${arrow} ${baseline} \u2192 ${best} ${input.metricName} (${improvement}% improvement)`,
    `${input.numExperiments} experiments`,
  ];

  const body = parts.join(" \u00B7 ");
  const maxTitleLength = TWEET_LIMIT - urlSlot - body.length - 3; // 3 = newline + newline + spacing

  const title = truncateToFit(input.hypothesisTitle, Math.max(20, maxTitleLength));

  return `${title}\n\n${body}\n\n${input.runUrl}`;
}
