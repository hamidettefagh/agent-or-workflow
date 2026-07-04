#!/usr/bin/env node
// decide.mjs: the deterministic verdict engine behind "Agent, or workflow?"
//
// Ported 1:1 from the compute() in the interactive tool at
// hamidettefagh.com/agent-architecture. The point of this file is the point of
// the whole skill: the architecture verdict is pinned in code, not re-derived
// by a model. Same inputs, same verdict, every time. A tool that argues against
// handing deterministic work to a model should not itself be nondeterministic.
//
// Usage:
//   node decide.mjs '{"q1":"act","q2":"fixed","q3":"few","q4":"undoable","q5":"records","q6":"async","q7":"guarded"}'
//   node decide.mjs --file signals.json      # read the answers from a JSON file
//   node decide.mjs --md   '{...}'           # emit a markdown block instead of JSON
//   node decide.mjs --questions              # print the seven questions and their option ids

import { readFileSync } from "node:fs";

const QUESTIONS = [
  {
    id: "q1",
    q: "What does it mainly do?",
    options: {
      answer: "Answer questions from a body of knowledge",
      act: "Take actions in other systems",
      transform: "Analyze or transform input you give it",
    },
  },
  {
    id: "q2",
    q: "How much of the work follows fixed steps or rules?",
    options: {
      fixed: "Every step is a fixed rule or lookup",
      spine: "A fixed backbone with one or two real judgment calls",
      open: "Open-ended, every case is genuinely different",
    },
  },
  {
    id: "q3",
    q: "How many distinct jobs does it span?",
    options: {
      one: "One focused job",
      few: "A few related steps",
      many: "Several specialties, with handoffs",
    },
  },
  {
    id: "q4",
    q: "How reversible are its actions?",
    options: {
      read: "Read-only, or suggestions a person acts on",
      undoable: "Writes that can be undone",
      irreversible: "Irreversible or high-impact",
    },
  },
  {
    id: "q5",
    q: "Where does its knowledge live?",
    options: {
      model: "General knowledge the model already has",
      docs: "Stable documents",
      live: "Changing or real-time data",
      records: "Structured records in a database or CRM",
    },
  },
  {
    id: "q6",
    q: "What are the latency and scale needs?",
    options: {
      interactive: "Interactive, a person is waiting",
      async: "Background or async",
      highvolume: "High volume, cost-sensitive",
    },
  },
  {
    id: "q7",
    q: "How much should it act on its own?",
    options: {
      draft: "Draft only, a person approves",
      guarded: "Autonomous within guardrails",
      full: "Fully autonomous",
    },
  },
];

const VERDICTS = {
  workflow: {
    title: "This is a workflow, not an agent",
    detail:
      "The steps are known and the rules are clear. Build this as deterministic automation. A model in this path buys cost, latency, and nondeterminism you did not need.",
  },
  hybrid: {
    title: "A workflow with a model at the judgment points",
    detail:
      "Automate the fixed process. Put the model only at the genuine judgment points, wrapped in deterministic control flow.",
  },
  call: {
    title: "A single model call",
    detail:
      "One structured call with clear instructions and a few strong examples. No agent loop, no tools. Where a single call passes your evals, an agent is pure overhead.",
  },
  multi: {
    title: "Multi-agent",
    detail:
      "A coordinator that delegates to focused specialists, each owning one domain and handing a result back. Default to a single agent with tools first. Every handoff is latency plus a new failure mode, so this is the most expensive shape here by a wide margin.",
  },
  tools: {
    title: "Single agent with tools",
    detail:
      "One agent with a small, well-defined set of tools. Let it reason over what varies and lean on plain code for what does not. Keep the tool surface tight and each tool boring.",
  },
};

function classify(a) {
  if (a.q2 === "fixed") return "workflow";
  if (a.q2 === "spine") return "hybrid";
  // q2 === "open": genuine judgment on every case
  if (a.q3 === "many") return "multi";
  if (a.q3 === "one" && a.q5 === "model" && (a.q1 === "answer" || a.q1 === "transform")) return "call";
  return "tools";
}

function knowledgeNode(q5) {
  if (q5 === "docs") return { label: "Retrieval" };
  if (q5 === "records") return { label: "Query tools" };
  if (q5 === "live") return { label: "Live tools" };
  return null;
}

