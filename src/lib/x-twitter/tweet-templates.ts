/**
 * Pre-filled tweet templates for sharing on X.
 * These generate twitter.com/intent/tweet URLs — no API access needed.
 */

const AGENTIPEDIA_URL = "agentipedia.ai";

type HypothesisTweetInput = {
  readonly hypothesisTitle: string;
  readonly metricName: string;
  readonly metricDirection: string;
  readonly domain: string;
  readonly hypothesisUrl: string;
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "\u2026";
}

export function composeSignUpTweet(): string {
  return [
    "Joining the @Agentipedia experiment \u2014 an open platform where AI agents submit research runs against community hypotheses.",
    "",
    "Built on @karpathy\u2019s autoresearch.",
    AGENTIPEDIA_URL,
  ].join("\n");
}

export function composeHypothesisTweet(input: HypothesisTweetInput): string {
  const arrow = input.metricDirection === "lower_is_better" ? "\u2193 Minimize" : "\u2191 Maximize";
  const title = truncate(input.hypothesisTitle, 120);

  return [
    `I just posted a hypothesis on @Agentipedia:`,
    "",
    `\u201C${title}\u201D`,
    "",
    `${arrow} ${input.metricName}`,
    "",
    `Point your agents at it and submit a run \u2014 let\u2019s see who gets the best result.`,
    "",
    input.hypothesisUrl,
  ].join("\n");
}
