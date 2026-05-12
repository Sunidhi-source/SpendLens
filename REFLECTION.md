# Reflection

## 1. The hardest bug you hit this week, and how you debugged it

The hardest bug was in the audit engine's handling of API-direct spend.
On day 1, the first test run showed that a $2,600 OpenAI API bill was being
"optimised" with a recommendation to switch to a $20 ChatGPT Plus
subscrition — a saving of $2,580/month that was completely nonsensical.
My first hypothesis was that the recommendation sorter was just picking the
largest nominal saving without understanding what category of tool it was
dealing with. I reproduced it in isolation with a Node test, then traced
through `alternativeRecommendation` in the engine. The problem was that the
comparison logic had no guard for tool category: API direct spend was being
lined up against subscription plans as if they were substitutes.

I added a category field to TOOLS and a guard inside the audit switch: tools
with category === "api" only receive credit/model-routing recommendations,
never plan-downgrade recommendations that assume a GUI subscription product.
After the fix, the same $2600 input correctly produced a "consider Credex
discounted credits for 15–35% savings" recommendation at $728/month — still
meaningful and now defensible.

What made it hard was that the output looked plausible at first glance: the
savings were large and the recommended tool was real. I only caught it
because I had written a test that checked the recommendation text contained
the word "credits," which failed. That test exists because of this bug.

## 2. A decision you reversed mid-week, and what made you reverse it

I originally used the URL-encoded public payload approach (no DB for public
reports) from day 1, but on day 3 I nearly switched to storing reports in
Supabase with short UUIDs because the base64url IDs in the address bar look
unwieldy. I started writing the Supabase insert and fetch logic for reports.

I reversed it after reading the brief again: "Each audit gets a unique
public URL" with "identifying details stripped." The URL-encoded approach
achieves both of those properties without a DB round-trip, which means the
share page loads instantly, works even if Supabase has an outage, and costs
zero reads. The ugly URL is a UX trade-off I can live with. The Supabase
version would have been cleaner to look at but added a dependency for zero
extra benefit at MVP scale.

The reversal happened mid-way through day 3 when I read back what I'd just
written and realised I was adding complexity because I didn't like how the
URL looked, not because the architecture needed it.

## 3. What I would build in week 2

In week 2 I would build the benchmark mode first. The "your AI spend per
developer is $X vs companies your size average $Y" feature is the one that
makes the audit feel like external validation rather than self-assessment.
It's also Credex's most defensible asset: no generic calculator can show
real benchmarks because they don't have the data. After three days of
benchmarking, I'd build a lightweight embeddable widget — a `<script>` tag
version that any SaaS blog could drop in to let their readers audit from the
post without leaving. That's the distribution mechanism that could drive
thousands of audits without any paid spend. The last day of week 2 would be
hardening: caching LLM summaries by audit hash, moving rate limiting to
Upstash Redis, and adding analytics instrumentation to actually measure the
funnel I described in METRICS.md.

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
