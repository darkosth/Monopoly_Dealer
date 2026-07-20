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
    results: [],
  };
}

function withResultLists(round, results) {
  return {
    ...round,
    results,
    correct: results.filter((result) => result.outcome === "correct").map((result) => result.option),
    passed: results.filter((result) => result.outcome === "pass").map((result) => result.option),
  };
}

export function recordGesture(round, gesture) {
  const current = round.queue[round.currentIndex];
  if (!current || !["correct", "pass"].includes(gesture)) return round;

  return withResultLists({
    ...round,
    currentIndex: round.currentIndex + 1,
  }, [...round.results, { option: current, outcome: gesture }]);
}

export function toggleResult(round, resultIndex) {
  if (!Number.isInteger(resultIndex) || !round.results[resultIndex]) return round;

  const results = round.results.map((result, index) => index === resultIndex
    ? { ...result, outcome: result.outcome === "correct" ? "pass" : "correct" }
    : result);

  return withResultLists(round, results);
}
