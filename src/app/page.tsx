"use client";

import { BarChart3, Copy, Plus, Trash2 } from "lucide-react";
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

const DEFAULT: FormState = {
  teamSize: 6,
  useCase: "coding",
  tools: [
    { toolId: "cursor", plan: "Business", monthlySpend: 240, seats: 6 },
    { toolId: "openaiApi", plan: "API direct", monthlySpend: 700, seats: 1 },
  ],
};

export default function HomePage() {
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage only after mount — fixes hydration mismatch
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("spendlens-form");
      if (saved) setForm(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (mounted) localStorage.setItem("spendlens-form", JSON.stringify(form));
  }, [form, mounted]);

  const [remoteSummary, setRemoteSummary] = useState<{
    key: string;
    text: string;
    source: string;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [leadMsg, setLeadMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audit = useMemo(() => runAudit(form), [form]);
  const auditKey = useMemo(() => JSON.stringify(audit), [audit]);
  const summary =
    remoteSummary?.key === auditKey
      ? remoteSummary.text
      : fallbackSummary(audit);

  // Build shareUrl only client-side — no SSR mismatch
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const publicId = useMemo(
    () => encodeAuditId(makePublicAuditPayload(audit)),
    [audit],
  );
  const shareUrl = origin
    ? `${origin}/audit/${publicId}`
    : `/audit/${publicId}`;

  // Debounced AI summary
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSummaryLoading(true);
    timerRef.current = setTimeout(async () => {
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
    }, 900);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditKey]);

  function updateTool(i: number, patch: Partial<ToolRow>) {
    setForm((cur) => ({
      ...cur,
      tools: cur.tools.map((t, idx) => {
        if (idx !== i) return t;
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
    setForm((c) => ({
      ...c,
      tools: [
        ...c.tools,
        { toolId: "chatgpt", plan: "Team", monthlySpend: 90, seats: 3 },
      ],
    }));
  }

  function removeTool(i: number) {
    setForm((c) => ({ ...c, tools: c.tools.filter((_, idx) => idx !== i) }));
  }

  async function submitLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLeadMsg("Saving…");
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      role: String(fd.get("role") ?? ""),
      teamSize: Number(fd.get("teamSize") ?? form.teamSize),
      website: String(fd.get("website") ?? ""),
      audit,
      shareUrl,
    };
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setLeadMsg(
      res.ok
        ? (body.message ?? "Saved! Check your inbox.")
        : (body.error ?? "Could not save. Try again."),
    );
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const badge = (s: string) => {
    const cls: Record<string, string> = {
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low",
      optimal: "badge-optimal",
    };
    const label: Record<string, string> = {
      high: "High savings",
      medium: "Some savings",
      low: "Minor",
      optimal: "Optimal",
    };
    return (
      <span className={`badge ${cls[s] ?? "badge-optimal"}`}>
        {label[s] ?? s}
      </span>
    );
  };

  const isOptimal = audit.totalMonthlySavings < 100;

  return (
    <main className="shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="mark">
          <div className="mark-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle
                cx="5.5"
                cy="5.5"
                r="4"
                stroke="white"
                strokeWidth="1.5"
              />
              <line
                x1="8.5"
                y1="8.5"
                x2="13"
                y2="13"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          SpendLens
        </div>
        <nav aria-label="Primary">
          <a href="#results">View audit</a>
          <a href="https://credex.rocks" target="_blank" rel="noreferrer">
            Credex
          </a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="hero" id="top">
        <div className="hero-grid">
          {/* Left — copy */}
          <div>
            <p className="eyebrow">Free · No login required</p>
            <h1>
              Find your hidden AI <em>overspend.</em>
            </h1>
            <p className="lede">
              Enter every AI subscription, seat count, and API invoice. Get an
              instant breakdown of what to cut, downgrade, or reroute — and
              exactly how much you save.
            </p>
            <div className="hero-points">
              <span className="point">
                <span className="point-check" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5L8 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Results shown before email is asked
              </span>
              <span className="point">
                <span className="point-check" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5L8 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Shareable public link strips identifying details
              </span>
              <span className="point">
                <span className="point-check" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5L8 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Credex only shown when savings exceed $500/mo
              </span>
            </div>
          </div>

          {/* Right — form */}
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

            {form.tools.map((tool, idx) => {
              const plans = Object.keys(
                (TOOLS as Record<string, { plans: Record<string, unknown> }>)[
                  tool.toolId
                ]?.plans ?? {},
              );
              return (
                <div className="tool-row" key={`${tool.toolId}-${idx}`}>
                  <div className="tool-num">Tool {idx + 1}</div>
                  <div className="field">
                    <label htmlFor={`tool-${idx}`}>Tool</label>
                    <select
                      id={`tool-${idx}`}
                      value={tool.toolId}
                      onChange={(e) =>
                        updateTool(idx, { toolId: e.target.value })
                      }
                    >
                      {Object.entries(
                        TOOLS as Record<string, { label: string }>,
                      ).map(([id, v]) => (
                        <option key={id} value={id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`plan-${idx}`}>Plan</label>
                    <select
                      id={`plan-${idx}`}
                      value={tool.plan}
                      onChange={(e) =>
                        updateTool(idx, { plan: e.target.value })
                      }
                    >
                      {plans.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`spend-${idx}`}>Monthly ($)</label>
                    <input
                      id={`spend-${idx}`}
                      type="number"
                      min={0}
                      value={tool.monthlySpend}
                      onChange={(e) =>
                        updateTool(idx, {
                          monthlySpend: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`seats-${idx}`}>Seats</label>
                    <input
                      id={`seats-${idx}`}
                      type="number"
                      min={1}
                      value={tool.seats}
                      onChange={(e) =>
                        updateTool(idx, { seats: Number(e.target.value) })
                      }
                    />
                  </div>
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => removeTool(idx)}
                    aria-label={`Remove ${(TOOLS as Record<string, { label: string }>)[tool.toolId]?.label ?? tool.toolId}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            <div className="actions">
              <button className="secondary" type="button" onClick={addTool}>
                <Plus size={15} aria-hidden="true" /> Add tool
              </button>
              <a
                className="primary"
                href="#results"
                aria-label="Scroll to audit results"
              >
                <BarChart3 size={15} aria-hidden="true" /> View audit
              </a>
            </div>
          </form>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="section" id="results" aria-label="Audit results">
        <div className="results">
          {/* Savings band */}
          <div className="summary-band">
            <div className="band-left">
              <p className="eyebrow">Instant audit</p>
              <h2>
                {isOptimal
                  ? "You're spending well."
                  : "Practical savings estimate"}
              </h2>
              <div className="ai-label" style={{ marginTop: 0 }}>
                {summaryLoading
                  ? "Generating analysis…"
                  : remoteSummary?.source && remoteSummary.source !== "fallback"
                    ? `AI analysis · ${remoteSummary.source}`
                    : "Summary"}
              </div>
              <p className="ai-text">
                {summaryLoading ? (
                  <span className="pulsing">Analysing your stack…</span>
                ) : (
                  summary
                )}
              </p>
            </div>
            <div className="band-right">
              <span
                className="savings-num"
                aria-label={`${currency(audit.totalMonthlySavings)} per month potential savings`}
              >
                {currency(audit.totalMonthlySavings)}
              </span>
              <p className="savings-annual">
                {currency(audit.totalAnnualSavings)} / year
              </p>
            </div>
          </div>

          {/* Notice */}
          {audit.leadTier === "high" ? (
            <div className="notice-credex" role="alert">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M9 3L16 15H2L9 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <line
                  x1="9"
                  y1="8"
                  x2="9"
                  y2="11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="13" r="0.75" fill="currentColor" />
              </svg>
              <div style={{ flex: 1 }}>
                <strong>Credex can capture more of this.</strong> Savings above
                $500/mo are where discounted AI credits — same tools, 15–35%
                below retail — make a real difference.
              </div>
              <a
                href={
                  process.env.NEXT_PUBLIC_CREDEX_BOOKING_URL ??
                  "https://credex.rocks"
                }
                target="_blank"
                rel="noreferrer"
                className="primary"
                style={{
                  fontSize: 13,
                  height: 36,
                  padding: "0 14px",
                  flexShrink: 0,
                }}
              >
                Book credit review →
              </a>
            </div>
          ) : (
            <div className="notice">
              <strong>Honest result:</strong>{" "}
              {isOptimal
                ? "You're already spending carefully. Check back when your team size or tool mix changes."
                : "There is a practical savings opportunity from plan right-sizing. No Credex needed at this level — these are free changes."}
            </div>
          )}

          {/* Per-tool breakdown */}
          <p className="section-h">Per-tool breakdown</p>
          <div
            className="breakdown"
            role="list"
            aria-label="Tool-by-tool audit"
          >
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
                key={`${row.toolId}-${i}`}
                role="listitem"
                className={`breakdown-row severity-${row.severity} fade-up`}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                {/* col 1 — tool info */}
                <div>
                  <div className="tool-header">
                    <h3 style={{ fontSize: 14 }}>{row.toolLabel}</h3>
                    {badge(row.severity)}
                  </div>
                  <p className="muted small">
                    {row.plan} · {row.seats} seat{row.seats === 1 ? "" : "s"} ·{" "}
                    {currency(row.currentMonthly)}/mo
                  </p>
                </div>
                {/* col 2 — recommendation */}
                <div>
                  <p className="row-rec">{row.recommendation}</p>
                  <p className="row-reason">{row.reason}</p>
                </div>
                {/* col 3 — savings */}
                <div className="savings-col">
                  <p
                    className={`savings-amt ${row.monthlySavings === 0 ? "zero" : ""}`}
                  >
                    {row.monthlySavings === 0
                      ? "—"
                      : `${currency(row.monthlySavings)}/mo`}
                  </p>
                  {row.monthlySavings > 0 && (
                    <p className="savings-rec">
                      → {currency(row.recommendedMonthly)}/mo
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Share bar */}
          {mounted && (
            <div className="share-row" aria-label="Share your audit">
              <span className="share-url" title={shareUrl}>
                {shareUrl}
              </span>
              <button
                className="secondary"
                type="button"
                onClick={copyUrl}
                aria-label="Copy shareable URL"
                style={{
                  height: 34,
                  padding: "0 12px",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                <Copy size={13} aria-hidden="true" />
                {copied ? "Copied!" : "Copy link"}
              </button>
              <a
                className="secondary"
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  height: 34,
                  padding: "0 12px",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                Open →
              </a>
            </div>
          )}

          {/* Lead capture */}
          <form
            className="panel lead-form"
            onSubmit={submitLead}
            aria-label="Save your audit report"
          >
            <h3>Save this report</h3>
            <p className="muted small" style={{ marginTop: 3 }}>
              Email is collected after value is shown. High-savings reports get
              a Credex follow-up.
            </p>
            {/* honeypot */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="hp-website">Website</label>
              <input
                id="hp-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div className="lead-grid">
              <div className="field">
                <label htmlFor="lead-email">Email *</label>
                <input
                  id="lead-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                />
              </div>
              <div className="field">
                <label htmlFor="lead-company">Company</label>
                <input
                  id="lead-company"
                  name="company"
                  placeholder="Optional"
                />
              </div>
              <div className="field">
                <label htmlFor="lead-role">Role</label>
                <input
                  id="lead-role"
                  name="role"
                  placeholder="Founder, Eng Lead…"
                />
              </div>
              <div className="field">
                <label htmlFor="lead-size">Team size</label>
                <input
                  id="lead-size"
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
                    process.env.NEXT_PUBLIC_CREDEX_BOOKING_URL ??
                    "https://credex.rocks"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Book Credex credit review
                </a>
              )}
            </div>
            {leadMsg && (
              <p className="small muted" style={{ marginTop: 10 }}>
                {leadMsg}
              </p>
            )}
          </form>
        </div>
      </section>

      <footer>
        <span>
          SpendLens — free AI spend audit by{" "}
          <a
            href="https://credex.rocks"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--brand)" }}
          >
            Credex
          </a>
        </span>
        <span>
          Pricing from official vendor pages ·{" "}
          <a href="#top" style={{ color: "var(--muted)" }}>
            Back to top
          </a>
        </span>
      </footer>
    </main>
  );
}
