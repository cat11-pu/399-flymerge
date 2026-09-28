// app.js：渲染结果
import { waitOf, joinedInto, releasedOf } from "./fly.js";
import { step, close } from "./flyrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      flying: state.flying, done: state.done, merged: state.merged, asks_n: state.asks_n,
      ledger: state.ledger, applied: state.applied.length
    });
  };
  return { flying: closed.state.flying.map(function (row) { return [row[0], row[1]]; }),
           done: closed.state.done.map(function (row) { return [row[0], row[1]]; }),
           merged: closed.state.merged, asks_n: closed.state.asks_n,
           served_first: first.served, served_wide: wide.served,
           pair_differs: first.served !== wide.served,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.served, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count_events: events.length,
           tail: waitOf([[ "a", 2 ]], "a") + joinedInto([[ "a", 1 ]], "a")[0][1]
             + releasedOf([[ "a", 2 ]], "a").length };
}
