"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadDropzone } from "@/components/shared/file-upload-dropzone";
import { ErrorBanner } from "@/components/shared/error-banner";
import { TsvPreview } from "@/components/run/tsv-preview";
import { processTsv } from "@/lib/parsers/process-tsv";
import { submitRun } from "@/lib/actions/run-actions";
import { runSchema } from "@/lib/validators/run-schema";
import {
  MAX_TSV_SIZE,
  MAX_CODE_SIZE,
  ALLOWED_CODE_EXTENSIONS,
} from "@/lib/utils/constants";
import type { TsvStats } from "@/lib/parsers/tsv-stats";
import type { ParsedTsvRow } from "@/types/experiment";
import type { MetricDirection } from "@/lib/utils/constants";

type SubmitRunFormProps = {
  readonly hypothesisId: string;
  readonly metricName: string;
  readonly metricDirection: string;
  readonly defaultForkedFrom?: string;
};

type TsvState = {
  readonly stats: TsvStats | null;
  readonly rows: readonly ParsedTsvRow[];
  readonly errors: readonly string[];
  readonly metricColumnName: string;
  readonly file: File | null;
};

type CodeState = {
  readonly file: File | null;
  readonly error: string | null;
};

const INITIAL_TSV: TsvState = {
  stats: null,
  rows: [],
  errors: [],
  metricColumnName: "",
  file: null,
};

const INITIAL_CODE: CodeState = {
  file: null,
  error: null,
};

function getFileExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return "";
  return filename.slice(dotIdx).toLowerCase();
}

