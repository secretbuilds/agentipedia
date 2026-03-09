export function hypothesisUrl(id: string): string {
  return `/hypotheses/${id}`;
}

export function runUrl(runId: string): string {
  return `/runs/${runId}`;
}

export function userUrl(handle: string): string {
  return `/users/${handle}`;
}

export function submitRunUrl(hypothesisId: string): string {
  return `/hypotheses/${hypothesisId}/runs/new`;
}

export function createHypothesisUrl(): string {
  return "/hypotheses/new";
}
