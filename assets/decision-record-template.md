# Architecture decision: {feature name}

## Verdict

**{the shape, e.g. This is a workflow, not an agent}**

{one or two sentences on the headline: what to build, and the single reason this shape and not the next one up}

`{You -> [ ... ] -> ...}`

## The use case

{two or three sentences: what the work is, who it is for, and what "wrong" costs. This is the context the verdict has to survive a re-read against.}

## Signals

Each one is read from the design input, or flagged as an assumption.

| Signal | Read as | Evidence |
|---|---|---|
| What it mainly does | {option} | {quote or specific detail, or "assumption: ..."} |
| How fixed the work is | {option} | {...} |
| How many jobs | {option} | {...} |
| Reversibility | {option} | {...} |
| Where knowledge lives | {option} | {...} |
| Latency and scale | {option} | {...} |
| Autonomy | {option} | {...} |

## How to build it

- **Knowledge**: {the knowledge line from the engine}
- **Humans in the loop**: {the human-oversight line}
- **Model**: {the model line}

## What I would worry about

1. {risk one}
2. {risk two}
3. {risk three}

## The alternative I am not choosing

{the next shape up or down, and why this one instead. If the call is close, name the single signal that is on the line and what would flip it.}

## Carry into the ship-time review

{the open questions and the risks that the production readiness review should pick up once this is built: the evals to write, the guardrails to prove, the actions to gate.}

---

Decided with the agent-or-workflow design gate. The verdict is deterministic from the signals above; the signals are a judgment, so revisit them if the use case changes.
