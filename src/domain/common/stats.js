// 공통 유틸: clamp, 정규분포 CDF 근사

export function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// 정규분포 CDF 근사 (mu=0, sigma=1)
export function normalCdfApprox(z) {
  // Abramowitz & Stegun 근사식
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) prob = 1 - prob;
  return prob;
}
