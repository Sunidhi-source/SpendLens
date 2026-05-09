import type { Metadata } from "next";
import Link from "next/link";
import { decodeAuditId } from "@/lib/audit-engine.mjs";
import { currency } from "@/lib/format";

type PageProps = { params: { id: string } };

export function generateMetadata({ params }: PageProps): Metadata {
  const payload = decodeAuditId(params.id);
  const savings = payload?.totals?.monthlySavings || 0;
  const title =
    savings > 0
      ? `AI spend audit: ${currency(savings)}/mo savings found — SpendLens`
      : "AI spend audit: already optimized — SpendLens";
  const desc =
    savings > 0
      ? `This public AI spend audit found ${currency(savings)} in monthly savings ($${savings * 12}/year).`
      : "This team's AI stack is already well-optimized.";
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "article",
      siteName: "SpendLens",
    },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

export default function PublicAuditPage({ params }: PageProps) {
  const payload = decodeAuditId(params.id);

  if (!payload) {
    return (
      <main className="shell">
        <section className="section">
          <div className="results">
            <h1>Audit link expired or invalid.</h1>
            <p className="muted">
              This may have been truncated when shared. Try running a fresh
              audit.
            </p>
            <div className="actions" style={{ marginTop: 16 }}>
              <Link className="primary" href="/">
                Run a fresh audit
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const severityClass = (s: string) =>
    ({
      high: "severity-high",
      medium: "severity-medium",
      low: "severity-low",
      optimal: "severity-optimal",
    })[s] ?? "";

  return (
    <main className="shell">
      <header className="topbar">
        <div className="mark">
          <span className="mark-dot" aria-hidden="true" /> SpendLens
        </div>
        <nav aria-label="Primary">
          <Link href="/">Run your audit</Link>
        </nav>
      </header>

      <section className="section">
        <div className="results">
          <div className="summary-band">
            <div>
              <p className="eyebrow">Public report</p>
              <h1>
                {payload.totals.monthlySavings < 100
                  ? "This stack is spending well."
                  : "AI spend savings surfaced"}
              </h1>
              <p className="muted">
                Company and email details are hidden. This shows tool choices,
                plan recommendations, and savings so teams can compare spend
                without exposing sensitive information.
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="savings">
                {currency(payload.totals.monthlySavings)}
              </div>
              <p className="muted">
                {currency(payload.totals.annualSavings)} annualized
              </p>
            </div>
          </div>

          <div className="breakdown" role="list">
            {payload.breakdown.map(
              (
                row: {
                  toolLabel: string;
                  plan: string;
                  currentMonthly: number;
                  recommendation: string;
                  recommendedMonthly: number;
                  monthlySavings: number;
                  reason: string;
                },
                i: number,
              ) => (
                <article
                  className={`breakdown-row ${severityClass("")} fade-up`}
                  key={`${row.toolLabel}-${i}`}
                  role="listitem"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div>
                    <h3>{row.toolLabel}</h3>
                    <p className="muted">
                      {row.plan} · current {currency(row.currentMonthly)}/mo
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
              ),
            )}
          </div>

          <div className="actions" style={{ marginTop: 24 }}>
            <Link className="primary" href="/">
              Audit your own stack
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
