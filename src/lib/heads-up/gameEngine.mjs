export function shuffleOptions(options, random = Math.random) {
  const queue = [...options];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
  }
  return queue;
}

export function createRound({ options, durationSeconds = 60, random = Math.random }) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error("At least one option is required");
  }

  return {
    queue: shuffleOptions(options, random),
    durationSeconds: Math.min(300, Math.max(15, Number(durationSeconds) || 60)),
    currentIndex: 0,
    correct: [],
    passed: [],
  };
}

export function recordGesture(round, gesture) {
  const current = round.queue[round.currentIndex];
  if (!current || !["correct", "pass"].includes(gesture)) return round;

  return {
    ...round,
    currentIndex: round.currentIndex + 1,
    correct: gesture === "correct" ? [...round.correct, current] : round.correct,
    passed: gesture === "pass" ? [...round.passed, current] : round.passed,
  };
}
