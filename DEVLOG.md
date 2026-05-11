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

## Day 4 — 10 may 2026

**Hours worked:** 3

**What I did:**
Spent the morning on user interview 1 (see USER_INTERVIEWS.md — spoke with
a seed-stage CTO for 15 minutes over a DM call). His feedback changed one
thing: I had the Credex CTA using the word "consultation," which he said
read as "sales call." Changed it to "credit review" — less threatening,
more specific. Spent the afternoon verifying all vendor pricing pages
manually, recording exact URLs and dates in PRICING_DATA.md. Also wrote
GTM.md and ECONOMICS.md from scratch — tried to make the numbers honest
rather than impressive. If the conversion math doesn't work, it shouldn't
be hidden.

**What I learned:**
The user interview was more useful than I expected. The CTO didn't find the
audit results suspicious — he found the form suspicious. He said "I don't
know why I'd trust these numbers." That told me I need to be more explicit
about where the pricing data comes from on the results page. Added a small
"Pricing sources: official vendor pages, verified YYYY-MM-DD" line to the
results footer.

**Blockers / what I'm stuck on:**
Need 2 more user interviews. Going to post a "quick 10-min chat?" ask in
Indie Hackers and one Slack community tomorrow. Also need to deploy.

**Plan for tomorrow:**
Deploy to Vercel, wire Supabase in prod, run Lighthouse. Fix anything that
drops below 85/90/90. Run interview 2.

## Day 5 — 11 May 2026

**Hours worked:** 5

**What I did:**
Deployed to Vercel. First deploy failed because NEXT_PUBLIC_CREDEX_BOOKING_URL
was not in the Vercel project settings — the build succeeded but the client
received undefined. Fixed by adding env vars in the Vercel dashboard and
redeploying. Ran Lighthouse on the deployed URL: Performance 91, Accessibility
88, Best Practices 95. Accessibility was two points short of the 90 target.
Fixed: missing aria-labels on icon-only buttons, improved focus ring contrast
ratio, added lang="en" to the html element. Re-ran: 93 Accessibility. Wired
real Supabase project and tested lead storage — one lead inserted, one
Resend confirmation email received. Ran interview 2 (see USER_INTERVIEWS.md).

**What I learned:**
aria-label on an icon-only button is not optional. The Lighthouse Accessibility
audit flagged three buttons that only had an icon as content with no label —
the Trash2 and Copy icons in the form. Easy fix, significant impact on score.

**Blockers / what I'm stuck on:**
Interview 3 still needed. REFLECTION.md questions 2–5 still mostly drafts.
DEVLOG Day 6–7 also pending. Plan to finish those tomorrow and Sunday.

**Plan for tomorrow:**
Run interview 3. Finish REFLECTION.md. Add TESTS.md. Final pass on all files.
Consider attempting PDF export bonus if time allows.
