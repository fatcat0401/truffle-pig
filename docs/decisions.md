# Decisions

Short records of the choices that shaped Truffle Pig: the problem, what was chosen, and what it costs.

## 1. A shared 6-hour job cache

**Problem.** Every search costs Brave API calls, and the same role + city is searched again and again.
**Decision.** Store results in one `jobs` table keyed by platform + query and reuse them for 6 hours
(`lib/jobs.ts`). Match % is computed per user at read time, so the cache holds no personal data.
**Cost.** Results can be up to 6 hours old. The table is never pruned.

## 2. Public ATS APIs instead of scraping

**Problem.** The original course used Firecrawl, a paid scraper, to read job pages.
**Decision.** Greenhouse, Lever and Workable each publish a free, keyless JSON API for every public posting.
`lib/job-details.ts` calls those and turns a 404 into "job closed" (HTTP 410).
**Cost.** Only works for those three. LinkedIn has no public API, so its Details pane shows the search snippet and
a link.

## 3. SEEK and Jora as deep links, not sources

**Problem.** SEEK and Jora are the biggest Australian boards, but tests with Brave showed only their list pages
are indexed, and they offer no public API.
**Decision.** Build "Also search on" links with the same role and city (`lib/job-boards.ts`). No requests, no
scraping.
**Cost.** Those jobs are not ranked or saved inside the app.

## 4. Search tuned for Australia

**Problem.** Searches like `"Data Engineer" Giralang ACT 2617` returned random jobs from other countries.
**Decision.** Reduce the profile location to a city (`buildSearchPlace`: suburb + state code -> capital), always
quote the role, send `country=AU` and `freshness=pm`, and use bare `site:` domains with a URL pattern filter
because Brave ignores `site:` with a path. Drop LinkedIn's identical "64% of job seekers…" snippet so match %
is not scoring an advert.
**Cost.** `country=AU` only biases results. ATS sources are global, so overseas jobs still appear.

## 5. Detect, map, fill, with Stagehand as a fallback

**Problem.** An AI browser agent per form is slow and costs a model call per action; plain selectors break on
unusual forms.
**Decision.** Read the form once (detect), decide all values in one place (map), then fill with ordinary
`playwright-core` calls. Only fields that fail go to Stagehand `act()`, with values passed as variables.
**Cost.** Two Browserbase sessions per run. Custom React dropdowns still rely on the fallback.

## 6. `field_label_maps`: learn labels once

**Problem.** "Phone number", "Mobile" and "Contact number" are the same fact, and asking Gemini every time is
slow.
**Decision.** When Gemini's answer equals a profile fact exactly, store `(platform, normalised label) ->
profile_key`. Next time that label is filled without a model call (`lib/apply/map.ts`).
**Cost.** Only simple text facts are learned, not free-text answers.

## 7. A faster Gemini model and a 15-second timeout

**Problem.** `gemini-3.8-flash` took over 30 s for job details, once 152 s for a trivial prompt.
**Decision.** Benchmarked and switched to `gemini-3.5-flash-lite` (about 2 s, same answers). Level and tags are
wrapped in `withTimeout(…, 15 s)`: if Gemini is slow, Details still saves the ATS data without them.
**Cost.** Some jobs have no level or tags.

## 8. Dry run by default, a human for every gap

**Problem.** Real recruiters read these applications. A wrong or invented answer is worse than none.
**Decision.** `APPLY_DRY_RUN=true` unless changed on purpose. The mapping prompt must return `null` rather than
guess, and any empty required field stops the run at `missing_info`. AI Autofill only drafts answers in the
dialog, is told not to claim experience the profile lacks, and nothing is used until you save.
**Cost.** Every new form needs a few minutes of your time.

## 9. Personal app, single-user lock

**Problem.** The course built a SaaS (Stripe, free-plan limits). This is a tool for one person.
**Decision.** Removed plans, limits and billing. Kept Google sign-in, and added `ALLOWED_EMAILS`, checked in the
OAuth callback, middleware and every API route, failing closed. Turning off sign-ups in Supabase Auth adds a
second lock.
**Cost.** Adding a second user means editing an env var.
