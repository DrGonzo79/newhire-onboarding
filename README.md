# New-Hire Paperwork Desk

An accepted offer isn't a payroll-ready employee. This app turns an accepted
offer into a **day-one-ready** hire: it extracts the employee profile, validates
the required paperwork (I-9, W-4, direct deposit, handbook, background check,
state withholding, …), simulates a QuickBooks-Workforce-style payroll setup,
builds a first-shift checklist, drafts adaptive comms, and produces a printable
**"Ready for Day One" packet** — all behind human approval gates.

Built for SMBs that lose hours chasing new-hire forms after the employee
already started: restaurants, franchises, clinics, retailers, cleaners, and the
payroll/bookkeeping advisors who serve them.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS
- `@anthropic-ai/sdk` for real extraction (optional)
- Vitest for the pure business-logic modules

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Boots with seeded demo hires spanning every status. No API key needed — it runs
fully offline on a deterministic mock parser. To enable real Claude extraction,
copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`.

```bash
npm test         # Vitest suite (validation, status, metrics, packet)
npm run build    # production build + type-check
```

State persists to a gitignored `.data/newhires.json`. Reset the demo with
`rm -rf .data` and restart.

## Architecture

Pure, swappable modules under `lib/`:

| Module | Responsibility |
| --- | --- |
| `extraction.ts` / `extractionLlm.ts` | Accepted offer → structured profile (mock parser or Claude) |
| `validation.ts` | Readiness-rules engine + 0–100 readiness score |
| `status.ts` | New-hire status state machine |
| `agentPlan.ts` | Simulated QuickBooks Workforce payroll setup steps |
| `email.ts` | Adaptive comms drafts |
| `packet.ts` | "Ready for Day One" packet builder |
| `metrics.ts` | ROI calculator + live analytics |
| `store.ts` / `persistence.ts` | In-memory store + JSON snapshot |
| `audit.ts` | Event log |

The `/api/hires` routes expose a single-dispatch action endpoint; the `/hires/[id]`
detail page drives everything through tabs (Paperwork, Exceptions, Payroll &
Day-One Plan, Comms, Packet, Audit) with an approval gate.

> Prototype: ERP/HRIS, OCR, e-signature, and email integrations are simulated
> behind clean interfaces. Swapping a mock for a real provider means
> re-implementing one module, not rewriting consumers.
