export const PRICING = {
  cursor: {
    hobby: { monthly: 0, name: "Hobby" },
    pro: { monthly: 20, name: "Pro" },
    business: { monthly: 40, name: "Business" },
    enterprise: { monthly: 100, name: "Enterprise (est.)" },
  },
  github_copilot: {
    individual: { monthly: 10, name: "Individual" },
    business: { monthly: 19, name: "Business" },
    enterprise: { monthly: 39, name: "Enterprise" },
  },
  claude: {
    free: { monthly: 0, name: "Free" },
    pro: { monthly: 20, name: "Pro" },
    max: { monthly: 100, name: "Max" },
    team: { monthly: 30, name: "Team" }, // per seat
    enterprise: { monthly: 0, name: "Enterprise (custom)" },
    api: { monthly: 0, name: "API Direct (usage)" },
  },
  chatgpt: {
    plus: { monthly: 20, name: "Plus" },
    team: { monthly: 30, name: "Team" }, // per seat
    enterprise: { monthly: 0, name: "Enterprise (custom)" },
    api: { monthly: 0, name: "API Direct (usage)" },
  },
  gemini: {
    pro: { monthly: 20, name: "Gemini Advanced" },
    ultra: { monthly: 0, name: "Ultra (custom)" },
    api: { monthly: 0, name: "API (usage-based)" },
  },
  windsurf: {
    free: { monthly: 0, name: "Free" },
    pro: { monthly: 15, name: "Pro" },
    team: { monthly: 35, name: "Team" },
  },
} as const;
