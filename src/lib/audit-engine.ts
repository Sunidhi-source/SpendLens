import {
  AuditInput,
  AuditResult,
  ToolRecommendation,
  ToolEntry,
} from "@/types";

function auditCursor(tool: ToolEntry, teamSize: number): ToolRecommendation {
  const base: ToolRecommendation = {
    toolId: "cursor",
    toolName: "Cursor",
    currentSpend: tool.monthlySpend,
    recommendedAction: "",
    reason: "",
    monthlySavings: 0,
  };

  const perSeat = tool.monthlySpend / tool.seats;

  if (tool.plan === "business" && tool.seats <= 3) {
    const proTotal = tool.seats * 20;
    const savings = tool.monthlySpend - proTotal;
    return {
      ...base,
      recommendedAction: `Downgrade to Cursor Pro ($20/seat)`,
      reason: `Business plan is designed for teams >5. With ${tool.seats} seats, Pro gives identical features at $20/seat vs $40/seat.`,
      monthlySavings: savings > 0 ? savings : 0,
    };
  }

  if (tool.plan === "enterprise" && tool.seats < 20) {
    return {
      ...base,
      recommendedAction: "Move to Business plan",
      reason:
        "Enterprise pricing is only cost-effective at 20+ seats. Business plan covers your needs.",
      monthlySavings: Math.max(0, tool.monthlySpend - tool.seats * 40),
    };
  }

  return {
    ...base,
    recommendedAction: "No change needed",
    reason: `Your ${tool.plan} plan is appropriate for ${tool.seats} seats.`,
    monthlySavings: 0,
  };
}

function auditClaude(
  tool: ToolEntry,
  teamSize: number,
  useCase: string,
): ToolRecommendation {
  const base: ToolRecommendation = {
    toolId: "claude",
    toolName: "Claude (Anthropic)",
    currentSpend: tool.monthlySpend,
    recommendedAction: "",
    reason: "",
    monthlySavings: 0,
  };

  if (tool.plan === "max" && useCase === "coding") {
    const proSavings = tool.monthlySpend - tool.seats * 20;
    return {
      ...base,
      recommendedAction: "Consider Claude Pro ($20/mo)",
      reason:
        "Max plan ($100/mo) is for very heavy research usage. For coding workflows, Pro plan covers typical daily limits. Review your actual usage before committing.",
      monthlySavings: proSavings > 0 ? proSavings : 0,
    };
  }

  if (tool.plan === "team" && tool.seats <= 2) {
    return {
      ...base,
      recommendedAction: "Switch to individual Pro plans",
      reason:
        "Team plan requires a minimum of 5 seats. With 2 users, two Pro plans at $20/seat = $40/mo vs Team minimum of $150/mo.",
      monthlySavings: Math.max(0, tool.monthlySpend - tool.seats * 20),
    };
  }

  return {
    ...base,
    recommendedAction: "Spending looks reasonable",
    reason: `${tool.plan} plan is a solid fit for your stated use case and team size.`,
    monthlySavings: 0,
  };
}

export function runAudit(input: AuditInput): AuditResult {
  const recommendations: ToolRecommendation[] = [];

  for (const tool of input.tools) {
    if (tool.monthlySpend === 0) continue;

    let rec: ToolRecommendation;
    switch (tool.toolId) {
      case "cursor":
        rec = auditCursor(tool, input.teamSize);
        break;
      case "claude":
        rec = auditClaude(tool, input.teamSize, input.useCase);
        break;

      default:
        rec = {
          toolId: tool.toolId,
          toolName: tool.toolId,
          currentSpend: tool.monthlySpend,
          recommendedAction: "Review manually",
          reason: "Audit rule not yet defined for this tool.",
          monthlySavings: 0,
        };
    }
    recommendations.push(rec);
  }

  const totalMonthlySavings = recommendations.reduce(
    (s, r) => s + r.monthlySavings,
    0,
  );
  const isOptimal = totalMonthlySavings < 10;

  return {
    recommendations,
    totalMonthlySavings,
    totalAnnualSavings: totalMonthlySavings * 12,
    isOptimal,
  };
}
