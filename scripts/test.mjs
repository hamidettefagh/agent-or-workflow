#!/usr/bin/env node
// test.mjs: golden-output checks for the verdict engine.
// Runs the real CLI and asserts on the parsed output, so a change that
// contradicts a verdict, drops an approval gate, or mislabels an end node
// fails here instead of in a decision record someone already pasted into a doc.
// The general lens is the source of truth; the agentforce lens must keep the
// identical classification and only change the vocabulary.
//
//   node scripts/test.mjs

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "decide.mjs");

function run(answers, platform) {
  const args = [script];
  if (platform) args.push("--platform", platform);
  args.push(JSON.stringify(answers));
  const out = execFileSync("node", args, { encoding: "utf8" });
  return JSON.parse(out);
}

const stages = (r) => r.stages.map((s) => s.label);

let failed = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
  }
}

// One case per shape.
const workflow = run({ q1: "act", q2: "fixed", q3: "few", q4: "undoable", q5: "records", q6: "async", q7: "guarded" });
check("workflow verdict", workflow.shape === "This is a workflow, not an agent", workflow.shape);
check("workflow has no model node", !stages(workflow).includes("Model"), stages(workflow).join(" -> "));
check(
  "workflow oversight does not mention an agent drafting",
  !/the agent drafts/i.test(workflow.humans) && /code review|deterministically/i.test(workflow.humans),
  workflow.humans,
);

const hybrid = run({ q1: "act", q2: "spine", q3: "few", q4: "undoable", q5: "records", q6: "interactive", q7: "guarded" });
check("hybrid verdict", hybrid.shape === "A workflow with a model at the judgment points", hybrid.shape);
check("hybrid model is pinned, ignoring interactive latency", /each judgment point/i.test(hybrid.model), hybrid.model);

const call = run({ q1: "transform", q2: "open", q3: "one", q4: "read", q5: "model", q6: "interactive", q7: "draft" });
check("single call verdict", call.shape === "A single model call", call.shape);
check("single call ends in structured output", stages(call).join(" -> ") === "You -> Model -> Structured output", stages(call).join(" -> "));

const multi = run({ q1: "act", q2: "open", q3: "many", q4: "undoable", q5: "records", q6: "async", q7: "guarded" });
check("multi-agent verdict", multi.shape === "Multi-agent", multi.shape);

const tools = run({ q1: "answer", q2: "open", q3: "one", q4: "read", q5: "docs", q6: "interactive", q7: "draft" });
check("single agent with tools verdict", tools.shape === "Single agent with tools", tools.shape);
check(
  "RAG Q&A draws retrieval, approval, and an answer",
  stages(tools).join(" -> ") === "You -> Agent -> Retrieval -> Human approval -> Answer",
  stages(tools).join(" -> "),
);

// Edge cases the review caught.
const workflowIrreversible = run({ q1: "act", q2: "fixed", q3: "one", q4: "irreversible", q5: "records", q6: "async", q7: "draft" });
check(
  "irreversible workflow shows the approval gate its oversight demands",
  stages(workflowIrreversible).join(" -> ") === "You -> Deterministic workflow -> Human approval -> Systems of record",
  stages(workflowIrreversible).join(" -> "),
);

const transformHybrid = run({ q1: "transform", q2: "spine", q3: "one", q4: "read", q5: "docs", q6: "async", q7: "draft" });
check(
  "a transform job ends in structured output, not systems of record",
  stages(transformHybrid).at(-1) === "Structured output",
  stages(transformHybrid).join(" -> "),
);

const highVolume = run({ q1: "act", q2: "open", q3: "few", q4: "irreversible", q5: "docs", q6: "highvolume", q7: "full" });
check("cost risk survives the three-risk cap under high volume", highVolume.risks.some((r) => /cost per resolved task/i.test(r)), highVolume.risks.join(" | "));

// The agentforce lens: identical classification, platform vocabulary.
const afWorkflow = run({ q1: "act", q2: "fixed", q3: "few", q4: "undoable", q5: "records", q6: "async", q7: "guarded" }, "agentforce");
check("agentforce workflow verdict is a Flow", afWorkflow.shape === "This is a Flow, not an agent", afWorkflow.shape);
check("agentforce workflow kind matches general", afWorkflow.kind === workflow.kind, afWorkflow.kind);
check(
  "agentforce workflow draws a Flow and no prompt template",
  stages(afWorkflow).join(" -> ") === "You -> Flow -> Systems of record",
  stages(afWorkflow).join(" -> "),
);
check("agentforce workflow oversight lives on the Flow", /change control on the Flow/.test(afWorkflow.humans), afWorkflow.humans);

