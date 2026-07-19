import { describe, expect, it } from "vitest";
import { createRound, recordGesture } from "../../src/lib/heads-up/gameEngine.mjs";

describe("Heads Up game engine", () => {
  it("creates a deterministic round without duplicate options", () => {
    const round = createRound({
      options: [{ id: "1" }, { id: "2" }, { id: "3" }],
      durationSeconds: 90,
      random: () => 0.5,
    });

    expect(round.durationSeconds).toBe(90);
    expect(new Set(round.queue.map((option) => option.id)).size).toBe(3);
    expect(round.correct).toEqual([]);
    expect(round.passed).toEqual([]);
  });

  it("records correct and pass gestures while advancing the queue", () => {
    const initial = createRound({ options: [{ id: "1" }, { id: "2" }], durationSeconds: 60, random: () => 0.5 });
    const correct = recordGesture(initial, "correct");
    const passed = recordGesture(correct, "pass");

    expect(correct.correct.map((option) => option.id)).toEqual([initial.queue[0].id]);
    expect(passed.passed).toHaveLength(1);
    expect(passed.currentIndex).toBe(2);
  });
});
