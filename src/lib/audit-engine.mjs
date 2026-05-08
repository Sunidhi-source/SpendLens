export const TOOLS = {
  cursor: {
    label: "Cursor",
    category: "coding",
    plans: {
      Hobby: { price: 0, seatBased: false },
      Pro: { price: 20, seatBased: true },
      Business: { price: 40, seatBased: true },
      Enterprise: { price: null, seatBased: true },
    },
  },
  copilot: {
    label: "GitHub Copilot",
    category: "coding",
    plans: {
      Individual: { price: 10, seatBased: true },
      Business: { price: 19, seatBased: true },
      Enterprise: { price: 39, seatBased: true },
    },
  },
  claude: {
    label: "Claude",
    category: "general",
    plans: {
      Free: { price: 0, seatBased: false },
      Pro: { price: 20, seatBased: true },
      Max: { price: 100, seatBased: true },
      Team: { price: 30, seatBased: true, minimumSeats: 5 },
      Enterprise: { price: null, seatBased: true },
      "API direct": { price: null, seatBased: false },
    },
  },
  chatgpt: {
    label: "ChatGPT",
    category: "general",
    plans: {
      Plus: { price: 20, seatBased: true },
      Pro: { price: 200, seatBased: true },
      Team: { price: 30, seatBased: true, minimumSeats: 2 },
      Enterprise: { price: null, seatBased: true },
      "API direct": { price: null, seatBased: false },
    },
  },
  anthropicApi: {
    label: "Anthropic API direct",
    category: "api",
    plans: { "API direct": { price: null, seatBased: false } },
  },
  openaiApi: {
    label: "OpenAI API direct",
    category: "api",
    plans: { "API direct": { price: null, seatBased: false } },
  },
  gemini: {
    label: "Gemini",
    category: "general",
    plans: {
      Free: { price: 0, seatBased: false },
      Pro: { price: 19.99, seatBased: true },
      Ultra: { price: 249.99, seatBased: true },
      API: { price: null, seatBased: false },
    },
  },
  windsurf: {
    label: "Windsurf",
    category: "coding",
    plans: {
      Free: { price: 0, seatBased: false },
      Pro: { price: 20, seatBased: true },
      Max: { price: 200, seatBased: true },
      Teams: { price: 40, seatBased: true },
      Enterprise: { price: null, seatBased: true },
    },
  },
};

export const USE_CASES = ["coding", "writing", "data", "research", "mixed"];

function auditCursor(item, input, currentMonthly) {
  const { seats, plan } = item;
  const teamSize = input.teamSize;

  if (plan === "Enterprise" && seats < 20) {
    const rec = seats * 40;
    return planSwitch(
      "Move to Cursor Business ($40/seat)",
      currentMonthly,
      rec,
      `Enterprise pricing is for 20+ seat procurement with legal/security requirements. At ${seats} seats, Business covers all features you actually use.`,
      "high",
    );
  }
  if ((plan === "Business" || plan === "Enterprise") && teamSize < 5) {
    const rec = seats * 20;
    return planSwitch(
      "Downgrade to Cursor Pro ($20/seat)",
      currentMonthly,
      rec,
      `Business plan ($40/seat) adds admin controls and SSO — unnecessary for ${seats} developers. Pro gives identical AI features.`,
      "high",
    );
  }
  if (input.useCase !== "coding" && plan !== "Hobby") {
    return planSwitch(
      "Consider cancelling Cursor",
      currentMonthly,
      0,
      `Cursor is an AI code editor. For "${input.useCase}" workflows, you'd get more value from Claude Pro or ChatGPT.`,
      "medium",
    );
  }
  return keepCurrent(
    "Spending is appropriate",
    `Cursor ${plan} is the right plan for ${seats} developer(s) doing ${input.useCase} work.`,
  );
}

