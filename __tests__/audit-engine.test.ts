import test from "node:test";
import assert from "node:assert/strict";
import {
  runAudit,
  fallbackSummary,
  encodeAuditId,
  decodeAuditId,
  makePublicAuditPayload,
} from "../src/lib/audit-engine.mjs";

test("right-sizes Claude Team below the 5-seat minimum", () => {
  const audit = runAudit({
    teamSize: 2,
    useCase: "writing",
    tools: [{ toolId: "claude", plan: "Team", monthlySpend: 150, seats: 2 }],
  });
  assert.equal(audit.totalMonthlySavings, 110);
  assert.match(audit.breakdown[0].recommendation, /Claude Pro/);
  assert.equal(audit.breakdown[0].severity, "high");
});

test("classifies as high-tier lead when API savings exceed $500/mo", () => {
  const audit = runAudit({
    teamSize: 12,
    useCase: "mixed",
    tools: [
      { toolId: "openaiApi", plan: "API direct", monthlySpend: 2600, seats: 1 },
    ],
  });
  assert.equal(audit.leadTier, "high");
  assert.ok(audit.totalMonthlySavings > 500);
  assert.match(audit.breakdown[0].recommendation, /credits/i);
});

test("does not manufacture savings for an already lean Cursor Pro stack", () => {
  const audit = runAudit({
    teamSize: 1,
    useCase: "coding",
    tools: [{ toolId: "cursor", plan: "Pro", monthlySpend: 20, seats: 1 }],
  });
  assert.equal(audit.totalMonthlySavings, 0);
  assert.equal(audit.leadTier, "low");
});

test("recommends Gemini Ultra downgrade for non-research use case", () => {
  const audit = runAudit({
    teamSize: 3,
    useCase: "writing",
    tools: [
      { toolId: "gemini", plan: "Ultra", monthlySpend: 749.97, seats: 3 },
    ],
  });
  assert.ok(audit.totalMonthlySavings > 600);
  assert.match(audit.breakdown[0].recommendation, /Pro/i);
  assert.equal(audit.breakdown[0].severity, "high");
});

test("flags Cursor Enterprise as overkill below 20 seats", () => {
  const audit = runAudit({
    teamSize: 8,
    useCase: "coding",
    tools: [
      { toolId: "cursor", plan: "Enterprise", monthlySpend: 800, seats: 8 },
    ],
  });
  assert.ok(audit.totalMonthlySavings > 400);
  assert.equal(audit.breakdown[0].severity, "high");
});

test("recommends cancelling Copilot when use case is not coding", () => {
  const audit = runAudit({
    teamSize: 5,
    useCase: "writing",
    tools: [
      { toolId: "copilot", plan: "Business", monthlySpend: 95, seats: 5 },
    ],
  });
  assert.equal(audit.totalMonthlySavings, 95);
  assert.equal(audit.breakdown[0].severity, "high");
});

test("public audit payload strips input and round-trips via encode/decode", () => {
  const audit = runAudit({
    teamSize: 4,
    useCase: "mixed",
    tools: [{ toolId: "chatgpt", plan: "Team", monthlySpend: 120, seats: 4 }],
  });
  const payload = makePublicAuditPayload(audit);
  const encoded = encodeAuditId(payload);
  const decoded = decodeAuditId(encoded);
  assert.equal(decoded.input.teamSize, 4);
  assert.equal(decoded.input.email, undefined);
  assert.equal(decoded.input.company, undefined);
  assert.ok(decoded.totals.monthlySavings >= 0);
});

test("annual savings is exactly 12× monthly savings", () => {
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
  assert.equal(
    audit.totalAnnualSavings,
    Math.round(audit.totalMonthlySavings * 12 * 100) / 100,
  );
});
