export type ToolId =
  | "cursor"
  | "github_copilot"
  | "claude"
  | "chatgpt"
  | "anthropic_api"
  | "openai_api"
  | "gemini"
  | "windsurf";

export type UseCase = "coding" | "writing" | "data" | "research" | "mixed";

export interface ToolEntry {
  toolId: ToolId;
  plan: string;
  monthlySpend: number; // USD, total (not per seat)
  seats: number;
}

export interface AuditInput {
  tools: ToolEntry[];
  teamSize: number;
  useCase: UseCase;
}

export interface ToolRecommendation {
  toolId: ToolId;
  toolName: string;
  currentSpend: number;
  recommendedAction: string;
  reason: string;
  monthlySavings: number;
}

export interface AuditResult {
  recommendations: ToolRecommendation[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  aiSummary?: string;
  isOptimal: boolean;
}