function auditCopilot(item, input, currentMonthly) {
  const { seats, plan } = item;

  if (input.useCase !== "coding") {
    return planSwitch(
      "Consider cancelling GitHub Copilot",
      currentMonthly,
      0,
      `GitHub Copilot is exclusively a code completion tool. For "${input.useCase}" work, Claude or ChatGPT covers your actual workflow at the same or lower cost.`,
      "high",
    );
  }
  if (plan === "Enterprise" && seats < 50) {
    const rec = seats * 19;
    const savings = currentMonthly - rec;
    return planSwitch(
      "Downgrade to Copilot Business ($19/seat)",
      currentMonthly,
      rec,
      `Enterprise adds audit logs and policy management — worth it at 50+ seats. At ${seats} seats, Business provides identical AI features for $${Math.round(savings)}/mo less.`,
      savings > 100 ? "high" : "medium",
    );
  }
  return keepCurrent(
    "Spending is appropriate",
    `Copilot ${plan} is well-matched for a ${input.useCase} team of ${seats}.`,
  );
}

function auditClaude(item, input, currentMonthly) {
  const { seats, plan } = item;

  if (plan === "Max" && seats === 1) {
    return planSwitch(
      "Evaluate downgrade to Claude Pro",
      currentMonthly,
      20,
      `Claude Max ($100/mo) is for users hitting Pro's daily limits consistently. If you're not regularly rate-limited, Claude Pro at $20/mo saves $80/mo.`,
      "medium",
    );
  }
  if (plan === "Team" && seats < 5) {
    const rec = seats * 20;
    const savings = currentMonthly - rec;
    return planSwitch(
      "Switch to individual Claude Pro plans",
      currentMonthly,
      rec,
      `Claude Team requires a 5-seat minimum at $30/seat = $150/mo minimum. With ${seats} users, individual Pro plans ($20/seat) save $${Math.round(savings)}/mo with no feature loss.`,
      "high",
    );
  }
  return keepCurrent(
    "Well-optimized",
    `Claude ${plan} is a strong match for your ${input.useCase} workflow.`,
  );
}

function auditChatGPT(item, input, currentMonthly) {
  const { seats, plan } = item;

  if (plan === "Team" && seats < 3) {
    const rec = seats * 20;
    return planSwitch(
      "Downgrade to ChatGPT Plus",
      currentMonthly,
      rec,
      `For ${seats} users, Team collaboration controls rarely justify the extra per-seat cost. Plus covers all practical needs.`,
      "medium",
    );
  }
  if (plan === "Plus" && seats >= 1) {
    return {
      recommendation: "Audit for overlap with Claude",
      recommendedMonthly: currentMonthly,
      monthlySavings: 20,
      reason: `ChatGPT Plus ($20/mo) and Claude Pro ($20/mo) are often redundant for the same use case. Pick one as primary and save $20/mo.`,
      severity: "medium",
    };
  }
  return keepCurrent(
    "Spending looks reasonable",
    `ChatGPT ${plan} is appropriately sized for ${seats} users doing ${input.useCase} work.`,
  );
}

function auditGemini(item, input, currentMonthly) {
  const { seats, plan } = item;

  if (
    plan === "Ultra" &&
    input.useCase !== "research" &&
    input.useCase !== "mixed"
  ) {
    const rec = seats * 19.99;
    return planSwitch(
      "Downgrade Gemini Ultra to Pro ($19.99/seat)",
      currentMonthly,
      rec,
      `Gemini Ultra ($249.99/seat) is for heavy document analysis and deep research. For ${input.useCase} work, Pro covers all practical needs at a fraction of the cost.`,
      "high",
    );
  }
  if (
    (plan === "Pro" || plan === "Advanced") &&
    input.useCase !== "research" &&
    input.useCase !== "data"
  ) {
    return {
      recommendation: "Consider switching to Claude Pro",
      recommendedMonthly: currentMonthly,
      monthlySavings: 0,
      reason: `Gemini Pro excels at research and Google Workspace integration. For ${input.useCase} workflows, Claude Pro typically offers better output quality at identical pricing.`,
      severity: "low",
    };
  }
  return keepCurrent(
    "Reasonable spend",
    `Gemini is a solid pick for ${input.useCase} workflows. You're on a plan that fits your team.`,
  );
}

