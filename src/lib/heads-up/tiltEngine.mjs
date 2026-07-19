export function normalizeTilt({ beta = 0, gamma = 0, screenAngle = 0 }) {
  const normalizedAngle = ((Number(screenAngle) % 360) + 360) % 360;
  if (normalizedAngle === 90) return -Number(gamma || 0);
  if (normalizedAngle === 270) return Number(gamma || 0);
  if (normalizedAngle === 180) return -Number(beta || 0);
  return Number(beta || 0);
}

export function createTiltDetector({ threshold = 32, neutralThreshold = 12, cooldownMs = 650 } = {}) {
  let baseline = null;
  let armed = true;
  let lastGestureAt = Number.NEGATIVE_INFINITY;

  return {
    calibrate(value) {
      baseline = Number(value) || 0;
      armed = true;
    },
    update(value, now = Date.now()) {
      const numericValue = Number(value) || 0;
      if (baseline === null) baseline = numericValue;
      const delta = numericValue - baseline;

      if (!armed) {
        if (Math.abs(delta) <= neutralThreshold) armed = true;
        return null;
      }

      if (now - lastGestureAt < cooldownMs) return null;
      if (delta >= threshold) {
        armed = false;
        lastGestureAt = now;
        return "correct";
      }
      if (delta <= -threshold) {
        armed = false;
        lastGestureAt = now;
        return "pass";
      }
      return null;
    },
  };
}
