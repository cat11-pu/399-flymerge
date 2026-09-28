// flyrun.js：按处理预算处理并留账；收尾把账做完
import { waitOf, joinedInto, releasedOf } from "./fly.js";

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function budgetOf(spec) {
  const value = Number(spec.budget);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

// 校验并归一化一条事件：ask -> ["ask", key]，done -> ["done", key, result]
function normalize(spec, event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(spec.event_error_code || "E_BAD_EVENT", "bad event");
  }
  if (event.kind !== "ask" && event.kind !== "done") {
    fail(spec.event_error_code || "E_BAD_EVENT", "bad event kind");
  }
  if (typeof event.key !== "string" || event.key.length === 0) {
    fail(spec.bad_key_code || "E_BAD_KEY", "bad key");
  }
  if (event.kind === "done") {
    if (typeof event.result !== "number" || !Number.isInteger(event.result) || event.result < 0) {
      fail(spec.bad_result_code || "E_BAD_RESULT", "bad result");
    }
    return { id: event.id === undefined ? Symbol(event.kind) : event.id, tuple: ["done", event.key, event.result] };
  }
  return { id: event.id === undefined ? Symbol(event.kind) : event.id, tuple: ["ask", event.key] };
}

// 已处理事件按 id 去重（同一元组可能来自两条不同事件，如两次 ask 同键）。
function isApplied(applied, id) {
  for (const done of applied) if (done === id) return true;
  return false;
}

// 从队列头开始消费，返回新状态与实际处理条数。
function consume(spec, queue, budget) {
  const src = spec.state || {};
  const flying = (src.flying || []).map(function (row) { return [row[0], row[1]]; });
  const done = (src.done || []).map(function (row) { return [row[0], row[1]]; });
  const applied = (src.appliedIds || []).slice();
  let merged = src.merged || 0;
  let asks = src.asks_n || 0;

  let served = 0;
  let index = 0;
  while (index < queue.length && served < budget) {
    const item = queue[index];
    index += 1;

    // 重放：已经处理过的事件不再占一次预算。
    if (isApplied(applied, item.id)) continue;

    const tuple = item.tuple;
    const key = tuple[1];
    if (tuple[0] === "ask") {
      asks += 1;
      if (waitOf(flying, key) > 0) merged += 1;
      const next = joinedInto(flying, key);
      flying.length = 0;
      next.forEach(function (row) { flying.push(row); });
    } else {
      if (waitOf(flying, key) === 0) {
        fail(spec.no_flight_code || "E_NO_FLIGHT", "no flight for key");
      }
      done.push([key, tuple[2]]);
      const next = releasedOf(flying, key);
      flying.length = 0;
      next.forEach(function (row) { flying.push(row); });
    }
    applied.push(item.id);
    served += 1;
  }

  const remaining = queue.slice(index);
  return {
    state: {
      flying: flying,
      done: done,
      merged: merged,
      asks_n: asks,
      ledger: remaining.map(function (item) { return item.tuple; }),
      applied: applied.slice(),
      appliedIds: applied
    },
    served: served,
    remaining: remaining
  };
}

// 队列：先消化账上旧账，再接本次新事件。账上条目没有原始 id，给一个稳定的负号标识。
function buildQueue(src, fresh) {
  const ledgerIds = src._ledgerIds || [];
  const backlog = (src.ledger || []).map(function (tuple, i) {
    return { id: ledgerIds[i] !== undefined ? ledgerIds[i] : -(i + 1), tuple: tuple.slice() };
  });
  return backlog.concat(fresh);
}

export function step(spec) {
  const src = spec.state || {};
  const fresh = (spec.events || []).map(function (event) { return normalize(spec, event); });
  const queue = buildQueue(src, fresh);

  const result = consume(spec, queue, budgetOf(spec));
  const state = result.state;
  state._ledgerIds = result.remaining.map(function (item) { return item.id; });
  return {
    state: state,
    served: result.served,
    ledger_before: state.ledger.length,
    ledger: state.ledger,
    judged: result.served,
    judged_bound: queue.length
  };
}

export function close(spec) {
  const src = spec.state || {};
  const fresh = (spec.events || []).map(function (event) { return normalize(spec, event); });
  const queue = buildQueue(src, fresh);

  // 收尾不受预算限制：账上的与本次补进来的一次做完。
  const result = consume(spec, queue, queue.length);
  return { state: result.state, catchup: result.served };
}
