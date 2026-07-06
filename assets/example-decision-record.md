# Architecture decision: airline customer service agent

A worked example, produced by running this skill over a real engagement. The verdict block is verbatim from `scripts/decide.mjs`; the use case and evidence are read from the design. The system it describes is the [airline super agent case study](https://hamidettefagh.com/work/airline-super-agent).

## Verdict

**Multi-agent**

A coordinator that delegates to focused specialists, each owning one domain and handing a result back. Default to a single agent with tools first. Every handoff is latency plus a new failure mode, so this is the most expensive shape here by a wide margin.

`You -> [ Coordinator ] -> [ Specialists ] -> Human approval -> Systems of record`

## The use case

A major US airline's production customer service agent, deflecting call-center volume across loyalty, baggage, and back-office requests. It acts on the airline's systems on a customer's behalf, in a federally regulated business, at a scale of hundreds of thousands of automated actions a week. A wrong action reaches a real customer.

## Signals

| Signal | Read as | Evidence |
|---|---|---|
| What it mainly does | act | It does not just answer; it takes actions in the airline's systems across three request types. |
| How fixed the work is | open | Customer requests are genuinely open-ended; the path cannot be drawn in advance. |
| How many jobs | many | Loyalty, baggage, and back-office are distinct specialties that hand results between them. |
| Reversibility | irreversible | Customer-facing actions in a regulated business; the worst action is high-impact and hard to walk back. |
| Where knowledge lives | live | Answers must reflect the airline's current approved policy, which changes. Stale policy is the failure that nearly shut the program down in its first day. |
| Latency and scale | highvolume | The point is to deflect call volume at scale, so cost per resolved case is a first-order constraint. |
| Autonomy | guarded | Autonomous within guardrails, escalating the uncertain cases to a person. |

## How to build it

- **Knowledge**: Call tools or APIs at query time. RAG alone would hand back stale answers.
- **Humans in the loop**: Put a confirmation gate before any irreversible action, log every call, and give a person the escape hatch.
- **Model**: Right-size hard. The cheapest model that passes your evals, not the biggest one available.

## What I would worry about

1. Every added agent is another nondeterministic hop that multiplies into your end-to-end reliability, plus new coordination failure modes. Start with one agent; split only when it provably cannot hold the job.
2. Track cost per resolved task, not per call, from the first day.
3. One confident wrong action is the whole risk. Log every action and make it reversible wherever you can.

## The alternative I am not choosing

A single agent with tools. That is the cheaper default, and for a narrower scope it would be the right call. This one earns the coordinator because loyalty, baggage, and back-office are genuinely separable domains that each need their own governance, tools, and tests, and because the regulated data forces a hard trust boundary between them. The signal on the line is breadth: if the domains collapsed into one, this would drop back to a single agent with tools.

## Carry into the ship-time review

- Grounding. Every answer must come from the current approved source, not the model's own knowledge. This is the failure that nearly ended the program, and it is a ship-gate dimension.
- The trust boundary around the federally regulated data, and proof that nothing crosses it by accident.
- The confirmation gate on irreversible actions, and an audit log a person can actually read.
- Cost per resolved task, tracked from day one.

Hand these to the [agent-production-readiness](https://github.com/hamidettefagh/agent-production-readiness) review before go-live.
