# Reading the seven signals

Each signal is one question with a small set of option ids. Your job is to read the design input and pick the id that fits, with evidence. This file is how to read each one, what to look for, and how to handle the cases where the artifact does not say.

A rule that holds throughout: when the artifact is silent, do not pick the option that gives the cleaner answer. Ask, or state the assumption in the decision record. The most common way this decision goes wrong is a signal read generously in the direction someone already wanted.

---

## q1: What does it mainly do?

The primary job. If it does several things, name the one that carries the value.

- `answer`: Answers questions from a body of knowledge. Support, search, Q&A, "explain this."
- `act`: Takes actions in other systems. Creates, updates, sends, books, refunds.
- `transform`: Analyzes or transforms input you hand it. Summarize, classify, extract, rewrite, score.

Read from: the verbs in the spec. "The user asks" leans `answer`. "The system creates or updates" leans `act`. "Given a document, produce" leans `transform`. If it both answers and acts, pick by where the risk and the value sit: an agent that answers and can also issue a refund is `act`.

## q2: How much of the work follows fixed steps or rules?

The load-bearing signal. This is the difference between a workflow and an agent, so read it slowly and do not inflate it.

- `fixed`: Every step is a fixed rule or lookup. You could write the whole thing as a flowchart today.
- `spine`: A fixed backbone with one or two real judgment calls. The process is known; a couple of points genuinely need reasoning.
- `open`: Open-ended. Every case is genuinely different and the path cannot be drawn in advance.

Read from: whether the artifact describes the logic as steps and rules, or as goals and judgment. The test for a real judgment call: could a competent person follow written rules and get it right every time? If yes, it is not a judgment call, it is a rule, and the honest answer is `fixed` or `spine`, not `open`. "The agent decides" in a spec often describes a lookup someone did not want to write down.

## q3: How many distinct jobs does it span?

Breadth, measured in domains, not features.

- `one`: One focused job.
- `few`: A few related steps in the same domain.
- `many`: Several distinct specialties, with handoffs between them.

Read from: how many genuinely different kinds of expertise the work needs. Three tools in the same domain is still `one` or `few`. Legal review, then pricing, then fulfillment is `many`. Breadth alone rarely justifies more agents; usually it is one agent with more tools.

Read this one most conservatively of all seven. `many` on its own routes straight to multi-agent, the most expensive and least predictable shape, so default to `few` unless the work has genuinely separable specialties that hand results to each other. Declared breadth is not separable breadth: a long feature list is usually one agent with more tools, not a team of agents.

## q4: How reversible are its actions?

What it costs when it is wrong.

- `read`: Read-only, or suggestions a person acts on.
- `undoable`: Writes that can be undone.
- `irreversible`: Irreversible or high-impact: money moved, messages sent, records a customer sees.

Read from: the actions in scope and whether each has an undo. If any in-scope action is irreversible, this is `irreversible` even if most are not. Read for the worst action, not the average one.

## q5: Where does its knowledge live?

The source of truth the work depends on.

- `model`: General knowledge the model already has. No external source needed.
- `docs`: Stable documents: policies, manuals, a knowledge base.
- `live`: Changing or real-time data: prices, availability, status.
- `records`: Structured records in a database or CRM.

Read from: what the answer or action has to be correct against. If a wrong-but-plausible answer from stale knowledge is a real failure, it is not `model`. If freshness matters within the hour, it is `live`, not `docs`.

## q6: What are the latency and scale needs?

The operating envelope.

- `interactive`: A person is waiting on the answer.
- `async`: Background or async; seconds to minutes are fine.
- `highvolume`: High volume and cost-sensitive; per-call cost compounds.

Read from: whether a human is blocked on the response, and whether the call count is large enough that cost per call matters. When in doubt between `interactive` and `highvolume`, pick the one the spec treats as the harder constraint.

## q7: How much should it act on its own?

The intended autonomy, not the eventual dream.

- `draft`: Draft only; a person approves before anything happens.
- `guarded`: Autonomous within guardrails.
- `full`: Fully autonomous, no person in the loop.

Read from: the launch plan, not the roadmap. Teams often describe the end state. Read this as what ships first. If the plan is "start with human approval, then loosen," the signal is `draft`.

---

## When you cannot tell

If two or three signals are genuinely unreadable from the artifact, the design is not ready for this decision. Say that. Name the missing signals, ask for them, and note that the verdict is provisional until they are answered. A confident verdict built on invented signals is worse than an honest "I need q2 and q5 before I can call this."
