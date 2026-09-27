export const PROTECT_EVERY = 15, MAX_PROTECTIONS = 2;
/**
 * BR-S1..S5. `results` = one entry per closed day the user was assigned a part, oldest first; true only if the user
 * read their own part (a backup's reading counts as false). Days with no assignment are simply absent (BR-S6).
 */
export function computeStreak(results: boolean[]) {
  let current = 0, best = 0, protections = 0, toward = 0;
  for (const ok of results) {
    if (ok) {
      best = Math.max(best, ++current);
      if (++toward === PROTECT_EVERY) { toward = 0; protections = Math.min(MAX_PROTECTIONS, protections + 1); }
    } else if (current > 0) { // nothing to protect when the streak is already 0
      if (protections > 0) protections--; // streak kept; a protected day does not advance the 15-day counter
      else { current = 0; toward = 0; }
    }
  }
  return { current, best, protections, toward };
}