function compute(a) {
  const kind = classify(a);
  const verdict = VERDICTS[kind];

  // Knowledge. A workflow has no model in the retrieval path, so it never does RAG.
  let knowledge;
  if (kind === "workflow") {
    knowledge = "Look it up deterministically, by key or query. No vector search, and no model in the retrieval path.";
  } else if (a.q5 === "docs") {
    knowledge =
      "RAG over a vector store. Retrieval quality is your ceiling, so evaluate it on its own before you blame the model.";
  } else if (a.q5 === "live") {
    knowledge = "Call tools or APIs at query time. RAG alone would hand back stale answers.";
  } else if (a.q5 === "records") {
    knowledge =
      "Give it scoped, parameterized query tools over the system of record, not raw text-to-query and not a vector store. If you must generate queries, constrain them to a safe, read-only surface.";
  } else {
    knowledge = "No retrieval. Lean on the model and anchor it with a few strong examples.";
  }

  let humans;
  if (kind === "workflow")
    humans =
      "No agent in this path, so oversight is ordinary code review and change control, not approval gates. If a step is irreversible, gate it deterministically and log it.";
  else if (a.q4 === "irreversible")
    humans = "Put a confirmation gate before any irreversible action, log every call, and give a person the escape hatch.";
  else if (a.q7 === "draft") humans = "The agent drafts, a person approves and sends. No autonomous writes yet.";
  else if (a.q7 === "guarded")
    humans = "Autonomous within guardrails, with a confidence threshold that escalates uncertain cases to a person.";
  else if (a.q7 === "full" && a.q4 === "read")
    humans =
      "Light oversight is fine because it cannot take action directly. The residual risk is a confident wrong answer a person acts on, so keep the reasoning visible. Earn more autonomy with evals and traces.";
  else humans = "Keep a person on the uncertain and the irreversible. Let the rest run.";

  // Model. Shape wins over the latency tuning: a workflow or hybrid pins the answer.
  let model;
  if (kind === "workflow")
    model = "Little to none. If one step genuinely needs judgment, make it a single call, not the spine of the system.";
  else if (kind === "hybrid")
    model =
      "One call at each judgment point, right-sized for that decision. The workflow around it stays deterministic and testable.";
  else if (a.q6 === "interactive")
    model =
      "Favor a fast, smaller model on the interactive path, and escalate to a frontier model only for the steps that need it.";
  else if (a.q6 === "highvolume")
    model = "Right-size hard. The cheapest model that passes your evals, not the biggest one available.";
  else model = "You can afford a frontier model and more steps. Spend the tokens where they buy accuracy.";

  // Risks. The shape's headline risk leads; cost earns a seat whenever volume is the pressure.
  const shapeRisk = {
    workflow:
      "The pressure will be to make it agentic, because that is what ships in demos. Resist it. Add a model only at the exact step where the work stops being predictable, and keep the rest as code you can test. Every model step you chain multiplies its own failure rate into the whole, so a long agent path can fail end to end even when each step looks fine.",
    hybrid: "Keep the model on a short leash. It advises at the decision points; it does not drive the process.",
    tools:
      "Every step you can express as code is a step you do not have to trust the model on. Move those out, and let the agent reason only over what genuinely varies.",
    multi:
      "Every added agent is another nondeterministic hop that multiplies into your end-to-end reliability, plus new coordination failure modes. Start with one agent; split only when it provably cannot hold the job.",
    call: "This is the simplest shape. Keep it that way. Add a tool or a loop only when a specific failure in your evals demands it, not because an agent felt more complete.",
  };

  const risks = [shapeRisk[kind]];
  if (a.q6 === "highvolume") risks.push("Track cost per resolved task, not per call, from the first day.");
  if (a.q4 === "irreversible")
    risks.push("One confident wrong action is the whole risk. Log every action and make it reversible wherever you can.");
  if (a.q7 === "full")
    risks.push("You cannot ship full autonomy without evals and traces to back it. Turn each up as the evidence comes in.");
  if (a.q5 === "docs" && kind !== "workflow")
    risks.push("Most RAG failures are retrieval failures. Evaluate retrieval before you touch the prompt.");
  if (a.q5 === "live" && kind !== "workflow")
    risks.push("Your tools are now part of the trust boundary. Handle their failures and latency on purpose.");

  // Diagram stages.
  const end =
    a.q1 === "answer"
      ? { label: "Answer" }
      : a.q1 === "transform"
        ? { label: "Structured output" }
        : { label: "Systems of record" };
  const needsApproval = a.q7 === "draft" || a.q4 === "irreversible";
  const kn = knowledgeNode(a.q5);
  let stages;
  if (kind === "workflow") {
    stages = [{ label: "You" }, { label: "Deterministic workflow", accent: true }];
    if (needsApproval) stages.push({ label: "Human approval" });
    stages.push(end);
  } else if (kind === "hybrid") {
    stages = [{ label: "You" }, { label: "Workflow", accent: true }, { label: "Model" }];
    if (needsApproval) stages.push({ label: "Human approval" });
    stages.push(end);
  } else if (kind === "call") {
    stages = [{ label: "You" }, { label: "Model", accent: true }, { label: "Structured output" }];
  } else if (kind === "multi") {
    stages = [{ label: "You" }, { label: "Coordinator", accent: true }, { label: "Specialists", accent: true }];
    if (needsApproval) stages.push({ label: "Human approval" });
    stages.push(end);
  } else {
    stages = [{ label: "You" }, { label: "Agent", accent: true }, kn ?? { label: "Tools" }];
    if (needsApproval) stages.push({ label: "Human approval" });
    stages.push(end);
  }

  return {
    kind,
    shape: verdict.title,
    shapeDetail: verdict.detail,
    knowledge,
    humans,
    model,
    risks: risks.slice(0, 3),
    stages,
  };
}

