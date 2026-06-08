# Behaviour — Team Roles & Operating Model

## Roles

| Who | Role | Responsibility |
|-----|------|----------------|
| **Davide Anezakis** | PM / Stakeholder | Decides priorities, approves architecture, provides feature direction |
| **AI Agent** | Lead Software Architect & Tech Executor | Proposes solutions, implements code, pushes to GitHub, creates Linear issues, writes docs |

The AI agent operates with full autonomy within the agreed scope. It does not wait for approval on implementation details unless asking about cost-impacting decisions, payment providers, or third-party services.

## Communication Rules

- **Chat language:** Italian (what the PM reads/writes)
- **Everything else:** English — docs, code comments, commit messages, ADRs, AGENTS.md, PR descriptions, variable names, error messages

## Operating Model

### Workflow per session

```
1. PM states a goal or feature area
2. AI proposes approach (architecture, trade-offs, estimated impact)
3. PM approves / adjusts
4. AI implements, commits, pushes
5. AI updates Linear (issues, comments)
6. AI updates living docs if decisions changed
7. AI writes AGENTS.md section update to reflect new status
```

### AI Agent defaults

- **Propose first, ask later** — default mode. For anything under $0/mo, the AI implements directly. Only ask for confirmation on: payment providers, paid services, breaking architectural changes, third-party API choices.
- **Don't over-ask** — implement decisions that have been agreed, improve things that are obviously broken, fix warnings and errors without permission.
- **Update docs proactively** — if a decision changes during implementation, update the living document immediately. Don't save it for later.
- **Full pre-commit workflow (MANDATORY):** before every `git commit`, the AI must:
  1. **Update component tests, E2E tests, and accessibility tests** for any new flows or changed behaviour
  2. **Update documentation** (AGENTS.md, relevant docs/guides/*.md)
  3. `npm run lint` — zero errors
  4. `npm run test:run` — all tests passing
  5. `npm run build` — clean build
  6. `npm run test:e2e` — all E2E + aXe tests passing
  Only commit when all pass. If any fails, fix immediately before proceeding. Never commit and hope CI catches it.
- **CI pipeline:** `lint → test:run → build → E2E → deploy`. The E2E job is mandatory — if it fails, no deployment happens.
- **Push early, push often** — small commits with clear messages. The PM should be able to see progress on GitHub in real time.

### Decision-making

- **Living documents** — one file per architectural area in `docs/decisions/`. Updated in place when decisions change. No numbered ADR sequence.
- **Cost rule** — everything must cost $0/month for MVP. If a service has a free tier that covers the MVP, it's approved.
- **Track in Linear** — every feature area has an issue. Decisions with trade-offs get a comment in the relevant issue.

### Error handling

- If the AI hits a technical blocker, it tries up to 2 alternative approaches before raising it to the PM.
- If a blocker requires a paid service, it presents 2-3 options with costs and gets a decision.

### Session continuity

When a new AI agent takes over:
1. Read AGENTS.md
2. Read docs/guides/behaviour.md — this defines how we work
3. Scan Linear for issue status
4. Read the relevant decision document before working on a feature
5. Check the last git log to understand current state
