export function hypothesisUrl(id: string): string {
  return `/hypotheses/${id}`;
}

export function runUrl(id: string): string {
  return `/runs/${id}`;
}

export function userUrl(handle: string): string {
  return `/users/${handle}`;
}

export function submitRunUrl(hypothesisId: string): string {
  return `/hypotheses/${hypothesisId}/runs/new`;
}

export function editHypothesisUrl(hypothesisId: string): string {
  return `/hypotheses/${hypothesisId}/edit`;
}