function validate(a) {
  const errors = [];
  if (typeof a !== "object" || a === null || Array.isArray(a)) {
    return ["Answers must be a JSON object, for example {\"q1\":\"act\", ...}."];
  }
  for (const { id, options } of QUESTIONS) {
    const value = a[id];
    if (value === undefined) {
      errors.push(`Missing ${id}. Expected one of: ${Object.keys(options).join(", ")}.`);
    } else if (!(value in options)) {
      errors.push(`Invalid ${id}="${value}". Expected one of: ${Object.keys(options).join(", ")}.`);
    }
  }
  return errors;
}

function stagesToText(stages) {
  return stages.map((s) => (s.accent ? `[ ${s.label} ]` : s.label)).join(" -> ");
}

function toMarkdown(rec, a) {
  const answered = QUESTIONS.map((qq) => {
    const opts = qq.options;
    return `- ${qq.q} **${opts[a[qq.id]]}**`;
  }).join("\n");
  const risks = rec.risks.map((r) => `- ${r}`).join("\n");
  return `## Verdict

**${rec.shape}**

${rec.shapeDetail}

## Shape

\`${stagesToText(rec.stages)}\`

## Signals read

${answered}

## Knowledge

${rec.knowledge}

## Humans in the loop

${rec.humans}

## Model

${rec.model}

## What to worry about

${risks}
`;
}

function printQuestions() {
  for (const { id, q, options } of QUESTIONS) {
    console.log(`${id}: ${q}`);
    for (const [key, label] of Object.entries(options)) {
      console.log(`    ${key.padEnd(12)} ${label}`);
    }
    console.log("");
  }
}

// --- CLI ---
const argv = process.argv.slice(2);

if (argv.includes("--questions")) {
  printQuestions();
  process.exit(0);
}

const wantMd = argv.includes("--md");
let raw;
const fileFlag = argv.indexOf("--file");
if (fileFlag !== -1 && argv[fileFlag + 1]) {
  raw = readFileSync(argv[fileFlag + 1], "utf8");
} else {
  raw = argv.find((x) => x.trim().startsWith("{"));
}

if (!raw) {
  console.error(
    'Provide the seven answers as JSON. Example:\n' +
      '  node decide.mjs \'{"q1":"act","q2":"fixed","q3":"few","q4":"undoable","q5":"records","q6":"async","q7":"guarded"}\'\n' +
      "Run `node decide.mjs --questions` to see every question and its option ids.",
  );
  process.exit(2);
}

let answers;
try {
  answers = JSON.parse(raw);
} catch {
  console.error("Could not parse the answers as JSON. Check the quoting.");
  process.exit(2);
}

const errors = validate(answers);
if (errors.length) {
  console.error("The answers did not validate:\n" + errors.map((e) => "  " + e).join("\n"));
  process.exit(2);
}

const rec = compute(answers);
if (wantMd) {
  console.log(toMarkdown(rec, answers));
} else {
  console.log(JSON.stringify(rec, null, 2));
}
