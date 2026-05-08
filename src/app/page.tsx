"use client";

import { BarChart3, CheckCircle2, Copy, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { currency } from "@/lib/format";
import {
  encodeAuditId,
  fallbackSummary,
  makePublicAuditPayload,
  runAudit,
  TOOLS,
  USE_CASES,
} from "@/lib/audit-engine.mjs";

type ToolRow = {
  toolId: string;
  plan: string;
  monthlySpend: number;
  seats: number;
};
type FormState = { teamSize: number; useCase: string; tools: ToolRow[] };

const defaultState: FormState = {
  teamSize: 6,
  useCase: "coding",
  tools: [
    { toolId: "cursor", plan: "Business", monthlySpend: 240, seats: 6 },
    { toolId: "openaiApi", plan: "API direct", monthlySpend: 700, seats: 1 },
  ],
};

export default function HomePage() {
  const [form, setForm] = useState<FormState>(() => {
    if (typeof window === "undefined") return defaultState;
    const saved = window.localStorage.getItem("spendlens-form");
    if (!saved) return defaultState;
    try {
      return JSON.parse(saved);
    } catch {
      return defaultState;
    }
  });

  const [remoteSummary, setRemoteSummary] = useState<{
    key: string;
    text: string;
    source: string;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [leadMessage, setLeadMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const summaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audit = useMemo(() => runAudit(form), [form]);
  const auditKey = useMemo(() => JSON.stringify(audit), [audit]);
  const summary =
    remoteSummary?.key === auditKey
      ? remoteSummary.text
      : fallbackSummary(audit);
  const publicId = useMemo(
    () => encodeAuditId(makePublicAuditPayload(audit)),
    [audit],
  );
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/audit/${publicId}`
      : `/audit/${publicId}`;

  // Persist form
  useEffect(() => {
    window.localStorage.setItem("spendlens-form", JSON.stringify(form));
  }, [form]);

  // Debounced AI summary fetch — 800ms after last change
  useEffect(() => {
    if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current);
    setSummaryLoading(true);
    summaryTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audit }),
        });
        const data = res.ok ? await res.json() : null;
        if (data?.summary)
          setRemoteSummary({
            key: auditKey,
            text: data.summary,
            source: data.source,
          });
      } catch {
        /* use fallback */
      } finally {
        setSummaryLoading(false);
      }
    }, 800);
    return () => {
      if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditKey]);

  function updateTool(index: number, patch: Partial<ToolRow>) {
    setForm((cur) => ({
      ...cur,
      tools: cur.tools.map((t, i) => {
        if (i !== index) return t;
        const next = { ...t, ...patch };
        if (patch.toolId) {
          const plans = Object.keys(
            (TOOLS as Record<string, { plans: Record<string, unknown> }>)[
              patch.toolId
            ]?.plans ?? {},
          );
          next.plan = plans[0] ?? "";
        }
        return next;
      }),
    }));
  }

  function addTool() {
    setForm((cur) => ({
      ...cur,
      tools: [
        ...cur.tools,
        { toolId: "chatgpt", plan: "Team", monthlySpend: 90, seats: 3 },
      ],
    }));
  }

  function removeTool(index: number) {
    setForm((cur) => ({
      ...cur,
      tools: cur.tools.filter((_, i) => i !== index),
    }));
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadMessage("Saving your report...");
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      role: String(data.get("role") || ""),
      teamSize: Number(data.get("teamSize") || form.teamSize),
      website: String(data.get("website") || ""), // honeypot
      audit,
      shareUrl,
    };
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setLeadMessage(
      res.ok
        ? body.message || "Report saved. Check your inbox."
        : body.error || "Could not save right now.",
    );
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const severityBadge = (s: string) => {
    const map: Record<string, string> = {
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low",
      optimal: "badge-optimal",
    };
    const label: Record<string, string> = {
      high: "High savings",
      medium: "Medium savings",
      low: "Low priority",
      optimal: "Optimal",
    };
    return (
      <span className={`badge ${map[s] ?? "badge-optimal"}`}>
        {label[s] ?? s}
      </span>
    );
  };

  return (
    <main className="shell">
      {/* ── Nav ── */}
      <header className="topbar">
        <div className="mark">
          <span className="mark-dot" aria-hidden="true" /> SpendLens
        </div>
        <nav aria-label="Primary">
          <a href="#results">Audit</a>
        </nav>
      </header>

      {/* ── Hero + Form ── */}
      <section className="hero">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Free AI spend audit</p>
            <h1>See your AI spend clearly.</h1>
            <p className="lede">
              SpendLens audits AI subscriptions, seats, API spend, and credit
              opportunities so founders can see practical monthly savings before
              paying the next invoice.
            </p>
            <div className="hero-points">
              <span className="point">
                <CheckCircle2 size={18} aria-hidden="true" /> No login before
                value
              </span>
              <span className="point">
                <CheckCircle2 size={18} aria-hidden="true" /> Public share link
                with private details stripped
              </span>
              <span className="point">
                <CheckCircle2 size={18} aria-hidden="true" /> Credex surfaced
                only when savings are meaningful
              </span>
            </div>
          </div>

          {/* ── Input form ── */}
          <form
            className="panel form-panel"
            onSubmit={(e) => e.preventDefault()}
            aria-label="AI stack input"
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="team-size">Team size</label>
                <input
                  id="team-size"
                  type="number"
                  min={1}
                  value={form.teamSize}
                  onChange={(e) =>
                    setForm({ ...form, teamSize: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="use-case">Primary use case</label>
                <select
                  id="use-case"
                  value={form.useCase}
                  onChange={(e) =>
                    setForm({ ...form, useCase: e.target.value })
                  }
                >
                  {(USE_CASES as string[]).map((uc) => (
                    <option key={uc} value={uc}>
                      {uc[0].toUpperCase() + uc.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.tools.map((tool, index) => {
              const plans = Object.keys(
                (TOOLS as Record<string, { plans: Record<string, unknown> }>)[
                  tool.toolId
                ]?.plans ?? {},
              );
              return (
                <div className="tool-row" key={`${tool.toolId}-${index}`}>
                  <div className="field">
                    <label htmlFor={`tool-${index}`}>Tool</label>
                    <select
                      id={`tool-${index}`}
                      value={tool.toolId}
                      onChange={(e) =>
                        updateTool(index, { toolId: e.target.value })
                      }
                    >
                      {Object.entries(
                        TOOLS as Record<string, { label: string }>,
                      ).map(([id, val]) => (
                        <option key={id} value={id}>
                          {val.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`plan-${index}`}>Plan</label>
                    <select
                      id={`plan-${index}`}
                      value={tool.plan}
                      onChange={(e) =>
                        updateTool(index, { plan: e.target.value })
                      }
                    >
                      {plans.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`spend-${index}`}>Monthly spend ($)</label>
                    <input
                      id={`spend-${index}`}
                      type="number"
                      min={0}
                      value={tool.monthlySpend}
                      onChange={(e) =>
                        updateTool(index, {
                          monthlySpend: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`seats-${index}`}>Seats</label>
                    <input
                      id={`seats-${index}`}
                      type="number"
                      min={1}
                      value={tool.seats}
                      onChange={(e) =>
                        updateTool(index, { seats: Number(e.target.value) })
                      }
                    />
                  </div>
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => removeTool(index)}
                    aria-label={`Remove ${(TOOLS as Record<string, { label: string }>)[tool.toolId]?.label ?? tool.toolId}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}

            <div className="actions">
              <button className="secondary" type="button" onClick={addTool}>
                <Plus size={18} /> Add tool
              </button>
              <a className="primary" href="#results">
                <BarChart3 size={18} /> View audit
              </a>
            </div>
          </form>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="section" id="results" aria-label="Audit results">
        <div className="results">
          {/* Hero savings band */}
          <div className="summary-band">
            <div>
              <p className="eyebrow">Instant audit</p>
              <h2>
                {audit.totalMonthlySavings < 100
                  ? "You're spending well."
                  : "Your practical savings estimate"}
              </h2>
              <div className="ai-summary-label">
                {summaryLoading
                  ? "Generating analysis…"
                  : remoteSummary?.source === "fallback" || !remoteSummary
                    ? "Summary"
                    : `AI analysis (${remoteSummary.source})`}
              </div>
              <p className="muted">{summaryLoading ? "…" : summary}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="savings">
                {currency(audit.totalMonthlySavings)}
              </div>
              <p className="muted">
                {currency(audit.totalAnnualSavings)} annualized
              </p>
            </div>
          </div>

          {/* Notice */}
          {audit.leadTier === "high" ? (
            <div className="notice-credex">
              <strong>Credex fit:</strong> This audit is above the $500/mo
              savings threshold. A discounted-credit review could preserve the
              tools you use while reducing retail API or enterprise spend
              significantly.
              <a
                href={
                  process.env.NEXT_PUBLIC_CREDEX_BOOKING_URL ||
                  "https://credex.rocks"
                }
                target="_blank"
                rel="noreferrer"
                className="primary"
                style={{ marginLeft: 12, padding: "6px 14px", fontSize: 13 }}
              >
                Book a call →
              </a>
            </div>
          ) : (
            <div className="notice">
              <strong>Honest result:</strong> Savings below $100/mo are not
              worth disruptive vendor churn. Use the signup below to get
              notified when pricing or credit options change for your stack.
            </div>
          )}

          {/* Per-tool breakdown */}
          <h3 style={{ marginTop: 24 }}>Per-tool breakdown</h3>
          <div className="breakdown" role="list">
            {(
              audit.breakdown as Array<{
                toolId: string;
                toolLabel: string;
                plan: string;
                seats: number;
                currentMonthly: number;
                recommendation: string;
                recommendedMonthly: number;
                monthlySavings: number;
                reason: string;
                severity: string;
              }>
            ).map((row, i) => (
              <article
                className={`breakdown-row severity-${row.severity} fade-up`}
                key={`${row.toolId}-${i}`}
                role="listitem"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div>
                  <h3>
                    {row.toolLabel} {severityBadge(row.severity)}
                  </h3>
                  <p className="muted">
                    {row.plan} · {row.seats} seat{row.seats === 1 ? "" : "s"} ·
                    current {currency(row.currentMonthly)}/mo
                  </p>
                </div>
                <div>
                  <strong>{row.recommendation}</strong>
                  <p className="muted">{row.reason}</p>
                </div>
                <div style={{ textAlign: "right", minWidth: 100 }}>
                  <p className="money positive">
                    {currency(row.monthlySavings)}/mo
                  </p>
                  <p className="small muted">
                    Recommended {currency(row.recommendedMonthly)}/mo
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Share */}
          <div className="actions" style={{ marginTop: 20 }}>
            <button
              className="secondary"
              type="button"
              onClick={copyShareUrl}
              aria-label="Copy shareable audit URL"
            >
              <Copy size={18} /> {copied ? "Copied!" : "Copy share URL"}
            </button>
            <a
              className="secondary"
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open public report
            </a>
          </div>

          {/* Lead capture */}
          <form
            className="panel lead-form"
            onSubmit={submitLead}
            aria-label="Save your report"
          >
            <h3>Capture this report</h3>
            <p className="muted">
              Email is asked after the audit, not before. High-savings reports
              include Credex consultation context.
            </p>
            {/* Honeypot — bots fill this, humans don't */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div className="lead-grid">
              <div className="field">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                />
              </div>
              <div className="field">
                <label htmlFor="company">Company</label>
                <input id="company" name="company" placeholder="Optional" />
              </div>
              <div className="field">
                <label htmlFor="role">Role</label>
                <input id="role" name="role" placeholder="Founder, Eng Lead…" />
              </div>
              <div className="field">
                <label htmlFor="lead-team-size">Team size</label>
                <input
                  id="lead-team-size"
                  name="teamSize"
                  type="number"
                  min={1}
                  defaultValue={form.teamSize}
                />
              </div>
            </div>
            <div className="actions">
              <button className="primary" type="submit">
                Send report
              </button>
              {audit.leadTier === "high" && (
                <a
                  className="secondary"
                  href={
                    process.env.NEXT_PUBLIC_CREDEX_BOOKING_URL ||
                    "https://credex.rocks"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Book Credex consult
                </a>
              )}
            </div>
            {leadMessage && (
              <p className="small muted" style={{ marginTop: 10 }}>
                {leadMessage}
              </p>
            )}
          </form>
        </div>
      </section>

      <footer>
        Built for founders and engineering managers who want the invoice to make
        sense. ·{" "}
        <a
          href="https://credex.rocks"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--brand)" }}
        >
          Powered by Credex
        </a>
      </footer>
    </main>
  );
}
