export type ToolId =
  | "cursor"
  | "copilot"
  | "claude"
  | "chatgpt"
  | "anthropicApi"
  | "openaiApi"
  | "gemini"
  | "windsurf";

export type UseCase = "coding" | "writing" | "data" | "research" | "mixed";
export type LeadTier = "high" | "medium" | "low";
export type Severity = "high" | "medium" | "low" | "optimal";

export interface ToolRow {
  toolId: string;
  plan: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditInput {
  teamSize: number;
  useCase: string;
  tools: ToolRow[];
}

export interface BreakdownRow {
  toolId: string;
  toolLabel: string;
  plan: string;
  seats: number;
  currentMonthly: number;
  recommendation: string;
  recommendedMonthly: number;
  monthlySavings: number;
  reason: string;
  severity: Severity;
}

export interface AuditResult {
  input: AuditInput;
  generatedAt: string;
  totalCurrentMonthly: number;
  totalRecommendedMonthly: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  leadTier: LeadTier;
  verdict: string;
  breakdown: BreakdownRow[];
}

export interface PublicAuditPayload {
  v: number;
  generatedAt: string;
  input: AuditInput;
  totals: {
    current: number;
    recommended: number;
    monthlySavings: number;
    annualSavings: number;
    leadTier: LeadTier;
  };
  breakdown: Pick<
    BreakdownRow,
    | "toolLabel"
    | "plan"
    | "currentMonthly"
    | "recommendation"
    | "recommendedMonthly"
    | "monthlySavings"
    | "reason"
  >[];
}