function auditWindsurf(item, input, currentMonthly) {
  const { seats, plan } = item;

  if (input.useCase !== "coding") {
    return planSwitch(
      "Windsurf may not match your use case",
      currentMonthly,
      0,
      `Windsurf is an AI code editor. For "${input.useCase}" workflows, Claude Pro or ChatGPT will serve you better.`,
      "high",
    );
  }
  if (plan === "Max") {
    return planSwitch(
      "Evaluate downgrade to Windsurf Pro ($20/seat)",
      currentMonthly,
      seats * 20,
      `Windsurf Max ($200/seat) is for very high usage. Unless you're hitting hard daily limits, Pro saves $180/seat/mo.`,
      "medium",
    );
  }
  if ((plan === "Teams" || plan === "Enterprise") && seats < 5) {
    const rec = seats * 20;
    return planSwitch(
      "Move small team to Windsurf Pro",
      currentMonthly,
      rec,
      `Teams features are hard to justify before the org needs central billing and analytics.`,
      "medium",
    );
  }
  return keepCurrent(
    "Good value for coding",
    `Windsurf ${plan} is a competitive coding tool at a fair price.`,
  );
}

function auditApiDirect(item, input, currentMonthly) {
  if (currentMonthly >= 300) {
    const rec = currentMonthly * 0.72;
    return planSwitch(
      "Route eligible usage through discounted credits",
      currentMonthly,
      rec,
      `Large API or enterprise commitments are where unused-credit markets (like Credex) can reduce retail spend 15–35% without changing your product workflow.`,
      "high",
    );
  }
  if (currentMonthly >= 100) {
    const rec = currentMonthly * 0.7;
    return planSwitch(
      "Implement prompt caching",
      currentMonthly,
      rec,
      `At $${currentMonthly}/mo, prompt caching (available for Anthropic and OpenAI) can cut costs 30–50% by reusing repeated context. One-time engineering investment.`,
      "medium",
    );
  }
  return keepCurrent(
    "Usage looks proportionate",
    `$${currentMonthly}/mo in API spend is modest. Monitor monthly to ensure it scales with value.`,
  );
}

function planSwitch(
  recommendation,
  currentMonthly,
  recommendedMonthly,
  reason,
  severity = "medium",
) {
  return {
    recommendation,
    recommendedMonthly,
    monthlySavings: Math.max(0, currentMonthly - recommendedMonthly),
    reason,
    severity,
  };
}

