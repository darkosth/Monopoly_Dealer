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

  it("ignores small movements with the default sensitivity", () => {
    const detector = createTiltDetector();

    expect(detector.update(0, 0)).toBeNull();
    expect(detector.update(38, 100)).toBeNull();
    expect(detector.update(42, 200)).toBe("correct");
  });

  it("waits 1.5 seconds before capturing the next gesture", () => {
    const detector = createTiltDetector();

    expect(detector.update(0, 0)).toBeNull();
    expect(detector.update(45, 100)).toBe("correct");
    expect(detector.update(0, 200)).toBeNull();
    expect(detector.update(-45, 1400)).toBeNull();
    expect(detector.update(-45, 1600)).toBe("pass");
  });
});
