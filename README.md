# Agent, or workflow?

A Claude skill that decides the architecture for an AI feature before it is built.

Most agents that struggle in production were the wrong shape from the start. The work was predictable and got handed to a model anyway, or a single call was grown into a multi-agent system nobody can test. This skill runs the decision that happens first: given a use case, what should you actually build, and where does reasoning genuinely earn its seat. It reads the design, extracts the deciding signals with evidence, and returns an architecture decision record that biases toward the simplest thing that works.

It is the executable version of the tool at [hamidettefagh.com/agent-architecture](https://hamidettefagh.com/agent-architecture). The verdict looks like this:

```
**This is a workflow, not an agent**

The steps are known and the rules are clear. Build this as deterministic
automation. A model in this path buys cost, latency, and nondeterminism
you did not need.

You -> [ Deterministic workflow ] -> Systems of record
```

## The two-gate method

This is the **design-time gate**: what to build. Its sibling, [agent-production-readiness](https://github.com/hamidettefagh/agent-production-readiness), is the **ship-time gate**: whether it is ready. One decides the shape; the other decides if the shape is safe to run. Together they cover an agent from the whiteboard to the on-call rotation, and [incident-to-eval](https://github.com/hamidettefagh/incident-to-eval) closes the loop by turning what still breaks into regression tests. The write-up behind both gates is at [hamidettefagh.com/two-gates](https://hamidettefagh.com/two-gates). All three install together as the [two-gates plugin](https://github.com/hamidettefagh/two-gates).

## The verdict is deterministic

This is the part that matters. The five-way verdict is computed by [`scripts/decide.mjs`](scripts/decide.mjs), a faithful port of the logic behind the web tool. Same signals in, same verdict out, every run. A skill whose whole argument is "do not hand deterministic work to a model" should not decide the architecture with a model that answers differently each time. The model's job is to read the design honestly and extract the signals; the script owns the call.

The boundary is worth naming: the script pins the mapping from signals to shape, not the reading of a design into signals. That reading is the model's judgment, which is why the skill does it with evidence and states its assumptions. The verdict logic is covered by golden-output checks in [`scripts/test.mjs`](scripts/test.mjs); run `node scripts/test.mjs`.

## Install

This follows the open [Agent Skills](https://code.claude.com/docs/en/skills) format, so it works anywhere skills are supported. To use it in Claude Code, put this directory in your skills folder:

```bash
git clone https://github.com/hamidettefagh/agent-or-workflow.git \
  ~/.claude/skills/agent-or-workflow
```

Use `.claude/skills/` inside a project instead of `~/.claude/skills/` to scope it to one repo. The verdict engine needs Node; nothing else.

## Use

Point Claude at a design and ask what to build:

> Should this be an agent or a workflow?

Or hand it a PRD, a ticket, or the existing code:

> Read this spec and tell me the right architecture.

The skill reads the design, extracts seven signals with evidence, runs the deterministic verdict, and writes an architecture decision record: the shape, a diagram, the knowledge, human-oversight, and model guidance, the top three risks, and the cheaper alternative it is not choosing. See a filled example in [`assets/example-decision-record.md`](assets/example-decision-record.md), a real engagement run through the skill.

You can also run the engine directly:

```bash
node scripts/decide.mjs --questions
node scripts/decide.mjs '{"q1":"act","q2":"fixed","q3":"few","q4":"undoable","q5":"records","q6":"async","q7":"guarded"}'
```

## What it decides

Seven signals resolve to one of five shapes, ordered from cheapest and most predictable to most expensive and most nondeterministic:

| Shape | When |
|---|---|
| A single model call | One focused job, over knowledge the model already holds, no tools needed |
| A workflow, not an agent | Every step is a fixed rule or lookup |
| A workflow with a model at the judgment points | A fixed backbone with one or two real judgment calls |
| Single agent with tools | Open-ended work in one domain, reasoning plus a tight tool set |
| Multi-agent | Several distinct specialties with handoffs, the last resort |

The full logic is in [`references/decision-logic.md`](references/decision-logic.md), and how to read each signal from a design is in [`references/signals.md`](references/signals.md).

## The Agentforce lens

The most common miss I see on Salesforce projects is work that should be a Flow shipped as an agent. Pass `--platform agentforce` and the same engine renders its verdict in platform vocabulary. The classification never changes; the lens is vocabulary, not a different call.

```bash
node scripts/decide.mjs --platform agentforce '{"q1":"act","q2":"fixed","q3":"few","q4":"undoable","q5":"records","q6":"async","q7":"guarded"}'
```

| General verdict | Agentforce lens |
|---|---|
| This is a workflow, not an agent | This is a Flow, not an agent |
| A workflow with a model at the judgment points | A Flow with a prompt template at the judgment points |
| A single model call | A prompt template, not an agent |
| Single agent with tools | One Agentforce topic with a tight action set |
| Multi-agent | Multiple agents behind an orchestrator |

The knowledge, oversight, and risk guidance translate the same way: data libraries and retrievers for document grounding, scoped Flow or Apex query actions over the CRM instead of text-to-SOQL, confirmation before irreversible actions, and topics before subagents. The interactive tool has the same lens as a toggle.

## Why

The failure this catches is quiet. Nobody ships a broken agent on purpose; they ship the wrong shape. A workflow that should have been three functions and a queue becomes a reasoning loop that costs more, breaks more, and cannot be tested. The fix is to make the call deliberately, on the evidence, before the code exists, and to bias hard toward the simplest thing that works. Reasoning is powerful and expensive. Spend it where it earns its seat.

---

Hamid Ettefagh, [hamidettefagh.com](https://hamidettefagh.com)
