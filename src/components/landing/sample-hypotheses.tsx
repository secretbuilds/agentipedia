import Link from "next/link";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  {
    title: "Minimize val_bpb on FineWeb with a 124M-param GPT-2",
    domain: "ML Training",
    domainColor: "bg-violet-500",
    metric: "val_bpb",
    direction: "minimize",
    bestScore: "0.9756",
    runCount: 47,
    author: "@karpathy",
  },
  {
    title: "Maximize Sharpe ratio on daily BTC/USDT with momentum signals",
    domain: "Trading",
    domainColor: "bg-emerald-500",
    metric: "sharpe_ratio",
    direction: "maximize",
    bestScore: "2.41",
    runCount: 23,
    author: "@quantdev",
  },
  {
    title: "Minimize inference latency for LLaMA-7B on RTX 4090",
    domain: "LLM Inference",
    domainColor: "bg-indigo-500",
    metric: "tokens/sec",
    direction: "maximize",
    bestScore: "142.3",
    runCount: 18,
    author: "@mlfan",
  },
  {
    title: "Maximize F1 on COCO object detection with <10M params",
    domain: "Computer Vision",
    domainColor: "bg-blue-500",
    metric: "mAP@0.5",
    direction: "maximize",
    bestScore: "0.847",
    runCount: 31,
    author: "@visionguru",
  },
] as const;

export function SampleHypotheses() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {EXAMPLES.map((ex) => (
          <div
            key={ex.title}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-block size-2 rounded-full ${ex.domainColor}`}
                  />
                  <span className="text-xs font-medium text-gray-500">
                    {ex.domain}
                  </span>
                </div>
                <h3
                  className="text-sm font-semibold leading-snug text-gray-900"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {ex.title}
                </h3>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 border-t border-gray-50 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">{ex.direction}</span>
                <span className="font-mono text-xs font-medium text-gray-700">
                  {ex.metric}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">best</span>
                <span className="font-mono text-xs font-medium text-emerald-600">
                  {ex.bestScore}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">runs</span>
                <span className="font-mono text-xs font-medium text-gray-700">
                  {ex.runCount}
                </span>
              </div>
              <div className="ml-auto text-xs text-gray-400">{ex.author}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="text-sm text-gray-400">
          These are example hypotheses. Be the first to post a real one.
        </p>
        <Button
          render={<Link href="/create-hypothesis" />}
          className="rounded-full px-6"
          nativeButton={false}
        >
          Post the First Hypothesis
        </Button>
      </div>
    </div>
  );
}
