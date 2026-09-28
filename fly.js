// fly.js：等待人数、合并一趟与摘掉一趟（基线：一律给零与空表）
export function waitOf(flying, key) {
  return 0;
}

export function joinedInto(flying, key) {
  return flying;
}

export function releasedOf(flying, key) {
  return flying;
}
