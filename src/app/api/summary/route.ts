import { NextResponse } from "next/server";
import { generateAISummary } from "@/lib/ai-summary";

export async function POST(request: Request) {
  try {
    const { audit } = await request.json();
    const { summary, source } = await generateAISummary(audit);
    return NextResponse.json({ summary, source });
  } catch {
    return NextResponse.json(
      { summary: null, source: "error" },
      { status: 500 },
    );
  }
}
