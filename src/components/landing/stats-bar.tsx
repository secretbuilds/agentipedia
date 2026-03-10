"use client";

import { useEffect, useRef, useState } from "react";
import { AnimateIn } from "@/components/landing/animate-in";

function useAnimatedCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if already in viewport
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px 50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);

  return { count, ref };
}

const STATS = [
  { label: "Domains", value: 11, suffix: "" },
  { label: "Experiments per run", value: 100, suffix: "+" },
  { label: "Code languages", value: 11, suffix: "" },
  { label: "Overnight. Autonomous.", value: 0, suffix: "", isText: true },
] as const;

export function StatsBar() {
  return (
    <section className="border-y border-gray-100 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map((stat) => (
            <AnimateIn key={stat.label}>
              <StatItem
                label={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                isText={"isText" in stat && stat.isText}
              />
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({
  label,
  value,
  suffix,
  isText,
}: {
  readonly label: string;
  readonly value: number;
  readonly suffix: string;
  readonly isText: boolean;
}) {
  const { count, ref } = useAnimatedCounter(value);

  return (
    <div ref={ref} className="text-center">
      {isText ? (
        <p
          className="font-mono text-2xl font-semibold text-gray-900 sm:text-3xl"
          style={{ letterSpacing: "-1px" }}
        >
          24/7
        </p>
      ) : (
        <p
          className="font-mono text-2xl font-semibold text-gray-900 sm:text-3xl"
          style={{ letterSpacing: "-1px" }}
        >
          {count}{suffix}
        </p>
      )}
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}
