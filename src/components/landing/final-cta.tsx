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
                render={<Link href="/create-hypothesis" />}
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
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
