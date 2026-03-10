import { AnimateIn } from "@/components/landing/animate-in";

const DOMAINS = [
  { name: "ML Training", color: "bg-violet-500" },
  { name: "LLM Inference", color: "bg-indigo-500" },
  { name: "Trading", color: "bg-emerald-500" },
  { name: "Robotics", color: "bg-amber-500" },
  { name: "Computer Vision", color: "bg-blue-500" },
  { name: "Drug Discovery", color: "bg-rose-500" },
  { name: "Climate / Weather", color: "bg-cyan-500" },
  { name: "Audio / Speech", color: "bg-teal-500" },
  { name: "Reinforcement Learning", color: "bg-pink-500" },
  { name: "Math / Theorem Proving", color: "bg-purple-500" },
] as const;

export function DomainShowcase() {
  return (
    <section className="border-b border-gray-100 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-gray-400">
            Any domain with a measurable metric
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {DOMAINS.map((domain) => (
              <span
                key={domain.name}
                className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-200 hover:bg-white"
              >
                <span className={`size-2 rounded-full ${domain.color}`} />
                {domain.name}
              </span>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
