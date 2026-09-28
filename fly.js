// fly.js：等待人数、合并一趟与摘掉一趟
export function waitOf(flying, key) {
  for (const row of flying || []) {
    if (row[0] === key) return row[1];
  }
  return 0;
}

function sorted(rows) {
  return rows.slice().sort(function (a, b) {
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
}

export function joinedInto(flying, key) {
  const rows = (flying || []).map(function (row) { return [row[0], row[1]]; });
  let hit = false;
  for (const row of rows) {
    if (row[0] === key) { row[1] += 1; hit = true; break; }
  }
  if (!hit) rows.push([key, 1]);
  return sorted(rows);
}

export function releasedOf(flying, key) {
  return sorted((flying || [])
    .filter(function (row) { return row[0] !== key; })
    .map(function (row) { return [row[0], row[1]]; }));
}
