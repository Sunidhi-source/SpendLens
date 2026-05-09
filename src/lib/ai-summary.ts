const PROMPT = (
  auditJson: string,
) => `You are a concise CFO-friendly AI spend analyst.

Write ONE paragraph of exactly 90-100 words summarizing this audit. Rules:
- Use second person ("you", "your team")
- Lead with the most impactful savings insight first
- Include specific dollar amounts
- Do NOT use filler: "In conclusion", "Overall", "In summary"
- Do NOT recommend Credex — just give honest financial analysis
- Tone: direct, like a CFO briefing a founder in 30 seconds

Audit data:
${auditJson}

Return ONLY the summary paragraph. No headers, no bullets.`;

export async function generateAISummary(
  audit: object,
): Promise<{ summary: string; source: string }> {
  const auditJson = JSON.stringify(audit);

  // ── 1. Google Gemini (FREE — 60 req/min, no credit card) ─────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: PROMPT(auditJson) }] }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { summary: text, source: "gemini" };
      }
    } catch (err) {
      console.warn("Gemini API failed:", err);
    }
  }

  // ── 2. Groq (FREE — very fast, generous limits) ───────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            max_tokens: 200,
            temperature: 0.3,
            messages: [{ role: "user", content: PROMPT(auditJson) }],
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return { summary: text, source: "groq" };
      }
    } catch (err) {
      console.warn("Groq API failed:", err);
    }
  }

  // ── 3. Anthropic (paid — best quality, optional) ──────────────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          temperature: 0.3,
          system:
            "You write concise CFO-friendly AI spend audit summaries. Use only the supplied deterministic audit data. Do not invent prices, discounts, vendors, or savings.",
          messages: [{ role: "user", content: PROMPT(auditJson) }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content
          ?.map((p: { text?: string }) => p.text)
          .join(" ")
          .trim();
        if (text) return { summary: text, source: "anthropic" };
      }
    } catch (err) {
      console.warn("Anthropic API failed:", err);
    }
  }

  // ── 4. Fallback template (always works, no API key needed) ────────────────
  const { fallbackSummary } = await import("./audit-engine.mjs");
  return { summary: fallbackSummary(audit), source: "fallback" };
}
