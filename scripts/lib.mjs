// Shared helpers for the profile animations.

export const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

export function parseArgs(script) {
  const login = process.argv[2];
  const outDir = process.argv[3] ?? "dist";
  const token = process.env.GITHUB_TOKEN;
  if (!login || !token) {
    console.error(`usage: GITHUB_TOKEN=... node ${script} <login> [outDir]`);
    process.exit(1);
  }
  return { login, outDir, token };
}

export async function fetchCalendar(login, token) {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    totalContributions weeks{contributionDays{date weekday contributionCount contributionLevel}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data.user.contributionsCollection.contributionCalendar;
}

// CSS @keyframes builder for one looping timeline of `duration` seconds.
// Frames are [time, css, tween?]. Without `tween` the value jumps at `time`
// instead of easing in from the previous frame, so a hold is inserted just before.
export const TW = true;
export function keyframeBuilder(duration) {
  const HOLD = 0.002;
  const pct = (s) => `${Math.max(0, Math.min(100, (s / duration) * 100)).toFixed(4)}%`;
  return function keyframes(name, frames) {
    // Pin both ends, otherwise CSS eases toward the element's un-animated style.
    if (frames[0][0] > 0) frames = [[0, frames[0][1]], ...frames];
    if (frames.at(-1)[0] < duration) frames = [...frames, [duration, frames.at(-1)[1]]];
    const out = [];
    for (const [s, css, tween] of frames) {
      const prev = out.at(-1);
      if (prev && !tween && s - HOLD > prev[0] && prev[1] !== css) out.push([s - HOLD, prev[1]]);
      out.push([s, css]);
    }
    return `@keyframes ${name}{${out.map(([s, css]) => `${pct(s)}{${css}}`).join("")}}`;
  };
}

// Deterministic PRNG so the scenery doesn't change between daily runs.
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
