# The decision logic

This is what `scripts/decide.mjs` does, in plain language. It is here so a verdict can be explained, not so it can be re-derived by hand. When you need the answer, run the script. When you need to justify the answer, read this.

The logic is deliberately small and pinned. A tool that argues against handing deterministic work to a model would not be much use if its own verdict drifted from run to run.

## The five shapes

Ordered from cheapest and most predictable to most expensive and most nondeterministic. The whole bias is to sit as high on this list as the work allows.

1. **A single model call**: One structured call, no loop, no tools. Reasoning applied once.
2. **This is a workflow, not an agent**: Deterministic automation. No model in the path.
3. **A workflow with a model at the judgment points**: A deterministic spine with the model called only where the work genuinely needs judgment.
4. **Single agent with tools**: One agent that reasons over what varies and calls a tight set of tools for the rest.
5. **Multi-agent**: A coordinator delegating to focused specialists. The last resort, not the default.

## How the verdict is chosen

The determinism signal (`q2`) decides first. Only when the work is genuinely open-ended do the other signals come into play.

- If `q2 = fixed` → **workflow**. Every step is a rule or a lookup, so no model belongs in the path.
- Else if `q2 = spine` → **hybrid** (a workflow with a model at the judgment points). Automate the backbone, reason only at the one or two real decisions.
- Else the work is open-ended (`q2 = open`):
  - If `q3 = many` → **multi-agent**. Several distinct specialties with handoffs.
  - Else if `q3 = one` and `q5 = model` and `q1` is `answer` or `transform` → **single model call**. One focused job, over knowledge the model already holds, with no external data to reach. Nothing here needs a loop or a tool.
  - Else → **single agent with tools**. The default agent shape: one agent, a tight tool set.

Two things worth noting, because they are where a careless version would go wrong:

- A single call is only chosen when the knowledge is in the model (`q5 = model`). A bare call cannot reach documents, live data, or records. The moment the work needs external knowledge, it needs a tool, so it becomes a single agent with tools, not a call.
- Breadth alone (`q3 = many`) is the only trigger for multi-agent, and it sits behind `q2 = open`. Breadth inside predictable work is still a workflow. Multi-agent is expensive and is treated as a last resort.

## What each signal changes

The verdict is the shape. The rest of the guidance is layered on top from the other signals.

- **Knowledge** comes from `q5`, with one override: a workflow never does RAG, because RAG puts a model in the retrieval path. For a workflow, knowledge is a deterministic lookup by key or query. Otherwise: `docs` → RAG over a vector store, `live` → tools or APIs at query time, `records` → scoped, parameterized query tools over the system of record, `model` → no retrieval.
- **Humans in the loop** comes from `q4` and `q7`, and is pinned for the workflow shape the way the model line is: a workflow has no agent, so its oversight is code review and change control, not approval gates, and any irreversible step is gated deterministically. For the other shapes, an irreversible action forces a confirmation gate regardless of the intended autonomy, draft-only means a person approves before anything happens, and full autonomy over read-only work is tolerable but still carries the risk of a confident wrong answer a person acts on.
- **Model** is pinned by the shape for workflow and hybrid (little to none, or one right-sized call per judgment point), so the latency signal cannot talk you into putting a fast model in a path that should have none. For the agent shapes, `q6` tunes it: `interactive` favors a fast model with escalation, `highvolume` favors the cheapest model that passes evals, otherwise you can afford a frontier model.
- **Risks** lead with the shape's headline risk, then add the ones the signals raise: cost when the volume is high, a confirmation-and-log discipline when actions are irreversible, evals-and-traces before full autonomy, retrieval evaluation when knowledge is in documents, a tool trust boundary when knowledge is live. The list is capped at three, and cost keeps its seat whenever volume is the pressure.

## The diagram

The shape is drawn as a left-to-right pipeline so the presence or absence of a model is visible at a glance.

- **Workflow**: `You -> [ Deterministic workflow ] -> end`. No model node, by design.
- **Hybrid**: `You -> [ Workflow ] -> Model -> (Human approval) -> end`.
- **Single call**: `You -> [ Model ] -> Structured output`.
- **Multi-agent**: `You -> [ Coordinator ] -> [ Specialists ] -> (Human approval) -> end`.
- **Single agent with tools**: `You -> [ Agent ] -> (knowledge or tools) -> (Human approval) -> end`.

The end node is "Answer" when the job answers, "Structured output" when it transforms, and "Systems of record" when it acts. Human approval appears in any shape, the workflow included, whenever the work is draft-only or an action is irreversible.
