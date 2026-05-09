import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  company: z.string().max(120).optional().or(z.literal("")),
  role: z.string().max(120).optional().or(z.literal("")),
  teamSize: z.number().min(1).max(10000).optional(),
  website: z.string().optional(),
  audit: z.any(),
  shareUrl: z.string(),
});

const hits = new Map<string, { count: number; resetAt: number }>();

function isLimited(ip: string) {
  const now = Date.now();
  const b = hits.get(ip);
  if (!b || b.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 600_000 });
    return false;
  }
  b.count += 1;
  return b.count > 8;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isLimited(ip))
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );

  // Honeypot — silently accept bots
  if (parsed.data.website)
    return NextResponse.json({
      message: "Thanks, your report has been queued.",
    });

  const lead = {
    email: parsed.data.email,
    company: parsed.data.company || null,
    role: parsed.data.role || null,
    team_size:
      parsed.data.teamSize || parsed.data.audit?.input?.teamSize || null,
    monthly_savings: parsed.data.audit?.totalMonthlySavings || 0,
    annual_savings: parsed.data.audit?.totalAnnualSavings || 0,
    lead_tier: parsed.data.audit?.leadTier || "unknown",
    share_url: parsed.data.shareUrl,
    audit_payload: parsed.data.audit,
    created_at: new Date().toISOString(),
  };

  // Store — gracefully skip if Supabase not configured
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      const tbl = process.env.SUPABASE_LEADS_TABLE || "audit_leads";
      const { error } = await sb.from(tbl).insert(lead);
      if (error) console.error("Supabase insert error:", error.message);
    } catch (err) {
      console.error("Supabase failed:", err);
    }
  } else {
    console.info("Lead storage skipped — Supabase not configured:", lead.email);
  }

  // Email — gracefully skip if Resend not configured
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM || "Credex Audit <audit@example.com>",
        to: lead.email,
        subject: `Your AI spend audit — $${lead.monthly_savings}/mo in savings found`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fbfcf8;color:#17211b;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
              <div style="width:20px;height:20px;border-radius:4px;background:linear-gradient(135deg,#0f766e,#d6a640);"></div>
              <strong style="font-size:16px;font-weight:800;">SpendLens</strong>
            </div>
            <h1 style="font-size:28px;font-weight:900;margin:0 0 14px;letter-spacing:-0.02em;">
              $${lead.monthly_savings}/mo in AI savings found
            </h1>
            <p style="color:#647067;line-height:1.65;margin-bottom:24px;">
              Your full audit is saved at the link below. Recommendations don't expire.
            </p>
            <a href="${lead.share_url}" style="display:inline-block;background:#0f766e;color:#fff;font-weight:700;padding:12px 24px;border-radius:7px;text-decoration:none;font-size:15px;">
              View My Audit Report →
            </a>
            ${
              lead.lead_tier === "high"
                ? `
            <div style="margin-top:28px;padding:18px;border:1px solid #a3e6d6;border-radius:8px;background:#f0fdf9;color:#115e59;">
              <strong>High savings case 🎯</strong><br/>
              Credex may be able to capture more of this through discounted AI credits. A team member will reach out within 1 business day.
            </div>`
                : `
            <p style="margin-top:24px;color:#647067;font-size:14px;">
              We'll notify you when new optimizations apply to your stack.
            </p>`
            }
            <p style="color:#9ca3af;font-size:12px;margin-top:36px;">SpendLens is a free tool by <a href="https://credex.rocks" style="color:#0f766e;">Credex</a>.</p>
          </div>`,
      });
    } catch (err) {
      console.error("Resend failed:", err);
    }
  } else {
    console.info("Email skipped — Resend not configured.");
  }

  return NextResponse.json({
    message:
      lead.lead_tier === "high"
        ? "Report saved. Credex context included — high-savings case flagged."
        : "Report saved. You'll be notified when new optimizations apply to your stack.",
  });
}
