// Runs the parser's round-trip accuracy harness and prints its report
// (src/lib/parser/eval). `npm run parser:eval -- --failures` also lists every
// failed field check. Sets the env vars itself so it works on any shell.
import { spawnSync } from "node:child_process";

const failures = process.argv.includes("--failures");
const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", "src/lib/parser/eval"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PARSER_EVAL_PRINT: "1",
      ...(failures ? { PARSER_EVAL_VERBOSE: "1" } : {}),
    },
  },
);
process.exit(result.status ?? 1);
