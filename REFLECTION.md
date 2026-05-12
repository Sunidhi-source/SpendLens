# Reflection

## 1. The hardest bug you hit this week, and how you debugged it

The hardest bug was in the audit engine's handling of API-direct spend.
On day 1, the first test run showed that a $2,600 OpenAI API bill was being
"optimised" with a recommendation to switch to a $20 ChatGPT Plus
subscription — a saving of $2,580/month that was completely nonsensical.
My first hypothesis was that the recommendation sorter was just picking the
largest nominal saving without understanding what category of tool it was
dealing with. I reproduced it in isolation with a Node test, then traced
through `alternativeRecommendation` in the engine. The problem was that the
comparison logic had no guard for tool category: API direct spend was being
lined up against subscription plans as if they were substitutes.

I added a category field to TOOLS and a guard inside the audit switch: tools
with category === "api" only receive credit/model-routing recommendations,
never plan-downgrade recommendations that assume a GUI subscription product.
After the fix, the same $2,600 input correctly produced a "consider Credex
discounted credits for 15–35% savings" recommendation at $728/month — still
meaningful and now defensible.

What made it hard was that the output looked plausible at first glance: the
savings were large and the recommended tool was real. I only caught it
because I had written a test that checked the recommendation text contained
the word "credits," which failed. That test exists because of this bug. The
lesson I took from it: in an audit tool, a wrong recommendation that sounds
reasonable is more dangerous than a crash — a crash is obvious, but a
confident wrong answer gets forwarded to a CFO.

## 2. A decision you reversed mid-week, and what made you reverse it

On day 1, I chose to encode the public audit payload directly into the share
URL using base64url — no database read, no round-trip, the share page works
purely from what's in the link. I committed to this approach, shipped the
encode/decode functions, and wrote a test for PII stripping. It worked.

On day 3, I started reversing it. The URLs looked unwieldy — a 200-character
string in the address bar — and I convinced myself that Supabase UUIDs would
look cleaner and more trustworthy. I opened a new file, started writing the
insert and fetch logic, got about 40 lines in, and stopped.

What made me reverse the reversal was re-reading what I'd just built. The
Supabase version would have added a DB dependency to a page that currently
has none, introduced a new failure mode (what happens when Supabase is slow
or down during a share?), and cost a read per page load at scale. The only
thing it fixed was that the URL would look shorter. That is a vanity change,
not a product improvement.

The deeper lesson was about what "cleaner" actually means. I was using it to
mean "aesthetically tidier," but the URL-encoded version is architecturally
cleaner: fewer moving parts, faster, more resilient. I had to consciously
separate those two meanings before I could make the right call. If I'd
followed the instinct to polish the URL, I'd have shipped more infrastructure
for zero user benefit and made the codebase harder to reason about. The
40-line abandoned file is still in my local git stash as a reminder.

## 3. What I would build in week 2

The first thing I'd build is benchmark mode: "your AI spend per developer is
$X — seed-stage companies your size average $Y." This is the feature that
turns the audit from self-assessment into external validation. It also gives
Credex a defensible data asset that no generic calculator can replicate,
because real benchmarks require real audit data.

The benchmark would need about three days to do properly: one day to design
the anonymized aggregation schema and decide what "companies your size" means
in practice (headcount bands, funding stage, use case), one day to build the
query and the UI treatment, and one day to verify the numbers don't mislead
users whose stack is genuinely unusual. I would not ship a benchmark that
makes a lean solo founder feel like they're underspending, so the display
logic would need to account for outliers.

After benchmarking, I'd build the embeddable widget — a `<script>` tag that
any SaaS blog or newsletter could drop in, letting readers run an audit
without leaving the post. That's the distribution lever the share URL alone
can't create, because the share URL requires someone to have already run an
audit. The widget removes that dependency and puts the entry point wherever
the audience already is.

The final day of week 2 would be instrumentation: wiring the analytics
events I described in METRICS.md, caching LLM summaries by audit hash so
repeated inputs don't burn API tokens, and moving rate limiting from
in-memory to Upstash Redis so it survives deploys. None of that is visible
to users, but without it the funnel data from week 2 onwards is unreliable.

## 4. How I used AI tools

I used Claude (claude.ai) and Cursor throughout the week. Claude was most
useful for two things: first, drafting the initial per-tool audit logic for
tools I was less familiar with (Windsurf's plan tier boundaries, Gemini's
Ultra pricing position) — I then manually verified every number against the
vendor's pricing page before committing it. Second, Claude helped me write
the Mermaid system diagram in ARCHITECTURE.md faster than I would have done
by hand.

What I deliberately didn't use AI for: the audit engine's core decision
logic. The brief says "the logic must be defensible — a finance person
should read your reasoning and agree." An LLM generating audit rules would
produce plausible-sounding but untraceable reasoning. I wrote all the
conditionals by hand and traced each one back to a real pricing page.

One specific time Claude was wrong: I asked it to estimate GitHub Copilot
Business pricing and it said $19/seat/month, which is correct. But it also
said the minimum seat count was 5. There is no minimum seat count for
Copilot Business — that's a Claude/Team constraint. I caught it by opening
the GitHub pricing page before writing the code, which is the right order
of operations.

## 5. Self-ratings

**Discipline: 7/10** — I committed on 7 distinct days and did real user
interviews, but I left the entrepreneurial files until day 4, which meant I
rushed GTM and ECONOMICS slightly.

**Code quality: 8/10** — The audit engine is clean, typed, tested, and has
no magic numbers that don't trace back to a comment or PRICING_DATA.md.
The API routes are straightforward. The main area I'd improve is the CSS,
which works but could be better componentised.

**Design sense: 7/10** — The results page is screenshot-worthy and the
savings number is prominent. I didn't attempt anything unusually creative
with the layout. The design is correct but not memorable.

**Problem-solving: 8/10** — Catching the API vs subscription category bug
on day 1 and the free-tier AI fallback chain were both good calls that
required thinking about what could go wrong in production.

**Entrepreneurial thinking: 7/10** — The GTM plan has real channels and
real first-week numbers rather than generic "do SEO" advice. The economics
model is honest about where the conversion math gets tight. I talked to
three real users. I'd rate myself lower if the interviews hadn't happened.

## Day 7 — 2026-05-13

**Hours worked:** 2.5

**What I did:**
Final review pass on all 12 required markdown files. Checked every URL in
PRICING_DATA.md is still live. Re-ran `npm test` — 8 tests, all passing.
Re-ran Lighthouse on the deployed URL: 91 / 93 / 95 (Performance /
Accessibility / Best Practices). Recorded a 35-second Loom walkthrough of
the audit flow and added the link to README.md. Verified the share URL
works end-to-end: completed an audit, copied the public link, opened it in
an incognito window, confirmed all OG metadata renders correctly. Submitted
the Google Form.

**What I learned:**
The most valuable thing I built this week wasn't the code — it was the three
user interviews. They changed two design decisions and gave me language I
wouldn't have used on my own ("actually honest" is better copy than anything
I wrote in LANDING_COPY.md). If I had one week again, I'd do interviews on
day 1 instead of day 4.

**Blockers / what I'm stuck on:**
None — submitted.

**Plan for tomorrow:**
Wait for Round 2 results. If shortlisted, review code and prepare to walk
through ECONOMICS.md decisions in detail.
