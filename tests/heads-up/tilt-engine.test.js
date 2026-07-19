import { describe, expect, it } from "vitest";
import { createTiltDetector, normalizeTilt } from "../../src/lib/heads-up/tiltEngine.mjs";

describe("Heads Up tilt engine", () => {
  it("normalizes both landscape orientations to the same gesture axis", () => {
    expect(normalizeTilt({ beta: 10, gamma: 35, screenAngle: 90 })).toBe(-35);
    expect(normalizeTilt({ beta: 10, gamma: -35, screenAngle: 270 })).toBe(-35);
  });

  it("fires once and rearms only after returning to neutral", () => {
    const detector = createTiltDetector({ threshold: 30, neutralThreshold: 12, cooldownMs: 0 });

    expect(detector.update(0, 0)).toBeNull();
    expect(detector.update(38, 10)).toBe("correct");
    expect(detector.update(42, 20)).toBeNull();
    expect(detector.update(5, 30)).toBeNull();
    expect(detector.update(-38, 40)).toBe("pass");
  });
});
