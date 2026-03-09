"use client";

import { useActionState } from "react";
import { DOMAINS, METRIC_DIRECTIONS } from "@/lib/utils/constants";
import {
  createHypothesis,
  type HypothesisActionState,
} from "@/lib/actions/hypothesis-actions";

const initialState: HypothesisActionState = {
  success: false,
};

export function HypothesisForm() {
  const [state, formAction, pending] = useActionState(
    createHypothesis,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g., Improve GPT-2 validation perplexity on OpenWebText"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {state.errors?.title && (
          <p className="mt-1 text-xs text-red-400">{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          placeholder="Describe the research challenge, constraints, and what counts as progress..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {state.errors?.description && (
          <p className="mt-1 text-xs text-red-400">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="domain" className="block text-sm font-medium">
            Domain
          </label>
          <select
            id="domain"
            name="domain"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select domain</option>
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {state.errors?.domain && (
            <p className="mt-1 text-xs text-red-400">
              {state.errors.domain[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="metric_direction"
            className="block text-sm font-medium"
          >
            Metric direction
          </label>
          <select
            id="metric_direction"
            name="metric_direction"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select direction</option>
            {METRIC_DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {state.errors?.metric_direction && (
            <p className="mt-1 text-xs text-red-400">
              {state.errors.metric_direction[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="dataset_url" className="block text-sm font-medium">
            Dataset URL
          </label>
          <input
            id="dataset_url"
            name="dataset_url"
            type="url"
            required
            placeholder="https://huggingface.co/datasets/..."
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {state.errors?.dataset_url && (
            <p className="mt-1 text-xs text-red-400">
              {state.errors.dataset_url[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="dataset_name" className="block text-sm font-medium">
            Dataset name
          </label>
          <input
            id="dataset_name"
            name="dataset_name"
            type="text"
            required
            placeholder="OpenWebText"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {state.errors?.dataset_name && (
            <p className="mt-1 text-xs text-red-400">
              {state.errors.dataset_name[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="metric_name" className="block text-sm font-medium">
            Metric name
          </label>
          <input
            id="metric_name"
            name="metric_name"
            type="text"
            required
            placeholder="val_bpb"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {state.errors?.metric_name && (
            <p className="mt-1 text-xs text-red-400">
              {state.errors.metric_name[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="baseline_to_beat"
            className="block text-sm font-medium"
          >
            Baseline to beat (optional)
          </label>
          <input
            id="baseline_to_beat"
            name="baseline_to_beat"
            type="number"
            step="any"
            placeholder="1.0875"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="starter_code_url"
          className="block text-sm font-medium"
        >
          Starter code URL (optional)
        </label>
        <input
          id="starter_code_url"
          name="starter_code_url"
          type="url"
          placeholder="https://github.com/..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="hardware_recommendation"
          className="block text-sm font-medium"
        >
          Hardware recommendation (optional)
        </label>
        <input
          id="hardware_recommendation"
          name="hardware_recommendation"
          type="text"
          placeholder="1x A100 80GB, ~4 hours"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tag_1" className="block text-sm font-medium">
            Tag 1 (optional)
          </label>
          <input
            id="tag_1"
            name="tag_1"
            type="text"
            placeholder="attention"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="tag_2" className="block text-sm font-medium">
            Tag 2 (optional)
          </label>
          <input
            id="tag_2"
            name="tag_2"
            type="text"
            placeholder="optimization"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create Hypothesis"}
      </button>
    </form>
  );
}
