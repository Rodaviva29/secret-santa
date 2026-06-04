import { describe, expect, it } from "vitest";
import { DrawError, runDraw } from "./draw";

const RUNS = 200;

describe("runDraw", () => {
  it("throws with fewer than 2 participants", () => {
    expect(() => runDraw([1])).toThrow(DrawError);
  });

  it("produces a valid derangement (no self-assignment)", () => {
    const ids = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < RUNS; i++) {
      const { pairs } = runDraw(ids);
      // everyone is a giver exactly once
      expect([...pairs.keys()].sort()).toEqual(ids);
      // everyone is a receiver exactly once
      expect([...pairs.values()].sort()).toEqual(ids);
      // nobody draws themselves
      for (const [g, r] of pairs) expect(g).not.toBe(r);
    }
  });

  it("respects symmetric exclusions across many runs", () => {
    const ids = [1, 2, 3, 4, 5, 6];
    const exclusions: Array<[number, number]> = [
      [1, 2],
      [3, 4],
    ];
    for (let i = 0; i < RUNS; i++) {
      const { pairs } = runDraw(ids, exclusions);
      expect(pairs.get(1)).not.toBe(2);
      expect(pairs.get(2)).not.toBe(1);
      expect(pairs.get(3)).not.toBe(4);
      expect(pairs.get(4)).not.toBe(3);
    }
  });

  it("avoids history when feasible (soft constraint)", () => {
    const ids = [1, 2, 3, 4, 5];
    // last year's cycle
    const history: Array<[number, number]> = [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 1],
    ];
    let repeats = 0;
    for (let i = 0; i < RUNS; i++) {
      const { pairs } = runDraw(ids, [], history);
      for (const [g, r] of history) if (pairs.get(g) === r) repeats++;
    }
    // with 5 people there is plenty of room — should essentially never repeat
    expect(repeats).toBe(0);
  });

  it("throws when exclusions make assignment impossible", () => {
    // 2 people who exclude each other: only possible pairing is forbidden
    expect(() => runDraw([1, 2], [[1, 2]])).toThrow(DrawError);
  });

  it("still produces a full permutation when self-draw is allowed", () => {
    const ids = [1, 2, 3, 4, 5];
    for (let i = 0; i < RUNS; i++) {
      const { pairs } = runDraw(ids, [], [], { allowSelfDraw: true });
      expect([...pairs.keys()].sort()).toEqual(ids);
      expect([...pairs.values()].sort()).toEqual(ids);
    }
  });

  it("allows self-assignment in the only-possible case when self-draw is on", () => {
    // 2 people who exclude each other: a derangement is impossible, but with
    // self-draw each gives to themselves.
    const { pairs } = runDraw([1, 2], [[1, 2]], [], { allowSelfDraw: true });
    expect(pairs.get(1)).toBe(1);
    expect(pairs.get(2)).toBe(2);
  });

  it("still honours exclusions when self-draw is allowed", () => {
    const ids = [1, 2, 3, 4];
    for (let i = 0; i < RUNS; i++) {
      const { pairs } = runDraw(ids, [[1, 2]], [], { allowSelfDraw: true });
      expect(pairs.get(1)).not.toBe(2);
      expect(pairs.get(2)).not.toBe(1);
    }
  });

  it("handles a tightly-constrained-but-solvable case", () => {
    // n=3 with one excluded pair is unsolvable (both derangements use a
    // forbidden edge), so use n=4 where a valid assignment still exists.
    const ids = [1, 2, 3, 4];
    for (let i = 0; i < RUNS; i++) {
      const { pairs } = runDraw(ids, [[1, 2]]);
      expect([...pairs.values()].sort()).toEqual(ids);
      expect(pairs.get(1)).not.toBe(2);
      expect(pairs.get(2)).not.toBe(1);
      for (const [g, r] of pairs) expect(g).not.toBe(r);
    }
  });
});