export function SubmitRunForm({
  hypothesisId,
  metricName,
  metricDirection,
  defaultForkedFrom,
}: SubmitRunFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tsvState, setTsvState] = useState<TsvState>(INITIAL_TSV);
  const [codeState, setCodeState] = useState<CodeState>(INITIAL_CODE);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleTsvFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const result = processTsv(text, metricDirection as MetricDirection);

        if (result.success) {
          setTsvState({
            stats: result.stats,
            rows: result.rows,
            errors: [],
            metricColumnName: result.metricColumnName,
            file,
          });
        } else {
          setTsvState({
            stats: null,
            rows: [],
            errors: result.errors,
            metricColumnName: "",
            file: null,
          });
        }
      };
      reader.onerror = () => {
        setTsvState({
          stats: null,
          rows: [],
          errors: ["Failed to read TSV file"],
          metricColumnName: "",
          file: null,
        });
      };
      reader.readAsText(file);
    },
    [metricDirection],
  );

  const handleCodeFile = useCallback((file: File) => {
    const ext = getFileExtension(file.name);
    if (!ALLOWED_CODE_EXTENSIONS.includes(ext)) {
      setCodeState({
        file: null,
        error: `Invalid file type. Allowed: ${ALLOWED_CODE_EXTENSIONS.join(", ")}`,
      });
      return;
    }
    if (file.size > MAX_CODE_SIZE) {
      setCodeState({
        file: null,
        error: "Code file exceeds maximum size of 1 MB",
      });
      return;
    }
    setCodeState({ file, error: null });
  }, []);

  const isTsvValid = tsvState.stats !== null && tsvState.errors.length === 0;
  const isCodeValid = codeState.file !== null && codeState.error === null;
  const canSubmit = isTsvValid && isCodeValid && !isPending;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      setFieldErrors({});

      const form = e.currentTarget;
      const formDataRaw = new FormData(form);

      const rawFields = {
        goal: formDataRaw.get("goal") as string,
        hardware: formDataRaw.get("hardware") as string,
        time_budget: formDataRaw.get("time_budget") as string,
        model_size: formDataRaw.get("model_size") as string,
        tag_1: (formDataRaw.get("tag_1") as string) || null,
        tag_2: (formDataRaw.get("tag_2") as string) || null,
        forked_from: (formDataRaw.get("forked_from") as string) || null,
      };

      const parsed = runSchema.safeParse(rawFields);
      if (!parsed.success) {
        const newErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0];
          if (typeof path === "string") {
            newErrors[path] = issue.message;
          }
        }
        setFieldErrors(newErrors);
        return;
      }

      if (!tsvState.file || !codeState.file) {
        setFormError("Both TSV and code files are required");
        return;
      }

      const submitData = new FormData();
      submitData.set("goal", parsed.data.goal);
      submitData.set("hardware", parsed.data.hardware);
      submitData.set("time_budget", parsed.data.time_budget);
      submitData.set("model_size", parsed.data.model_size);
      if (parsed.data.tag_1) submitData.set("tag_1", parsed.data.tag_1);
      if (parsed.data.tag_2) submitData.set("tag_2", parsed.data.tag_2);
      if (parsed.data.forked_from) submitData.set("forked_from", parsed.data.forked_from);
      submitData.set("results_tsv", tsvState.file);
      submitData.set("code_file", codeState.file);

      startTransition(async () => {
        const result = await submitRun(hypothesisId, submitData);
        if (result.success) {
          router.push(result.data.runUrl);
        } else {
          setFormError(result.error);
        }
      });
    },
    [hypothesisId, tsvState.file, codeState.file, router],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && <ErrorBanner message={formError} />}

      <div className="space-y-2">
        <Label htmlFor="results_tsv">
          Results TSV <span className="text-red-400">*</span>
        </Label>
        <FileUploadDropzone
          accept=".tsv,.txt"
          maxSize={MAX_TSV_SIZE}
          onFileSelected={handleTsvFile}
          label={`Drop results.tsv here (metric: ${metricName})`}
          error={tsvState.errors.length > 0 ? "TSV has validation errors" : undefined}
        />
        <TsvPreview
          stats={tsvState.stats}
          rows={tsvState.rows}
          errors={tsvState.errors}
          metricColumnName={tsvState.metricColumnName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="code_file">
          Code File <span className="text-red-400">*</span>
        </Label>
        <FileUploadDropzone
          accept={ALLOWED_CODE_EXTENSIONS.join(",")}
          maxSize={MAX_CODE_SIZE}
          onFileSelected={handleCodeFile}
          label={`Drop code file here (${ALLOWED_CODE_EXTENSIONS.join(", ")})`}
          error={codeState.error ?? undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal">
          Goal <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id="goal"
          name="goal"
          placeholder="What were you trying to achieve?"
          rows={3}
          aria-invalid={!!fieldErrors.goal}
        />
        {fieldErrors.goal && (
          <p className="text-sm text-red-400">{fieldErrors.goal}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="hardware">
            Hardware <span className="text-red-400">*</span>
          </Label>
          <Input
            id="hardware"
            name="hardware"
            placeholder="e.g. 4x A100 80GB"
            aria-invalid={!!fieldErrors.hardware}
          />
          {fieldErrors.hardware && (
            <p className="text-sm text-red-400">{fieldErrors.hardware}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="time_budget">
            Time Budget <span className="text-red-400">*</span>
          </Label>
          <Input
            id="time_budget"
            name="time_budget"
            placeholder="e.g. 48 hours"
            aria-invalid={!!fieldErrors.time_budget}
          />
          {fieldErrors.time_budget && (
            <p className="text-sm text-red-400">{fieldErrors.time_budget}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="model_size">
            Model Size <span className="text-red-400">*</span>
          </Label>
          <Input
            id="model_size"
            name="model_size"
            placeholder="e.g. 7B params"
            aria-invalid={!!fieldErrors.model_size}
          />
          {fieldErrors.model_size && (
            <p className="text-sm text-red-400">{fieldErrors.model_size}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tag_1">Tag 1</Label>
          <Input id="tag_1" name="tag_1" placeholder="Optional tag" />
          {fieldErrors.tag_1 && (
            <p className="text-sm text-red-400">{fieldErrors.tag_1}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tag_2">Tag 2</Label>
          <Input id="tag_2" name="tag_2" placeholder="Optional tag" />
          {fieldErrors.tag_2 && (
            <p className="text-sm text-red-400">{fieldErrors.tag_2}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="forked_from">Forked From (Run ID)</Label>
        <Input
          id="forked_from"
          name="forked_from"
          defaultValue={defaultForkedFrom ?? ""}
          placeholder="Optional UUID of the run you forked from"
        />
        {fieldErrors.forked_from && (
          <p className="text-sm text-red-400">{fieldErrors.forked_from}</p>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit} size="lg" className="w-full">
        {isPending ? "Submitting..." : "Submit Run"}
      </Button>
    </form>
  );
}
