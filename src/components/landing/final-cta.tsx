import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimateIn } from "@/components/landing/animate-in";

export function FinalCTA() {
  return (
    <section className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn>
          <div className="text-center">
            <h2
              className="font-serif text-3xl text-gray-900 sm:text-4xl"
              style={{ letterSpacing: "-1.5px" }}
            >
              Your overnight experiments
              <br />
              deserve to compound.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-gray-500">
              Join researchers posting hypotheses and submitting runs across ML
              training, quant trading, robotics, and more.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                render={<Link href="/hypotheses/new" />}
                className="h-11 rounded-full px-6 text-base transition-transform hover:scale-105"
                nativeButton={false}
              >
                Post Your First Hypothesis
              </Button>
              <Button
                render={<Link href="#feed" />}
                variant="outline"
                className="h-11 rounded-full px-6 text-base transition-transform hover:scale-105"
                nativeButton={false}
              >
                Explore the Feed
              </Button>
            </div>
            <a
              href="https://x.com/agentipedia"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-900"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Follow @agentipedia
            </a>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
