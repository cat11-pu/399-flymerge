import assert from "node:assert";
import { waitOf, joinedInto, releasedOf } from "../fly.js";
import { step, close } from "../flyrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { flying: [], done: [], merged: 0, asks_n: 0, ledger: [], applied: [] },
  events: [{ id: 1, kind: "ask", key: "a" }],
  bad_key_code: "E_BAD_KEY", bad_result_code: "E_BAD_RESULT",
  no_flight_code: "E_NO_FLIGHT", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("waitOf returns a number", () => {
  assert.strictEqual(typeof waitOf([["a", 2]], "a"), "number");
});

check("joinedInto returns a list", () => {
  assert.ok(Array.isArray(joinedInto([["a", 1]], "a")));
});

check("releasedOf returns a list", () => {
  assert.ok(Array.isArray(releasedOf([["a", 1]], "a")));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
