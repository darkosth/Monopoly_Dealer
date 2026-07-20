import { describe, expect, it } from "vitest";
import { createRound, recordGesture, toggleResult } from "../../src/lib/heads-up/gameEngine.mjs";

function completedRound() {
  const initial = createRound({
    options: [
      { id: "1", text: "Lion" },
      { id: "2", text: "Tiger" },
      { id: "3", text: "Bear" },
    ],
    random: () => 0.999,
  });

  return ["correct", "pass", "correct"].reduce(recordGesture, initial);
}

describe("Heads Up result correction", () => {
  it("preserves the exact order in which results were recorded", () => {
    expect(completedRound().results.map(({ option, outcome }) => [option.id, outcome])).toEqual([
      ["1", "correct"],
      ["2", "pass"],
      ["3", "correct"],
    ]);
  });

  it("changes a pass to correct and recalculates both score lists", () => {
    const corrected = toggleResult(completedRound(), 1);

    expect(corrected.results.map(({ option, outcome }) => [option.id, outcome])).toEqual([
      ["1", "correct"],
      ["2", "correct"],
      ["3", "correct"],
    ]);
    expect(corrected.correct.map((option) => option.id)).toEqual(["1", "2", "3"]);
    expect(corrected.passed).toEqual([]);
  });

  it("changes a correct result to pass without moving its row", () => {
    const corrected = toggleResult(completedRound(), 0);

    expect(corrected.results.map(({ option }) => option.id)).toEqual(["1", "2", "3"]);
    expect(corrected.correct.map((option) => option.id)).toEqual(["3"]);
    expect(corrected.passed.map((option) => option.id)).toEqual(["1", "2"]);
  });

  it("ignores an invalid result index", () => {
    const round = completedRound();
    expect(toggleResult(round, 99)).toBe(round);
  });
});
