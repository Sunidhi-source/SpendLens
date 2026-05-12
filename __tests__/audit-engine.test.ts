import {
  runAudit,
  fallbackSummary,
  encodeAuditId,
  decodeAuditId,
  makePublicAuditPayload,
} from "../src/lib/audit-engine.mjs";

it("right-sizes Claude Team below the 5-seat minimum", () => {
  const audit = runAudit({
    teamSize: 2,
    useCase: "writing",
    tools: [{ toolId: "claude", plan: "Team", monthlySpend: 150, seats: 2 }],
  });
  expect(audit.totalMonthlySavings).toBe(110);
  expect(audit.breakdown[0].recommendation).toMatch(/Claude Pro/);
  expect(audit.breakdown[0].severity).toBe("high");
});

it("classifies as high-tier lead when API savings exceed $500/mo", () => {
  const audit = runAudit({
    teamSize: 12,
    useCase: "mixed",
    tools: [
      { toolId: "openaiApi", plan: "API direct", monthlySpend: 2600, seats: 1 },
    ],
  });
  expect(audit.leadTier).toBe("high");
  expect(audit.totalMonthlySavings).toBeGreaterThan(500);
  expect(audit.breakdown[0].recommendation).toMatch(/credits/i);
});

it("does not manufacture savings for an already lean Cursor Pro stack", () => {
  const audit = runAudit({
    teamSize: 1,
    useCase: "coding",
    tools: [{ toolId: "cursor", plan: "Pro", monthlySpend: 20, seats: 1 }],
  });
  expect(audit.totalMonthlySavings).toBe(0);
  expect(audit.leadTier).toBe("low");
});

it("recommends Gemini Ultra downgrade for non-research use case", () => {
  const audit = runAudit({
    teamSize: 3,
    useCase: "writing",
    tools: [
      { toolId: "gemini", plan: "Ultra", monthlySpend: 749.97, seats: 3 },
    ],
  });
  expect(audit.totalMonthlySavings).toBeGreaterThan(600);
  expect(audit.breakdown[0].recommendation).toMatch(/Pro/i);
  expect(audit.breakdown[0].severity).toBe("high");
});

it("flags Cursor Enterprise as overkill below 20 seats", () => {
  const audit = runAudit({
    teamSize: 8,
    useCase: "coding",
    tools: [
      { toolId: "cursor", plan: "Enterprise", monthlySpend: 800, seats: 8 },
    ],
  });
  expect(audit.totalMonthlySavings).toBeGreaterThan(400);
  expect(audit.breakdown[0].severity).toBe("high");
});

it("recommends cancelling Copilot when use case is not coding", () => {
  const audit = runAudit({
    teamSize: 5,
    useCase: "writing",
    tools: [
      { toolId: "copilot", plan: "Business", monthlySpend: 95, seats: 5 },
    ],
  });
  expect(audit.totalMonthlySavings).toBe(95);
  expect(audit.breakdown[0].severity).toBe("high");
});

it("public audit payload strips input and round-trips via encode/decode", () => {
  const audit = runAudit({
    teamSize: 4,
    useCase: "mixed",
    tools: [{ toolId: "chatgpt", plan: "Team", monthlySpend: 120, seats: 4 }],
  });
  const payload = makePublicAuditPayload(audit);
  const encoded = encodeAuditId(payload);
  const decoded = decodeAuditId(encoded);
  expect(decoded.input.teamSize).toBe(4);
  expect(decoded.input.email).toBeUndefined();
  expect(decoded.input.company).toBeUndefined();
  expect(decoded.totals.monthlySavings).toBeGreaterThanOrEqual(0);
});

it("annual savings is exactly 12× monthly savings", () => {
  const audit = runAudit({
    teamSize: 10,
    useCase: "coding",
    tools: [
      { toolId: "cursor", plan: "Business", monthlySpend: 500, seats: 10 },
      {
        toolId: "anthropicApi",
        plan: "API direct",
        monthlySpend: 1000,
        seats: 1,
      },
    ],
  });
  expect(audit.totalAnnualSavings).toBe(
    Math.round(audit.totalMonthlySavings * 12 * 100) / 100,
  );
});
