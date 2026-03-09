import { describe, it, expect } from "vitest";
import {
  formatMetric,
  formatPercentage,
  formatNumber,
  formatFileSize,
  formatImprovementDirection,
} from "@/lib/utils/format";

describe("formatMetric", () => {
  it("formats with default 6 decimal places", () => {
    expect(formatMetric(0.969)).toBe("0.969000");
  });

  it("formats with custom decimal places", () => {
    expect(formatMetric(0.969, 2)).toBe("0.97");
  });

  it("formats zero", () => {
    expect(formatMetric(0)).toBe("0.000000");
  });

  it("formats large numbers", () => {
    expect(formatMetric(1234.5, 3)).toBe("1234.500");
  });

  it("rounds correctly", () => {
    expect(formatMetric(0.9695, 3)).toBe("0.970");
  });
});

describe("formatPercentage", () => {
  it("formats a percentage with one decimal", () => {
    expect(formatPercentage(9.23)).toBe("9.2%");
  });

  it("formats zero", () => {
    expect(formatPercentage(0)).toBe("0.0%");
  });

  it("formats 100 percent", () => {
    expect(formatPercentage(100)).toBe("100.0%");
  });

  it("rounds to one decimal", () => {
    expect(formatPercentage(33.3333)).toBe("33.3%");
  });
});

describe("formatNumber", () => {
  it("formats small numbers without commas", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats thousands with commas", () => {
    expect(formatNumber(1234)).toBe("1,234");
  });

  it("formats millions with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats fractional kilobytes", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats large megabytes", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
});

describe("formatImprovementDirection", () => {
  describe("lower_is_better", () => {
    it("returns improved when best is lower", () => {
      expect(formatImprovementDirection(1.0, 0.9, "lower_is_better")).toBe(
        "improved"
      );
    });

    it("returns regressed when best is higher", () => {
      expect(formatImprovementDirection(1.0, 1.1, "lower_is_better")).toBe(
        "regressed"
      );
    });

    it("returns unchanged when equal", () => {
      expect(formatImprovementDirection(1.0, 1.0, "lower_is_better")).toBe(
        "unchanged"
      );
    });
  });

  describe("higher_is_better", () => {
    it("returns improved when best is higher", () => {
      expect(formatImprovementDirection(0.8, 0.95, "higher_is_better")).toBe(
        "improved"
      );
    });

    it("returns regressed when best is lower", () => {
      expect(formatImprovementDirection(0.8, 0.7, "higher_is_better")).toBe(
        "regressed"
      );
    });

    it("returns unchanged when equal", () => {
      expect(formatImprovementDirection(0.8, 0.8, "higher_is_better")).toBe(
        "unchanged"
      );
    });
  });
});
