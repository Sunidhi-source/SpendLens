# TESTS.md

All automated tests written for SpendLens. Every test listed here runs with `npm test`.

---

## How to run

```bash
npm install
npm test
```

All tests are in `__tests__/audit-engine.test.ts` and target the deterministic audit engine
(`src/lib/audit-engine.mjs`). No API keys or environment variables are required — the
audit engine is pure logic with no external dependencies.

---

## Test suite: `__tests__/audit-engine.test.ts`

| #   | Test name                                                                            | What it covers                                                                                                                                                                                                                            | Why it matters                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **right-sizes Claude Team below the 5-seat minimum**                                 | `auditClaude()` — Team plan with only 2 seats triggers a downgrade to individual Pro plans. Asserts `totalMonthlySavings === 110`, recommendation matches `/Claude Pro/`, severity is `"high"`.                                           | Claude Team has a 5-seat minimum ($150/mo floor). A 2-person team paying $60/mo should be on individual Pro ($40/mo total). Core right-sizing logic.                                    |
| 2   | **classifies as high-tier lead when API savings exceed $500/mo**                     | `auditApiDirect()` + `leadTier` classification. A $2,600/mo OpenAI API bill triggers a credit-routing recommendation. Asserts `leadTier === "high"`, `totalMonthlySavings > 500`, recommendation matches `/credits/i`.                    | High-value leads (>$500/mo savings) surface the Credex CTA. Wrong lead tier = wrong conversion path.                                                                                    |
| 3   | **does not manufacture savings for an already lean Cursor Pro stack**                | `auditCursor()` — single developer on Cursor Pro ($20/mo) for coding. Asserts `totalMonthlySavings === 0`, `leadTier === "low"`.                                                                                                          | The brief explicitly requires: "be honest. You're spending well." Fabricating savings for an optimal stack is a product integrity failure.                                              |
| 4   | **recommends Gemini Ultra downgrade for non-research use case**                      | `auditGemini()` — 3 seats on Gemini Ultra ($249.99/seat = $749.97/mo) for writing. Asserts `totalMonthlySavings > 600`, recommendation matches `/Pro/i`, severity is `"high"`.                                                            | Gemini Ultra is justified only for heavy research/document analysis. Writing teams have no use for it.                                                                                  |
| 5   | **flags Cursor Enterprise as overkill below 20 seats**                               | `auditCursor()` — 8 seats on Cursor Enterprise ($800/mo assumed). Asserts `totalMonthlySavings > 400`, severity is `"high"`.                                                                                                              | Enterprise pricing is for 20+ seat procurement with legal/security requirements. Below that threshold, Business plan covers identical features.                                         |
| 6   | **recommends cancelling Copilot when use case is not coding**                        | `auditCopilot()` — 5 seats on Copilot Business for a writing team. Asserts `totalMonthlySavings === 95` (full cancellation), severity is `"high"`.                                                                                        | GitHub Copilot is exclusively a code completion tool. Recommending it for non-coding teams would be wrong. Asserting full savings (not partial) confirms the cancellation path fires.   |
| 7   | **public audit payload strips identifying fields and round-trips via encode/decode** | `makePublicAuditPayload()` + `encodeAuditId()` + `decodeAuditId()`. Encodes a 4-person ChatGPT Team audit, decodes it, asserts `email` and `company` are `undefined` in the decoded payload, `teamSize === 4`, and `monthlySavings >= 0`. | The shareable URL must never expose email or company name. This is a privacy requirement, not just a formatting one. The round-trip test also confirms the base64url codec is lossless. |
| 8   | **annual savings is exactly 12× monthly savings**                                    | Multi-tool audit (Cursor Business + Anthropic API). Asserts `totalAnnualSavings === Math.round(totalMonthlySavings × 12 × 100) / 100`.                                                                                                    | The hero number on the results page ("Save $X,XXX/year") is derived from this. Off-by-one rounding errors here would embarrass the product on its most prominent display.               |

---

## Coverage notes

These 8 tests cover:

- All 3 rule categories in the audit engine: **plan right-sizing** (tests 1, 4, 5, 6), **use-case mismatch** (tests 3, 6), and **API credit routing** (test 2)
- **Edge cases at boundaries**: minimum seat counts (test 1), sub-$100 savings (test 3), supra-$500 savings (test 2)
- **Data pipeline**: encode/decode + PII stripping (test 7), arithmetic correctness (test 8)
- **Honesty constraint**: no manufactured savings for optimal stacks (test 3)

The audit engine intentionally has no UI, no network calls, and no database — it is a pure function from input to audit result. This makes the tests fast (< 1s), deterministic, and runnable in any environment.

---

## Known gap

React component tests (form persistence, results rendering) are not yet written. The
audit engine tests are the highest-value coverage because they protect the financial
reasoning that the whole product depends on.
