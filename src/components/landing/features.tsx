import { AnimateIn } from "@/components/landing/animate-in";

const FEATURES = [
  {
    title: "Structured results, not blog posts",
    description:
      "Every run produces a results.tsv with per-experiment metrics and an evolved code file. Reproducible data you can build on — not opinions.",
    badge: "results.tsv",
    visual: (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white font-mono text-xs">
        <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-gray-500">
          results.tsv
        </div>
        <div className="space-y-0 divide-y divide-gray-50 px-3 py-2">
          <div className="flex gap-4 py-1">
            <span className="w-8 text-gray-400">47</span>
            <span className="text-emerald-600">0.9823</span>
            <span className="text-gray-500">keep</span>
            <span className="text-gray-400 truncate">add rotary embeddings</span>
          </div>
          <div className="flex gap-4 py-1">
            <span className="w-8 text-gray-400">48</span>
            <span className="text-red-500">0.9831</span>
            <span className="text-gray-500">discard</span>
            <span className="text-gray-400 truncate">reduce learning rate</span>
          </div>
          <div className="flex gap-4 py-1">
            <span className="w-8 text-gray-400">49</span>
            <span className="text-emerald-600">0.9801</span>
            <span className="text-gray-500">keep</span>
            <span className="text-gray-400 truncate">switch to rmsnorm</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Fork and improve",
    description:
      "Start from a proven train.py that already beats the baseline. Push the metric further. Every run is forkable — the best ideas propagate automatically.",
    badge: "fork",
    visual: (
      <div className="space-y-2">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-gray-100" />
              <span className="text-sm text-gray-700">@karpathy</span>
            </div>
            <span className="font-mono text-sm text-emerald-600">0.9801</span>
          </div>
        </div>
        <div className="flex justify-center">
          <svg className="size-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-indigo-100" />
              <span className="text-sm text-gray-700">@you</span>
            </div>
            <span className="font-mono text-sm font-medium text-indigo-600">0.9756</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">forked from @karpathy</p>
        </div>
      </div>
    ),
  },
  {
    title: "Compare across context",
    description:
      "Filter by hardware, dataset, model size, and time budget. Every run includes full context metadata so you compare apples to apples.",
    badge: "context",
    visual: (
      <div className="flex flex-wrap gap-2">
        {["H100", "M4 Mac", "RTX 4090"].map((hw) => (
          <span key={hw} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
            {hw}
          </span>
        ))}
        {["FineWeb", "The Stack", "PubMed"].map((ds) => (
          <span key={ds} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
            {ds}
          </span>
        ))}
        {["50M params", "5 min budget"].map((ctx) => (
          <span key={ctx} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
            {ctx}
          </span>
        ))}
      </div>
    ),
  },
] as const;

export function Features() {
  return (
    <section className="border-t border-gray-100 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
              Built for researchers
            </p>
            <h2
              className="mt-3 font-serif text-3xl text-gray-900 sm:text-4xl"
              style={{ letterSpacing: "-1.5px" }}
            >
              Real data. Real code. Real progress.
            </h2>
          </div>
        </AnimateIn>

        <div className="mt-16 space-y-12">
          {FEATURES.map((feature, i) => (
            <AnimateIn key={feature.title} delay={i * 80}>
              <div className="grid items-center gap-8 rounded-2xl bg-white p-6 shadow-card transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 sm:p-8 lg:grid-cols-2 lg:gap-12">
                <div className={`space-y-4 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                  <h3
                    className="text-xl font-semibold text-gray-900"
                    style={{ letterSpacing: "-0.5px" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {feature.description}
                  </p>
                </div>
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                  {feature.visual}
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
