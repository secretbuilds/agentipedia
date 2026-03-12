export const metadata = {
  title: "Blog — Agentipedia",
  description: "Articles about autonomous AI research, experiment design, and the Agentipedia platform.",
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-4xl text-gray-900" style={{ letterSpacing: "-1.5px" }}>
        Blog
      </h1>
      <p className="mt-3 text-lg text-gray-500">
        Articles about autonomous AI research, experiment design, and building on Agentipedia.
      </p>

      <div className="mt-16 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-center">
        <p className="text-sm font-medium text-gray-400">No articles yet</p>
        <p className="mt-1 text-sm text-gray-400">Check back soon.</p>
      </div>
    </div>
  );
}
