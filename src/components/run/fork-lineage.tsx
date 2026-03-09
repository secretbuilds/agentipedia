import Link from "next/link";
import { GitFork } from "lucide-react";

type ForkLineageProps = {
  readonly forkedFrom: string | null;
};

export function ForkLineage({ forkedFrom }: ForkLineageProps) {
  if (!forkedFrom) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-400">
      <GitFork className="size-4" />
      <span>
        Forked from{" "}
        <Link
          href={`/runs/${forkedFrom}`}
          className="text-neutral-300 underline underline-offset-2 transition-colors hover:text-neutral-100"
        >
          run {forkedFrom.slice(0, 8)}
        </Link>
      </span>
    </div>
  );
}
