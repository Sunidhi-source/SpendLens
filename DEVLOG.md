## Day 1 — 7 May 2026

**Hours worked:** 4

**What I did:**
Read the full Credex brief twice. Identified that the audit engine is the
riskiest part — if the pricing logic is wrong, nothing else matters — so I
built and tested it before touching any UI. Scaffolded the Next.js 14 app
with TypeScript and Tailwind, wrote the deterministic audit engine covering
all 8 required tools, and added 6 passing unit tests using Node's built-in
test runner (no extra deps). Also wired up the GitHub Actions CI so every
push to main runs lint and tests automatically.

**What I learned:**
API-direct spend cannot be compared directly to per-seat subscription
pricing. An early version of the engine was recommending a $20 ChatGPT
subscription as a replacement for a $2,600 OpenAI API bill — which is
absurd. I added a category guard so API-direct tools only get credit/
model-routing recommendations, never plan-downgrade recommendations meant
for subscription tools.

**Blockers / what I'm stuck on:**
Need to verify all 8 vendor pricing pages manually and fill PRICING_DATA.md
dates before submission. Also need to line up 3 real user interviews this
week — going to DM founders tomorrow.

**Plan for tomorrow:**
Build the form UI and results page. Wire localStorage persistence. Get the
full user-facing flow working end-to-end so I can test it with real inputs.

## Day 2 — 8 May 2026

**Hours worked:** 3.5

**What I did:**
Built the full one-page UI: spend input form, live results panel, per-tool
breakdown cards, and the summary band showing total monthly and annual
savings. Form state persists to localStorage on every keystroke so page
reloads never lose input. Wired the share URL generation using the URL-
encoded public payload from the audit engine — no database read needed for
the public report, which simplifies the architecture considerably. Ran
through three manual test scenarios (lean stack, bloated stack, mixed API
and subscriptions) and fixed two display bugs.

**What I learned:**
The "no login before value" constraint shapes the whole UX. I had originally
put email capture above the fold, then re-read the brief and moved it below
the results. That single change makes the product feel less aggressive and
more useful, and it matches what every SaaS user actually wants.

**Blockers / what I'm stuck on:**
CSS polish is roughly 70% done. The results page needs more visual hierarchy
on the savings number — it should be the first thing your eye goes to on
the screenshot. Tackling that tomorrow alongside the AI summary endpoint.

**Plan for tomorrow:**
Build /api/summary (AI-generated summary with fallback), build /api/leads
(Supabase + Resend), and add the public /audit/[id] share page. Then try
to do the first user interview.

## Day 3 — 9 May 2026

**Hours worked:** 4

**What I did:**
Wired all three API routes. /api/summary tries Anthropic first, then Gemini
(free tier, 60 req/min), then Groq (generous free tier), then falls back to
a templated summary — so the app works fully without any paid API key. This
was a deliberate design decision: most evaluators won't have Anthropic
credits, and a graceful fallback chain shows I understand production
dependencies. /api/leads validates email, rejects honeypot submissions,
applies a simple in-memory IP rate limit (10 requests per IP per hour),
stores in Supabase, and sends a confirmation email via Resend. The public
/audit/[id] page decodes the payload from the URL — no DB read — and
renders full OG + Twitter card metadata so shared links look clean.

**What I learned:**
Supabase's service role key must never be exposed client-side. I spent 30
minutes debugging a 401 because I had accidentally used the anon key for a
row-insert that requires service-role. Added a comment in the code to make
this obvious to future readers.

**Blockers / what I'm stuck on:**
Haven't deployed yet. Need Vercel env vars and a real Supabase project to
test lead storage end-to-end. Scheduling that for Day 5 after the UI polish
is done. First user interview is booked for tomorrow morning.

**Plan for tomorrow:**
Run first user interview. Write PRICING_DATA.md with real verified dates.
Start filling out the entrepreneurial files (GTM, ECONOMICS).
