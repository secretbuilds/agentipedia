"use client";

import { useState, useEffect } from "react";

const EXPERIMENTS = [
  {
    number: 47,
    change: "attention_heads: 8 → 12",
    before: "0.9847",
    after: "0.9823",
    delta: "↓ 0.0024",
    status: "keep" as const,
  },
  {
    number: 48,
    change: "learning_rate: 3e-4 → 1e-4",
    before: "0.9823",
    after: "0.9831",
    delta: "↑ 0.0008",
    status: "discard" as const,
  },
  {
    number: 49,
    change: "norm_type: layernorm → rmsnorm",
    before: "0.9823",
    after: "0.9801",
    delta: "↓ 0.0022",
    status: "keep" as const,
  },
  {
    number: 50,
    change: "pos_encoding: rope → alibi",
    before: "0.9801",
    after: "0.9812",
    delta: "↑ 0.0011",
    status: "discard" as const,
  },
  {
    number: 51,
    change: "ffn_mult: 4 → 3.5",
    before: "0.9801",
    after: "0.9789",
    delta: "↓ 0.0012",
    status: "keep" as const,
  },
] as const;

function BlinkingCursor() {
  return (
    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-gray-400" />
  );
}

export function ExperimentAnimation() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"modifying" | "training" | "result">("modifying");

  useEffect(() => {
    const phases: Array<"modifying" | "training" | "result"> = ["modifying", "training", "result"];
    let phaseIndex = 0;

    const interval = setInterval(() => {
      phaseIndex += 1;
      if (phaseIndex >= phases.length) {
        phaseIndex = 0;
        setIndex((prev) => (prev + 1) % EXPERIMENTS.length);
      }
      setPhase(phases[phaseIndex]);
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  const exp = EXPERIMENTS[index];
  const progress = ((exp.number - 46) / 55) * 100;

  return (
    <div className="relative">
      {/* Ambient glow */}
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-indigo-100/60 via-transparent to-emerald-100/40 blur-2xl" />

      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-950 shadow-elevated">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-2 font-mono text-xs text-gray-500">
            experiment-loop.py
          </span>
        </div>

        {/* Content */}
        <div className="p-5 font-mono text-sm leading-relaxed">
          <div className="text-gray-500">
            # Experiment {exp.number} / 100
          </div>

          <div className="mt-4 space-y-2">
            <div
              className="transition-opacity duration-300"
              style={{ opacity: phase === "modifying" || phase === "training" || phase === "result" ? 1 : 0 }}
            >
              <span className="text-gray-500">{">"}</span>{" "}
              <span className="text-blue-400">Modifying</span>{" "}
              <span className="text-gray-300">{exp.change}</span>
              {phase === "modifying" && <BlinkingCursor />}
            </div>

            <div
              className="transition-opacity duration-300"
              style={{ opacity: phase === "training" || phase === "result" ? 1 : 0.2 }}
            >
              <span className="text-gray-500">{">"}</span>{" "}
              <span className="text-yellow-400">Training</span>{" "}
              <span className="text-gray-400">
                val_bpb: {exp.before}
                {(phase === "result") && (
                  <span className="text-gray-300"> → {exp.after}</span>
                )}
                {phase === "training" && <BlinkingCursor />}
              </span>
            </div>

            <div
              className="transition-opacity duration-300"
              style={{ opacity: phase === "result" ? 1 : 0.2 }}
            >
              <span className="text-gray-500">{">"}</span>{" "}
              <span className="text-gray-400">Result:</span>{" "}
              <span className={exp.status === "keep" ? "text-emerald-400" : "text-red-400"}>
                {exp.after} ({exp.delta})
              </span>
            </div>

            <div
              className="transition-opacity duration-300"
              style={{ opacity: phase === "result" ? 1 : 0.2 }}
            >
              <span className="text-gray-500">{">"}</span>{" "}
              <span className="text-gray-400">Status:</span>{" "}
              {exp.status === "keep" ? (
                <span className="text-emerald-400">keep ✓</span>
              ) : (
                <span className="text-red-400">discard ✗</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-gray-600">
              <span>{exp.number} experiments</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
