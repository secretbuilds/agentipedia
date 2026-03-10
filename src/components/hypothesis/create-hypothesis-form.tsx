"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBanner } from "@/components/shared/error-banner";
import { hypothesisSchema } from "@/lib/validators/hypothesis-schema";
import { DOMAINS, METRIC_DIRECTIONS } from "@/lib/utils/constants";
import { createHypothesis, updateHypothesis } from "@/lib/actions/hypothesis-actions";
import { hypothesisUrl } from "@/lib/utils/url";
import type { HypothesisFormData } from "@/types/hypothesis";

type FieldErrors = Partial<Record<keyof HypothesisFormData, string>>;

type CreateHypothesisFormProps = {
  readonly initialData?: HypothesisFormData & { readonly id: string };
  readonly mode?: "create" | "edit";
};

const DIRECTION_OPTIONS = [
  { value: "lower_is_better", label: "Lower is better" },
  { value: "higher_is_better", label: "Higher is better" },
] as const;

export function CreateHypothesisForm({
  initialData,
  mode = "create",
}: CreateHypothesisFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [domain, setDomain] = useState(initialData?.domain ?? "");
  const [datasetUrl, setDatasetUrl] = useState(initialData?.dataset_url ?? "");
  const [datasetName, setDatasetName] = useState(initialData?.dataset_name ?? "");
  const [metricName, setMetricName] = useState(initialData?.metric_name ?? "");
  const [metricDirection, setMetricDirection] = useState(
    initialData?.metric_direction ?? "lower_is_better",
  );
  const [baselineToBeat, setBaselineToBeat] = useState(
    initialData?.baseline_to_beat?.toString() ?? "",
  );
  const [starterCodeUrl, setStarterCodeUrl] = useState(
    initialData?.starter_code_url ?? "",
  );
  const [hardwareRecommendation, setHardwareRecommendation] = useState(
    initialData?.hardware_recommendation ?? "",
  );
  const [tag1, setTag1] = useState(initialData?.tag_1 ?? "");
  const [tag2, setTag2] = useState(initialData?.tag_2 ?? "");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const formData = {
      title,
      description,
      domain,
      dataset_url: datasetUrl,
      dataset_name: datasetName,
      metric_name: metricName,
      metric_direction: metricDirection,
      baseline_to_beat: baselineToBeat ? Number(baselineToBeat) : null,
      starter_code_url: starterCodeUrl || null,
      hardware_recommendation: hardwareRecommendation || null,
      tag_1: tag1 || null,
      tag_2: tag2 || null,
    };

    const parsed = hypothesisSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof HypothesisFormData;
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateHypothesis(initialData.id, parsed.data as unknown as HypothesisFormData)
          : await createHypothesis(parsed.data as unknown as HypothesisFormData);

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      if (mode === "edit" && initialData) {
        router.push(hypothesisUrl(initialData.id));
      } else if ("data" in result && result.data) {
        router.push(hypothesisUrl(result.data.id));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && <ErrorBanner message={serverError} />}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Beat GPT-4 on MMLU with a 7B parameter model"
          aria-invalid={!!fieldErrors.title}
        />
        {fieldErrors.title && (
          <p className="text-xs text-red-400">{fieldErrors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the research challenge, constraints, and what success looks like..."
          rows={5}
          aria-invalid={!!fieldErrors.description}
        />
        {fieldErrors.description && (
          <p className="text-xs text-red-400">{fieldErrors.description}</p>
        )}
      </div>

      {/* Domain */}
      <div className="space-y-2">
        <Label>Domain *</Label>
        <Select value={domain} onValueChange={(v) => setDomain(v ?? "")}>
          <SelectTrigger
            className="w-full"
            aria-invalid={!!fieldErrors.domain}
          >
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.domain && (
          <p className="text-xs text-red-400">{fieldErrors.domain}</p>
        )}
      </div>

      {/* Dataset URL + Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dataset_url">Dataset URL *</Label>
          <Input
            id="dataset_url"
            type="url"
            value={datasetUrl}
            onChange={(e) => setDatasetUrl(e.target.value)}
            placeholder="https://huggingface.co/datasets/..."
            aria-invalid={!!fieldErrors.dataset_url}
          />
          {fieldErrors.dataset_url && (
            <p className="text-xs text-red-400">{fieldErrors.dataset_url}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataset_name">Dataset Name *</Label>
          <Input
            id="dataset_name"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g. MMLU"
            aria-invalid={!!fieldErrors.dataset_name}
          />
          {fieldErrors.dataset_name && (
            <p className="text-xs text-red-400">{fieldErrors.dataset_name}</p>
          )}
        </div>
      </div>

      {/* Metric Name + Direction */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="metric_name">Metric Name *</Label>
          <Input
            id="metric_name"
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
            placeholder="e.g. accuracy, loss, F1"
            aria-invalid={!!fieldErrors.metric_name}
          />
          {fieldErrors.metric_name && (
            <p className="text-xs text-red-400">{fieldErrors.metric_name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Metric Direction *</Label>
          <div className="flex gap-4 pt-1">
            {DIRECTION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"
              >
                <input
                  type="radio"
                  name="metric_direction"
                  value={opt.value}
                  checked={metricDirection === opt.value}
                  onChange={() => setMetricDirection(opt.value)}
                  className="accent-gray-900"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {fieldErrors.metric_direction && (
            <p className="text-xs text-red-400">{fieldErrors.metric_direction}</p>
          )}
        </div>
      </div>

      {/* Baseline to beat */}
      <div className="space-y-2">
        <Label htmlFor="baseline_to_beat">Baseline to Beat (optional)</Label>
        <Input
          id="baseline_to_beat"
          type="number"
          step="any"
          value={baselineToBeat}
          onChange={(e) => setBaselineToBeat(e.target.value)}
          placeholder="e.g. 0.8634"
          aria-invalid={!!fieldErrors.baseline_to_beat}
        />
        {fieldErrors.baseline_to_beat && (
          <p className="text-xs text-red-400">{fieldErrors.baseline_to_beat}</p>
        )}
      </div>

      {/* Starter Code URL */}
      <div className="space-y-2">
        <Label htmlFor="starter_code_url">Starter Code URL (optional)</Label>
        <Input
          id="starter_code_url"
          type="url"
          value={starterCodeUrl}
          onChange={(e) => setStarterCodeUrl(e.target.value)}
          placeholder="https://github.com/..."
          aria-invalid={!!fieldErrors.starter_code_url}
        />
        {fieldErrors.starter_code_url && (
          <p className="text-xs text-red-400">{fieldErrors.starter_code_url}</p>
        )}
      </div>

      {/* Hardware Recommendation */}
      <div className="space-y-2">
        <Label htmlFor="hardware_recommendation">
          Hardware Recommendation (optional)
        </Label>
        <Input
          id="hardware_recommendation"
          value={hardwareRecommendation}
          onChange={(e) => setHardwareRecommendation(e.target.value)}
          placeholder="e.g. 1x A100 80GB"
          aria-invalid={!!fieldErrors.hardware_recommendation}
        />
        {fieldErrors.hardware_recommendation && (
          <p className="text-xs text-red-400">
            {fieldErrors.hardware_recommendation}
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tag_1">Tag 1 (optional)</Label>
          <Input
            id="tag_1"
            value={tag1}
            onChange={(e) => setTag1(e.target.value)}
            placeholder="e.g. transformers"
            aria-invalid={!!fieldErrors.tag_1}
          />
          {fieldErrors.tag_1 && (
            <p className="text-xs text-red-400">{fieldErrors.tag_1}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tag_2">Tag 2 (optional)</Label>
          <Input
            id="tag_2"
            value={tag2}
            onChange={(e) => setTag2(e.target.value)}
            placeholder="e.g. quantization"
            aria-invalid={!!fieldErrors.tag_2}
          />
          {fieldErrors.tag_2 && (
            <p className="text-xs text-red-400">{fieldErrors.tag_2}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "edit"
              ? "Saving..."
              : "Creating..."
            : mode === "edit"
              ? "Save Changes"
              : "Create Hypothesis"}
        </Button>
      </div>
    </form>
  );
}
