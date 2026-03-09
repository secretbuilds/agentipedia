# Agentipedia — Decision Brief

## The Bet

A hypothesis-scoped platform that auto-parses autoresearch outputs (results.tsv + evolved code), enables cross-run comparison within shared challenges, and supports forking — becoming the canonical registry where AI research agents publish and compound their findings.

## SCQA

- **Situation:** Autoresearch produces structured output (results.tsv + evolved code files) but this output sits in local directories after runs finish
- **Complication:** No system exists for ingesting, parsing, comparing, or building on these outputs — researchers manually eyeball TSV files with no way to compound progress across the community
- **Question:** How should autoresearch outputs be managed, processed, and surfaced to maximize insight extraction and compounding?
- **Answer:** A hypothesis-scoped platform with structured intake, auto-parsed metrics, cross-run comparison, and forking — turning raw experiment dumps into queryable, forkable research artifacts

## Verdict Matrix

| Dimension | Verdict | Key Finding |
|-----------|---------|-------------|
| Market | AMBER | TAM $1.1B+ (experiment tracking) but beachhead is ~200-2K people. Neptune and Papers with Code just died (March and July 2025), creating displacement. Window is narrow — HuggingFace 90 days from building this as a feature. |
| Technical | GREEN | Fully feasible. Everything off-the-shelf (Next.js + Supabase + Vercel + shadcn/ui). Only custom builds: CLI tool (~200 lines) + PAT auth system (~2 days). |
| User | GREEN | Karpathy described this exact product as autoresearch's next step. Compounding already happening manually in GitHub Discussions (#43 building on #32). AgentRxiv paper validates agents sharing outputs improve 13.7% faster. 8K+ GitHub stars in 2 days. |
| Business | AMBER | Lifestyle business with venture optionality. Infra <$200/mo at 10K users. HuggingFace precedent: 5 years free community → $130M ARR. Not monetized now — correct instinct. |
| Risk | RED | Karpathy tweeted about building the collaborative layer himself ("SETI@home style"). HuggingFace has Trackio + Spaces + Leaderboards ready to connect. X/Twitter API is existential single dependency. |

## The Opportunity

Autoresearch was open-sourced 2 days ago and already has 11K+ stars and 1.9K forks. The community is forming right now around GitHub Discussions — a tool Karpathy himself says is "almost but not really suited" for this collaboration. Two major experiment-sharing platforms (Neptune, Papers with Code) just shut down, orphaning their communities. The upper-right quadrant of the market (community-oriented + agent-experiment-specific) is completely empty.

## Critical Tensions

1. **Demand vs. Friction:** Users want cross-run comparison (validated), but will they change workflow to upload to a third-party platform? The CLI hook must make sharing as automatic as `git push` or adoption dies.

2. **Speed vs. Karpathy:** The creator of autoresearch has publicly described building exactly this. If Agentipedia ships in weeks and becomes where results already live, switching costs accrue. If it takes months, a `--share` flag in the autoresearch repo makes it irrelevant.

3. **Community depth vs. Breadth:** The platform needs 10+ runs per hypothesis for network effects to kick in. With only ~hundreds of active practitioners, should it go narrow (seed 5-10 hypotheses deeply) or wide (support every domain from day one)?

## Kill Criteria Status

| Criterion | Status | Evidence |
|-----------|--------|----------|
| No adoption — researchers won't change workflow | AMBER | Demand signal is strong (Karpathy's words, manual compounding behavior), but GitHub Discussions may be "good enough." CLI automation is the mitigation — near-zero friction upload. |
| Commoditized by incumbents | AMBER | HuggingFace and W&B have the pieces but haven't assembled them. Karpathy is the real threat — he could add a `--share` flag. Speed is the only defense. |
| Output format fragments | AMBER | Currently standardized (5-column TSV), but autoresearch is 2 days old. Domain expansion (trading, robotics) will create schema pressure. Enforce second-column-is-metric convention for MVP. |
| Processing adds no value | CLEAR | The cross-run comparison chart overlaying all runs on one hypothesis is the feature GitHub Discussions cannot replicate. AgentRxiv proves structured sharing accelerates research 13.7%. |
| No compounding | CLEAR | Already happening manually — Discussion #43 explicitly built on #32's findings. Fork lineage and cross-run comparison would automate what researchers are doing by hand. |

## Recommended Action

**GO — with extreme urgency.**

The evidence supports building. The demand is real (creator-validated), the tech is trivial, the costs are negligible, and the timing window is the narrowest we've seen — measured in weeks, not months. The risk of commoditization is real but is a speed problem, not a viability problem. Ship the MVP before Karpathy ships `--share`.

## MVP Definition

- **Core value prop:** See what worked across all runs on a shared research challenge — the thing GitHub Discussions can't do
- **Primary user:** ML researcher running Karpathy's autoresearch loop, active on X/Twitter
- **MVP scope:** Hypothesis feed + hypothesis detail page with cross-run progression chart + run submission (browser upload) + auto-parsed results.tsv metrics + X/Twitter OAuth. No CLI, no forking, no comments in V1.
- **Revenue model:** None now. Enterprise tier (private hypotheses, team features) when community hits critical mass. HuggingFace playbook.
- **First 1,000 users:** Seed 5-10 hypotheses from existing GitHub Discussion data. Post to autoresearch community on X. Submit PR to autoresearch repo with optional Agentipedia integration. Founder's existing X community as launchpad.
- **Tech stack:** Next.js 15 (App Router) + Tailwind/shadcn/ui + Supabase (Auth, Postgres, Storage) + Vercel + PapaParse + Recharts
- **First milestone (activation metric):** A user submits their first run to someone else's hypothesis

---

## Appendix: Key Sources

### Market
- MLOps market: $2.3B (2025), projected $8B (2029) — Technavio, Precedence Research
- W&B acquired by CoreWeave for $1.7B (March 2025)
- Neptune acquired by OpenAI, shut down March 5, 2026
- Papers with Code shut down by Meta, July 2025
- HuggingFace: $4.5B valuation, $130M ARR, 80M+ monthly visits
- Autoresearch: 11K+ stars, 1.9K forks in first 2 days

### Technical
- Autoresearch output: standardized 5-column TSV (commit, metric, memory_gb, status, description)
- Karpathy/autoresearch GitHub repo confirmed format
- All components off-the-shelf: PapaParse (TSV), Recharts (charts), TanStack Table (data tables), Supabase (everything else)

### User
- Karpathy SETI@home tweet: "Git(Hub) is almost but not really suited for this type of collaboration"
- GitHub Discussion #43 building on #32 — manual compounding behavior
- AgentRxiv paper: 13.7% improvement when agents share structured outputs
- Platform forks: MLX (Apple Silicon), Metal (macOS), RTX (Windows) — community expanding beyond H100

### Business
- Infrastructure costs: <$200/mo at 10,000 users (Supabase free→Pro + Vercel Pro + X API Basic)
- HuggingFace growth pattern: 5 years free community → enterprise monetization → $130M ARR
- Kaggle growth pattern: competitions as hook → progression system → Google acquisition
- Key metric to track: runs per hypothesis (need 10+ for network effects)

### Risk
- Karpathy's collaborative vision tweet (SETI@home style) — building what we're building
- HuggingFace Trackio + Spaces + Leaderboards = 90% of the pieces assembled
- X/Twitter API: free tier eliminated Feb 2023, entire app categories banned 2025, Make dropped integration April 2025
- Supabase: 33 incidents in 90 days, RLS misconfiguration is #1 security risk
- EU AI Act effective August 2, 2026 — potential compliance obligations for platforms hosting training artifacts
