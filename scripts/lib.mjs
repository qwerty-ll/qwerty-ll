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
  // Local dev: CALENDAR_CACHE=/tmp/cal.json reuses one API response across runs.
  const cache = process.env.CALENDAR_CACHE;
  if (cache) {
    const { readFile, writeFile } = await import("node:fs/promises");
    try { return JSON.parse(await readFile(cache, "utf8")); } catch {}
    const cal = await fetchCalendarLive(login, token);
    await writeFile(cache, JSON.stringify(cal));
    return cal;
  }
  return fetchCalendarLive(login, token);
}

async function fetchCalendarLive(login, token) {
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

// Everything a generator usually needs: args, calendar, flat day list with grid coords.
export async function loadData(script) {
  const { login, outDir, token } = parseArgs(script);
  const calendar = await fetchCalendar(login, token);
  const days = [];
  calendar.weeks.forEach((w, col) =>
    w.contributionDays.forEach((d) =>
      days.push({ ...d, col, row: d.weekday, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })));
  days.forEach((d, i) => (d.index = i));
  return { login, outDir, calendar, days, weeks: calendar.weeks.length, total: calendar.totalContributions };
}

export async function save(outDir, file, svg) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, file), svg);
  return `${(svg.length / 1024).toFixed(0)} KB -> ${join(outDir, file)}`;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthKey = (date) => date.slice(0, 7);
export const monthName = (date) => MONTHS[Number(date.slice(5, 7)) - 1];
export const f1 = (n) => +n.toFixed(1);
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Group days by calendar month, in order.
export function monthsOf(days) {
  const out = [];
  for (const d of days) {
    const key = monthKey(d.date);
    if (out.at(-1)?.key !== key) out.push({ key, name: monthName(d.date), year: d.date.slice(0, 4), days: [] });
    out.at(-1).days.push(d);
  }
  for (const m of out) m.total = m.days.reduce((s, d) => s + d.count, 0);
  return out;
}

export const GH_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
export const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;
