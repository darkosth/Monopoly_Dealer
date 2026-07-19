export function normalizeTilt({ beta = 0, gamma = 0, screenAngle = 0 }) {
  const normalizedAngle = ((Number(screenAngle) % 360) + 360) % 360;
  if (normalizedAngle === 90) return -Number(gamma || 0);
  if (normalizedAngle === 270) return Number(gamma || 0);
  if (normalizedAngle === 180) return -Number(beta || 0);
  return Number(beta || 0);
}

export function projectForeheadTilt({ beta, gamma }) {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;

  const radians = Math.PI / 180;
  const screenNormalVertical = Math.cos(beta * radians) * Math.cos(gamma * radians);
  const clampedProjection = Math.min(1, Math.max(-1, screenNormalVertical));

  return -Math.asin(clampedProjection) / radians;
}

export function createTiltDetector({ threshold = 40, neutralThreshold = 12, cooldownMs = 1500 } = {}) {
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
