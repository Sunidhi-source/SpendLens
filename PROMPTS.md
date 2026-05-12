# PROMPTS.md

All LLM prompts used in SpendLens. Includes the full text, rationale, iteration history,
and one documented case where the AI was wrong and I caught it.

---

## 1. AI Audit Summary Prompt

**File:** `src/lib/ai-summary.ts`  
**Triggered by:** `POST /api/summary` after the audit engine completes  
**Model chain:** Gemini 1.5 Flash → Groq (llama-3.1-8b-instant) → Claude Haiku → fallback template

The chain is ordered by cost and rate-limit generosity, not by output quality. Gemini 1.5
Flash has a free tier generous enough to handle most traffic; Groq is a fast, free fallback;
Claude Haiku is the final API attempt before the fully local template fallback. In production
with real Anthropic credits, the order would flip — Haiku first for quality, then cheaper
fallbacks. For an evaluation environment where API key availability is uncertain, this order
maximises the chance of a live summary without any configuration required.

### Full Prompt

```
You are a concise CFO-friendly AI spend analyst.

Write ONE paragraph of exactly 90-100 words summarizing this audit. Rules:
- Use second person ("you", "your team")
- Lead with the most impactful savings insight first
- Include specific dollar amounts
- Do NOT use filler: "In conclusion", "Overall", "In summary"
- Do NOT recommend Credex — just give honest financial analysis
- Tone: direct, like a CFO briefing a founder in 30 seconds

Audit data:
${auditJson}

Return ONLY the summary paragraph. No headers, no bullets.
```

For the Anthropic call specifically, the system prompt is separated out:

**System:**

```
You write concise CFO-friendly AI spend audit summaries. Use only the supplied
deterministic audit data. Do not invent prices, discounts, vendors, or savings.
```

**User:** (same prompt as above, with audit JSON injected)

**Model:** `claude-haiku-4-5-20251001`  
**Temperature:** `0.3`  
**Max tokens:** `200`

---

### Why I wrote it this way

**"CFO-friendly"** in the persona line was deliberate. Early drafts that said "helpful assistant"
produced summaries that softened the savings message — phrases like "you might want to consider"
instead of "you are paying $80/month for features you do not use." Naming the persona sharpened
the output immediately.

**Word count constraint (90–100 words)** came from testing. Without it, models wrote 3–4 sentence
summaries that were too short to be useful, or 200-word essays that nobody reads. A hard word
count forces prioritisation — the model has to pick the most important insight and lead with it.

**"Lead with the most impactful savings insight first"** was added after I noticed models sometimes
buried the main number at the end. For a tool where the savings figure is the whole point, burying
it is a UX failure.

**"Do NOT recommend Credex"** is critical for trust. The audit engine surfaces Credex for
high-savings cases through its own logic; if the AI summary also pushes Credex, the product reads
as a sales pitch rather than an honest tool. Users will close it. The AI's job is to give a clean
financial read.

**Temperature 0.3** (not 0): pure 0 produces slightly robotic output, but anything above 0.4
started hallucinating dollar figures that didn't match the audit JSON. 0.3 is the reliable middle.

**Separating the system prompt for Anthropic** follows the API's intended design — system-level
constraints (don't invent numbers) belong in the system turn, not mixed into the user turn where
a model might weight them differently. For Gemini and Groq, which use a single-turn format, the
constraint is folded into the user prompt directly.

---

### What I tried that didn't work

**Version 1 — no word count, no persona:**

```
Summarize this AI spend audit in 2-3 sentences.

${auditJson}
```

Result: the model returned summaries like "Your team is spending money on AI tools. There are
some opportunities to save." Useless — no numbers, no specificity, no action.

**Version 2 — role-play as "savings advisor":**

```
You are a savings advisor. Tell the user how to cut their AI spend.
```

Result: the model invented recommendations not in the audit data, suggesting tools the audit
engine never evaluated (e.g., recommending "Mistral API" which is not in our pricing database).
This is actively harmful — the audit engine's deterministic logic exists precisely so we can
cite vendor pricing pages. An LLM improvising on top of that breaks the sourcing chain.

**Version 3 — asking for bullet points:**

```
Give a 3-bullet summary of the key savings opportunities.
```

Result: bullets looked fine in development but broke the UI layout on the results page, which
expects a single paragraph. Switched to explicit "Return ONLY the summary paragraph. No headers,
no bullets."

---

### One specific time the AI was wrong and I caught it

During testing with a real audit (Cursor Business × 3 seats + Claude Team × 2 seats), Gemini
1.5 Flash returned:

> "Your team is paying $120/month for Claude Team, but could save $40 by switching to the Pro
> plan — a $40/month reduction that compounds to $480 annually."

The actual audit engine calculated savings of **$110/month** (from $150 Team to $40 Pro for
2 seats), not $40. Gemini had independently recalculated `$30 × 2 seats = $60 current` rather
than reading the `currentMonthly` field from the JSON, and derived the wrong delta.

This confirmed the design decision to pass the full audit JSON (with pre-calculated
`monthlySavings` fields) rather than asking the model to do the math. The audit engine's
numbers are deterministic and source-cited. The model's job is prose, not arithmetic. I added
the explicit system instruction "Do not invent prices, discounts, vendors, or savings" as a
direct result of catching this.

---

### Fallback template (no API key)

When all three API providers fail or are unconfigured, `fallbackSummary()` in
`audit-engine.mjs` generates a deterministic summary from the audit output:

- If `totalMonthlySavings < $100`: acknowledges lean spending, recommends monitoring
- Otherwise: surfaces the top savings item by `monthlySavings`, includes exact dollar figures

This means the product works fully in eval environments with no API keys configured — an
intentional decision documented in DEVLOG Day 3. An evaluator running the tool cold, with no
environment variables set, still sees a real summary.
