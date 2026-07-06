---
name: agent-or-workflow
description: Decides the architecture for an AI feature before it is built, whether the work should be a deterministic workflow, a workflow with a model at the judgment points, a single model call, a single agent with tools, or multi-agent. Use when someone is scoping or designing a new AI use case, asking whether it needs an agent, reviewing a PRD, ticket, or spec for an agent, or pushing back on a design that reaches for an agent where a workflow would do. Reads the design input, extracts the deciding signals with evidence, runs a deterministic verdict, and writes an architecture decision record that biases toward the simplest thing that works.
license: MIT
---

# Agent, or workflow?

Most agents that struggle in production were the wrong shape from the start. The work was predictable and got handed to a model anyway, or a single call was grown into a multi-agent system nobody can test. This skill runs the decision that happens before any of that: given a use case, what should you actually build, and where does reasoning genuinely earn its seat.

It is the design-time gate. Its sibling, the [agent-production-readiness](https://github.com/hamidettefagh/agent-production-readiness) review, is the ship-time gate. This one decides what to build; that one decides whether it is ready.

## When to run this

Run this when the user is:

- Scoping or designing a new AI feature, and deciding what shape it should take.
- Asking whether something needs an agent, or whether a workflow would do.
- Reviewing a PRD, ticket, design doc, or spec that proposes an agent.
- Pushing back on a design that feels over-engineered, or under-specified.

Do not run it to review an agent that is already built and heading for production. That is the readiness review. Ask if you are unsure which gate the user needs.

## The bias

Reach for the simplest thing that works, and make anything more earn its place. In order of increasing cost and risk: a single model call, a deterministic workflow, a workflow with a model at the judgment points, a single agent with tools, multi-agent. Default down this list, not up it. A model in a path that did not need one buys cost, latency, and nondeterminism for nothing, and every model step you chain multiplies its own failure rate into the whole.

## How to run it

Work through four steps in order. Do not guess the verdict; step 3 owns it.

### Step 1: Read the design input

Find the concrete material: a PRD, a ticket, a paragraph describing the use case, or the existing code and prompts. If there is nothing concrete to read, ask for it. You cannot decide a shape from a one-line feature name.

Establish the basics: what the work is, who it is for, what it touches, and what "wrong" costs. Keep it short. You are gathering the evidence the seven signals need.

### Step 2: Extract the seven signals

Map the design input to the seven signals in `references/signals.md`. For each one:

- Choose the option id that fits (`q1` through `q7`).
- Cite the evidence: a quote from the artifact, or the specific detail you read it from.
- Where the artifact is silent, say so, and either ask the user or state the assumption you are making. Do not invent facts to force a cleaner answer.

The honesty of the verdict is the honesty of this step. The script cannot check your reading; it can only be consistent about what follows from it.

### Step 3: Run the deterministic verdict

Pass the seven signals to the engine. It returns the verdict, the shape, and the knowledge, human-oversight, model, and risk guidance. Do not paraphrase the logic from memory or re-derive the verdict yourself. Running it is the whole point: the same signals must always produce the same answer. Run it from the skill's own directory, the folder that holds SKILL.md, or pass the absolute path to `scripts/decide.mjs`.

```bash
node scripts/decide.mjs '{"q1":"...","q2":"...","q3":"...","q4":"...","q5":"...","q6":"...","q7":"..."}'
```

Add `--md` for a ready-to-quote markdown block. Run `node scripts/decide.mjs --questions` to see every option id. The rules the engine applies are documented in `references/decision-logic.md` if you need to explain a verdict.

### Step 4: Write the decision record

Use the format in `assets/decision-record-template.md`. A filled example, a real engagement run through this skill, is in `assets/example-decision-record.md`. Turn the engine output into a decision a team can act on and revisit:

- State the verdict and the shape, with the diagram.
- For each signal, show the evidence you read it from. A verdict with no citations is an opinion.
- Name the cheaper alternative you are not choosing, and the one thing that would change the answer. If the case is close, say which signal is on the line.
- Carry the risks and the open questions into the ship-time readiness review.

## Principles

- The verdict is deterministic, the reading is not. The script pins the mapping from signals to shape, so the verdict is reproducible and auditable. Reading the design into signals is your judgment, which is why step 2 wants evidence and honest assumptions.
- Evidence over assertion. Every signal is read from the artifact, or flagged as an assumption.
- Design-time, not ship-time. This decides what to build. The readiness review decides whether it is ready.
- The cheapest shape that passes your evals wins. Structure is a cost, not a credential.
