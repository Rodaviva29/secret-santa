/**
 * Exclusion-aware secret-santa draw.
 *
 * Generalises the original Fisher-Yates cycle approach (old
 * routes/sorteio.js) into a constraint solver: produce a derangement
 * (nobody draws themselves) that also respects forbidden pairs, and —
 * when possible — avoids repeating pairings from previous draws.
 */

export interface DrawResult {
  /** giver id -> receiver id */
  pairs: Map<number, number>;
}

export class DrawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DrawError";
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairKey(giver: number, receiver: number): string {
  return `${giver}->${receiver}`;
}

interface SolveOptions {
  /** participant ids taking part in this draw */
  ids: number[];
  /**
   * Forbidden ordered pairs as a set of `giver->receiver` keys.
   * Exclusions are symmetric, so callers should add both directions.
   */
  forbidden: Set<string>;
  /** how many random restarts before giving up */
  attempts?: number;
}

/**
 * Backtracking assignment. Each giver gets a distinct receiver that is
 * not themselves and not forbidden. Returns null if this restart fails.
 */
function tryAssign(opts: SolveOptions): Map<number, number> | null {
  const { ids, forbidden } = opts;
  const givers = shuffle(ids);
  const used = new Set<number>();
  const pairs = new Map<number, number>();

  const backtrack = (i: number): boolean => {
    if (i === givers.length) return true;
    const giver = givers[i];
    const candidates = shuffle(ids).filter(
      (r) => r !== giver && !used.has(r) && !forbidden.has(pairKey(giver, r)),
    );
    for (const receiver of candidates) {
      pairs.set(giver, receiver);
      used.add(receiver);
      if (backtrack(i + 1)) return true;
      used.delete(receiver);
      pairs.delete(giver);
    }
    return false;
  };

  return backtrack(0) ? pairs : null;
}

/**
 * Run a draw.
 *
 * @param ids        participant ids (need at least 2)
 * @param exclusions symmetric forbidden pairs `[a, b]`
 * @param history    previous `giver->receiver` pairs to avoid as a soft
 *                   constraint (relaxed automatically if unsatisfiable)
 */
export function runDraw(
  ids: number[],
  exclusions: Array<[number, number]> = [],
  history: Array<[number, number]> = [],
): DrawResult {
  if (ids.length < 2) {
    throw new DrawError("Need at least 2 participants to run a draw.");
  }

  const hard = new Set<string>();
  for (const [a, b] of exclusions) {
    hard.add(pairKey(a, b));
    hard.add(pairKey(b, a));
  }

  // Quick feasibility check: every giver must have >=1 allowed receiver.
  for (const g of ids) {
    const ok = ids.some((r) => r !== g && !hard.has(pairKey(g, r)));
    if (!ok) {
      throw new DrawError(
        "No valid assignment exists — exclusions are too restrictive.",
      );
    }
  }

  const ATTEMPTS = 500;
  const histSet = new Set(history.map(([g, r]) => pairKey(g, r)));

  // Phase 1: try to satisfy hard + soft (history) constraints.
  if (histSet.size > 0) {
    const softForbidden = new Set([...hard, ...histSet]);
    for (let i = 0; i < ATTEMPTS; i++) {
      const pairs = tryAssign({ ids, forbidden: softForbidden });
      if (pairs) return { pairs };
    }
  }

  // Phase 2: relax history, keep hard exclusions.
  for (let i = 0; i < ATTEMPTS; i++) {
    const pairs = tryAssign({ ids, forbidden: hard });
    if (pairs) return { pairs };
  }

  throw new DrawError(
    "Could not find a valid assignment after many attempts — try relaxing exclusions.",
  );
}
