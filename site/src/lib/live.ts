/**
 * In-play odds: the pre-match expected goals scaled to the time left, added to the current score.
 */

function poisson(lambda: number, max = 10): number[] {
  const out = [Math.exp(-lambda)];
  for (let k = 1; k <= max; k++) out.push((out[k - 1] * lambda) / k);
  return out;
}

/** Minutes played, estimated from the kick-off time (15 minutes of half-time after the 45th). */
export function minutePlayed(kickoff: string, now: number): number {
  const real = (now - Date.parse(kickoff)) / 60_000;
  const played = real <= 45 ? real : real <= 60 ? 45 : real - 15;
  return Math.max(0, Math.min(90, Math.round(played)));
}

/** [home win, draw, away win] from the current score with `minute` of 90 played. */
export function liveOdds(lh: number, la: number, hg: number, ag: number, minute: number): [number, number, number] {
  const left = Math.max(0, 90 - minute) / 90;
  const h = poisson(lh * left);
  const a = poisson(la * left);
  let win = 0;
  let draw = 0;
  let loss = 0;
  for (let i = 0; i < h.length; i++)
    for (let j = 0; j < a.length; j++) {
      const p = h[i] * a[j];
      const fh = hg + i;
      const fa = ag + j;
      if (fh > fa) win += p;
      else if (fh === fa) draw += p;
      else loss += p;
    }
  const total = win + draw + loss;
  return [win / total, draw / total, loss / total];
}
