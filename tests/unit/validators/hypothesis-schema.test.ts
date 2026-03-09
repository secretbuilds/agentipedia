import { describe, it, expect } from "vitest";
import { hypothesisSchema } from "@/lib/validators/hypothesis-schema";
import { DOMAINS, METRIC_DIRECTIONS } from "@/lib/utils/constants";

function validInput() {
  return {
    title: "Can a 50M param model break 0.96 val_bpb?",
    description: "Explore architecture modifications to push past the 0.96 baseline on FineWeb.",
    domain: "llm_training",
    dataset_url: "https://huggingface.co/datasets/fineweb",
    dataset_name: "FineWeb-Edu 10B tokens",
    metric_name: "val_bpb",
    metric_direction: "lower_is_better" as const,
    baseline_to_beat: 0.969,
    starter_code_url: "https://github.com/example/train",
    hardware_recommendation: "1x A100 80GB",
    tag_1: "architecture",
    tag_2: "attention",
  };
}

describe("hypothesisSchema", () => {
  it("accepts a fully valid input", () => {
    const result = hypothesisSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("accepts input with only required fields and nullable defaults", () => {
    const result = hypothesisSchema.safeParse({
      title: "A valid title that is long enough",
      description: "This is a long enough description for the schema.",
      domain: "trading",
      dataset_url: "https://example.com/data",
      dataset_name: "My dataset",
      metric_name: "sharpe_ratio",
      metric_direction: "higher_is_better",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.baseline_to_beat).toBeNull();
      expect(result.data.starter_code_url).toBeNull();
      expect(result.data.hardware_recommendation).toBeNull();
      expect(result.data.tag_1).toBeNull();
      expect(result.data.tag_2).toBeNull();
    }
  });

  describe("title", () => {
    it("rejects title shorter than 10 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        title: "Too short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects title longer than 300 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        title: "x".repeat(301),
      });
      expect(result.success).toBe(false);
    });

    it("accepts title of exactly 10 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        title: "0123456789",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("description", () => {
    it("rejects description shorter than 20 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        description: "Too short for this",
      });
      expect(result.success).toBe(false);
    });

    it("rejects description longer than 10000 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        description: "y".repeat(10_001),
      });
      expect(result.success).toBe(false);
    });

    it("accepts description of exactly 20 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        description: "12345678901234567890",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("domain", () => {
    it.each(DOMAINS.map((d) => d.value))("accepts domain '%s'", (domain) => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        domain,
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid domain", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        domain: "Basket Weaving",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("dataset_url", () => {
    it("rejects an invalid URL", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        dataset_url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("dataset_name", () => {
    it("rejects empty dataset name", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        dataset_name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects dataset name longer than 200 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        dataset_name: "d".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("metric_name", () => {
    it("rejects empty metric name", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        metric_name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects metric name longer than 100 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        metric_name: "m".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("metric_direction", () => {
    it.each(METRIC_DIRECTIONS)("accepts '%s'", (dir) => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        metric_direction: dir,
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid direction", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        metric_direction: "sideways",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("baseline_to_beat", () => {
    it("accepts null", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        baseline_to_beat: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts a number", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        baseline_to_beat: 0.969,
      });
      expect(result.success).toBe(true);
    });

    it("rejects a string", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        baseline_to_beat: "0.969",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("starter_code_url", () => {
    it("accepts null", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        starter_code_url: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid URL", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        starter_code_url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("hardware_recommendation", () => {
    it("rejects string longer than 200 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        hardware_recommendation: "h".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("tags", () => {
    it("rejects tag_1 longer than 50 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        tag_1: "t".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("rejects tag_2 longer than 50 characters", () => {
      const result = hypothesisSchema.safeParse({
        ...validInput(),
        tag_2: "t".repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });
});
