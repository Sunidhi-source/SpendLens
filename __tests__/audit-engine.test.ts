import { runAudit } from "@/lib/audit-engine";

describe("Audit Engine", () => {
  test("recommends downgrade when Cursor Business used by small team", () => {
    const result = runAudit({
      tools: [
        { toolId: "cursor", plan: "business", monthlySpend: 80, seats: 2 },
      ],
      teamSize: 2,
      useCase: "coding",
    });
    expect(result.totalMonthlySavings).toBeGreaterThan(0);
    expect(result.recommendations[0].recommendedAction).toContain("Pro");
  });

  test("no savings when already on correct plan", () => {
    const result = runAudit({
      tools: [{ toolId: "cursor", plan: "pro", monthlySpend: 20, seats: 1 }],
      teamSize: 1,
      useCase: "coding",
    });
    expect(result.recommendations[0].monthlySavings).toBe(0);
  });

  test("annual savings = monthly × 12", () => {
    const result = runAudit({
      tools: [
        { toolId: "cursor", plan: "business", monthlySpend: 200, seats: 5 },
      ],
      teamSize: 5,
      useCase: "coding",
    });
    expect(result.totalAnnualSavings).toBe(result.totalMonthlySavings * 12);
  });

  test("isOptimal true when savings < $10", () => {
    const result = runAudit({
      tools: [{ toolId: "cursor", plan: "pro", monthlySpend: 20, seats: 1 }],
      teamSize: 1,
      useCase: "coding",
    });
    expect(result.isOptimal).toBe(true);
  });

  test("handles empty tools gracefully", () => {
    const result = runAudit({ tools: [], teamSize: 5, useCase: "mixed" });
    expect(result.totalMonthlySavings).toBe(0);
    expect(result.recommendations).toHaveLength(0);
  });
});