function keepCurrent(recommendation, reason) {
  return {
    recommendation,
    recommendedMonthly: 0,
    monthlySavings: 0,
    reason,
    severity: "optimal",
  };
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clampInt(value, min, max) {
  const n = Number.parseInt(String(value ?? min), 10);
  return Number.isNaN(n) ? min : Math.min(max, Math.max(min, n));
}

export function expectedMonthlySpend(item) {
  const tool = TOOLS[item.toolId];
  const plan = tool?.plans?.[item.plan];
  if (!plan || plan.price === null) return Number(item.monthlySpend || 0);
  const seats = plan.seatBased ? Math.max(1, Number(item.seats || 1)) : 1;
  const minSeats = plan.minimumSeats || 0;
  return plan.price * Math.max(seats, minSeats);
}

export function normalizeAuditInput(input) {
  return {
    teamSize: clampInt(input.teamSize, 1, 10000),
    useCase: USE_CASES.includes(input.useCase) ? input.useCase : "mixed",
    tools: Array.isArray(input.tools)
      ? input.tools
          .filter((item) => TOOLS[item.toolId])
          .map((item) => ({
            toolId: item.toolId,
            plan: item.plan,
            monthlySpend: Math.max(0, Number(item.monthlySpend || 0)),
            seats: clampInt(item.seats, 1, 10000),
          }))
      : [],
  };
}

export function runAudit(rawInput) {
  const input = normalizeAuditInput(rawInput);

  const breakdown = input.tools.map((item) => {
    const tool = TOOLS[item.toolId];
    const currentMonthly = roundMoney(
      Number(item.monthlySpend || 0) || expectedMonthlySpend(item),
    );
    let result;

    switch (item.toolId) {
      case "cursor":
        result = auditCursor(item, input, currentMonthly);
        break;
      case "copilot":
        result = auditCopilot(item, input, currentMonthly);
        break;
      case "claude":
        result = auditClaude(item, input, currentMonthly);
        break;
      case "chatgpt":
        result = auditChatGPT(item, input, currentMonthly);
        break;
      case "gemini":
        result = auditGemini(item, input, currentMonthly);
        break;
      case "windsurf":
        result = auditWindsurf(item, input, currentMonthly);
        break;
      case "anthropicApi":
      case "openaiApi":
        result = auditApiDirect(item, input, currentMonthly);
        break;
      default:
        result = keepCurrent(
          "Keep current plan",
          "Current spend is in line with seat count and use case.",
        );
    }

    const recommendedMonthly =
      result.recommendedMonthly === 0 && result.severity === "optimal"
        ? currentMonthly
        : result.recommendedMonthly;

    return {
      toolId: item.toolId,
      toolLabel: tool.label,
      plan: item.plan,
      seats: item.seats,
      currentMonthly,
      recommendation: result.recommendation,
      recommendedMonthly: roundMoney(recommendedMonthly),
      monthlySavings: roundMoney(Math.max(0, result.monthlySavings)),
      reason: result.reason,
      severity: result.severity ?? "optimal",
    };
  });

  const totalCurrentMonthly = roundMoney(
    breakdown.reduce((s, r) => s + r.currentMonthly, 0),
  );
  const totalRecommendedMonthly = roundMoney(
    breakdown.reduce((s, r) => s + r.recommendedMonthly, 0),
  );
  const totalMonthlySavings = roundMoney(
    Math.max(0, totalCurrentMonthly - totalRecommendedMonthly),
  );
  const totalAnnualSavings = roundMoney(totalMonthlySavings * 12);
  const leadTier =
    totalMonthlySavings > 500
      ? "high"
      : totalMonthlySavings < 100
        ? "low"
        : "medium";

  return {
    input,
    generatedAt: new Date().toISOString(),
    totalCurrentMonthly,
    totalRecommendedMonthly,
    totalMonthlySavings,
    totalAnnualSavings,
    leadTier,
    verdict:
      leadTier === "high"
        ? "Credex can likely recover a meaningful portion of this spend through discounted credits and plan cleanup."
        : leadTier === "low"
          ? "You are already spending carefully. Keep monitoring plan changes and credit availability."
          : "There is a practical savings opportunity, mostly from plan right-sizing and vendor consolidation.",
    breakdown,
  };
}

export function makePublicAuditPayload(audit) {
  return {
    v: 1,
    generatedAt: audit.generatedAt,
    input: audit.input,
    totals: {
      current: audit.totalCurrentMonthly,
      recommended: audit.totalRecommendedMonthly,
      monthlySavings: audit.totalMonthlySavings,
      annualSavings: audit.totalAnnualSavings,
      leadTier: audit.leadTier,
    },
    breakdown: audit.breakdown.map(
      ({
        toolLabel,
        plan,
        currentMonthly,
        recommendation,
        recommendedMonthly,
        monthlySavings,
        reason,
      }) => ({
        toolLabel,
        plan,
        currentMonthly,
        recommendation,
        recommendedMonthly,
        monthlySavings,
        reason,
      }),
    ),
  };
}

export function encodeAuditId(payload) {
  const json = JSON.stringify(payload);
  if (typeof Buffer !== "undefined")
    return Buffer.from(json).toString("base64url");
  return btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function decodeAuditId(id) {
  try {
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(id, "base64url").toString("utf8")
        : decodeURIComponent(
            escape(atob(id.replaceAll("-", "+").replaceAll("_", "/"))),
          );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function fallbackSummary(audit) {
  const top = [...audit.breakdown].sort(
    (a, b) => b.monthlySavings - a.monthlySavings,
  )[0];
  if (audit.totalMonthlySavings < 100) {
    return `Your AI stack is already fairly disciplined: projected savings are about $${audit.totalMonthlySavings.toLocaleString()}/mo. The main next step is monitoring vendor plan changes and credit availability rather than forcing unnecessary churn. Keep seat counts tight, review API spend monthly, and revisit this audit when your team or usage changes.`;
  }
  return `Your current AI stack is spending about $${audit.totalCurrentMonthly.toLocaleString()}/mo, with a realistic savings opportunity of $${audit.totalMonthlySavings.toLocaleString()}/mo or $${audit.totalAnnualSavings.toLocaleString()}/yr. The biggest lever is ${top?.toolLabel || "your highest-cost tool"}: ${top?.reason || "right-size seats and replace retail spend where credits fit"}. The recommendation is not to cut useful tools, but to move each workflow onto the cheapest plan or credit path that still fits the team.`;
}