const afIrreversible = run({ q1: "act", q2: "fixed", q3: "one", q4: "irreversible", q5: "records", q6: "async", q7: "draft" }, "agentforce");
check(
  "agentforce irreversible Flow keeps the approval gate",
  stages(afIrreversible).join(" -> ") === "You -> Flow -> Human approval -> Systems of record",
  stages(afIrreversible).join(" -> "),
);

const afCall = run({ q1: "transform", q2: "open", q3: "one", q4: "read", q5: "model", q6: "interactive", q7: "draft" }, "agentforce");
check("agentforce single call is a prompt template", afCall.shape === "A prompt template, not an agent", afCall.shape);
check(
  "agentforce prompt template diagram",
  stages(afCall).join(" -> ") === "You -> Prompt template -> Structured output",
  stages(afCall).join(" -> "),
);

const afHybrid = run({ q1: "act", q2: "spine", q3: "few", q4: "undoable", q5: "records", q6: "interactive", q7: "guarded" }, "agentforce");
check(
  "agentforce hybrid is a Flow with a prompt template",
  afHybrid.shape === "A Flow with a prompt template at the judgment points",
  afHybrid.shape,
);
check("agentforce hybrid model line names the prompt template", /prompt template call at each judgment point/i.test(afHybrid.model), afHybrid.model);

const afTools = run({ q1: "answer", q2: "open", q3: "one", q4: "read", q5: "docs", q6: "interactive", q7: "draft" }, "agentforce");
check("agentforce agent is one topic", afTools.shape === "One Agentforce topic with a tight action set", afTools.shape);
check(
  "agentforce RAG Q&A grounds through a data library",
  stages(afTools).join(" -> ") === "You -> Agentforce topic -> Data library -> Human approval -> Answer",
  stages(afTools).join(" -> "),
);

const afMulti = run({ q1: "act", q2: "open", q3: "many", q4: "undoable", q5: "records", q6: "async", q7: "guarded" }, "agentforce");
check("agentforce multi is agents behind an orchestrator", afMulti.shape === "Multiple agents behind an orchestrator", afMulti.shape);
check("agentforce multi defaults to topics first", /well-separated topics/.test(afMulti.shapeDetail), afMulti.shapeDetail);

// Every general case must classify identically under the lens.
const parity = [
  { q1: "act", q2: "fixed", q3: "few", q4: "undoable", q5: "records", q6: "async", q7: "guarded" },
  { q1: "act", q2: "spine", q3: "few", q4: "irreversible", q5: "records", q6: "interactive", q7: "guarded" },
  { q1: "transform", q2: "open", q3: "one", q4: "read", q5: "model", q6: "interactive", q7: "draft" },
  { q1: "answer", q2: "open", q3: "one", q4: "read", q5: "docs", q6: "interactive", q7: "draft" },
  { q1: "act", q2: "open", q3: "many", q4: "undoable", q5: "records", q6: "async", q7: "guarded" },
  { q1: "act", q2: "open", q3: "few", q4: "irreversible", q5: "live", q6: "highvolume", q7: "full" },
];
check(
  "lens never changes the classification",
  parity.every((c) => run(c).kind === run(c, "agentforce").kind),
);

// Determinism: the same input must produce byte-identical output, on both lenses.
const detIn = JSON.stringify({ q1: "act", q2: "open", q3: "few", q4: "read", q5: "docs", q6: "async", q7: "guarded" });
const a = execFileSync("node", [script, detIn], { encoding: "utf8" });
const b = execFileSync("node", [script, detIn], { encoding: "utf8" });
check("same input, byte-identical output", a === b);
const c = execFileSync("node", [script, "--platform", "agentforce", detIn], { encoding: "utf8" });
const d = execFileSync("node", [script, "--platform", "agentforce", detIn], { encoding: "utf8" });
check("same input, byte-identical output under the agentforce lens", c === d);

// An unknown lens must refuse, not guess.
let badExit = 0;
try {
  execFileSync("node", [script, "--platform", "einstein", detIn], { encoding: "utf8", stdio: "pipe" });
} catch (e) {
  badExit = e.status;
}
check("unknown platform exits 2", badExit === 2, String(badExit));

console.log("");
if (failed) {
  console.error(`${failed} check(s) failed.`);
  process.exit(1);
}
console.log("All checks passed.");
