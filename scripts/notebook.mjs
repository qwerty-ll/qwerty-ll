// A school squared-paper notebook: a pencil hatches every active day into its
// square, then the teacher circles a red "5+". Labels are in Russian.
// Usage: GITHUB_TOKEN=... node scripts/notebook.mjs <login> [outDir]

import { TW, esc, f1, keyframeBuilder, loadData, rng, save } from "./lib.mjs";

const { login, outDir, days, weeks, total } = await loadData("notebook.mjs");
const random = rng(505);
const SQ = 14;                                  // one notebook square = one day
const W = 860, H = 238;
const GX = 84, GY = 70;
const HAND = `"Segoe Print","Comic Sans MS","Chalkboard SE","Bradley Hand",cursive`;
const PEN = "#1f4e9c", RED = "#d32f2f", GRAPHITE = "#5b5b5b";
const PENCIL = ["", "#9fd89a", "#5fbf68", "#2f9444", "#1b6530"];
const RU_MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const RU_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const plural = (n, [one, few, many]) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

// ---------- timeline ----------
const cells = days.filter((d) => d.count > 0).map((d) => ({ ...d, x: GX + d.col * SQ, y: GY + d.row * SQ }));
const TITLE = 1.4, MOVE = 0.2;
let t = TITLE + 0.3;
for (const c of cells) {
  c.tMove = t;
  c.tStart = t + MOVE;
  c.tEnd = c.tStart + 0.26 + c.level * 0.06;
  t = c.tEnd;
}
const SHADED = t;
const MARK = SHADED + 0.7;
const DURATION = MARK + 4.2;
const keyframes = keyframeBuilder(DURATION);
const css = [];
const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);
const WIPE = [DURATION - 0.7, DURATION - 0.1];      // everything is erased before the loop restarts
const reveal = (name, at, dur) => anim(name, [[0, "transform:scaleX(0)"], [at, "transform:scaleX(0)"], [at + dur, "transform:scaleX(1)", TW], [WIPE[0], "transform:scaleX(1)"], [WIPE[1], "transform:scaleX(0)"]], "fbl");

// ---------- paper ----------
const defs = [], out = [];
defs.push(`<pattern id="sq" width="${SQ}" height="${SQ}" patternUnits="userSpaceOnUse" x="${GX}" y="${GY}"><path d="M${SQ} 0H0V${SQ}" fill="none" stroke="#9fbfe0" stroke-width=".7" opacity=".75"/></pattern>`);
defs.push(`<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity=".25"/></filter>`);
defs.push(`<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>`);
defs.push(`<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .45 0 0 0 0 .4 0 0 0 0 .3 0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`);
out.push(`<rect x="3" y="3" width="${W - 6}" height="${H - 8}" rx="6" fill="#fbfaf3" filter="url(#shadow)"/>`);
out.push(`<rect x="3" y="3" width="${W - 6}" height="${H - 8}" rx="6" fill="url(#sq)"/>`);
out.push(`<rect x="3" y="3" width="${W - 6}" height="${H - 8}" rx="6" fill="#fff" filter="url(#grain)"/>`);
out.push(`<line x1="${GX - SQ * 2}" y1="3" x2="${GX - SQ * 2}" y2="${H - 5}" stroke="#e57373" stroke-width="1.2" opacity=".8"/>`);

// heading, written with a pen
const last = days.at(-1).date;
const date = `${Number(last.slice(8))} ${RU_GEN[Number(last.slice(5, 7)) - 1]}`;
defs.push(`<clipPath id="h1"><rect x="${W / 2 - 120}" y="10" width="240" height="22" ${reveal("h1", 0.2, 0.6)}/></clipPath>`);
defs.push(`<clipPath id="h2"><rect x="${W / 2 - 120}" y="32" width="240" height="22" ${reveal("h2", 0.8, 0.6)}/></clipPath>`);
out.push(`<text x="${W / 2}" y="27" class="hand pen" text-anchor="middle" clip-path="url(#h1)">${date}</text>`);
out.push(`<text x="${W / 2}" y="48" class="hand pen" text-anchor="middle" clip-path="url(#h2)">Классная работа</text>`);
out.push(`<text x="${W - 20}" y="27" class="hand pen small" text-anchor="end" opacity=".8">@${esc(login)}</text>`);

// month and weekday labels in pencil
let labels = "";
let lastCol = -3;
const firstOfCol = new Map();
for (const d of days) if (!firstOfCol.has(d.col)) firstOfCol.set(d.col, d);
for (const [col, d] of firstOfCol)
  if (Number(d.date.slice(8)) <= 7 && col - lastCol >= 3 && col < weeks - 1) {
    labels += `<text x="${GX + col * SQ + 1}" y="${GY - 5}" class="hand pencil">${RU_MONTHS[Number(d.date.slice(5, 7)) - 1]}</text>`;
    lastCol = col;
  }
["Пн", "Ср", "Пт"].forEach((n, k) => (labels += `<text x="${GX - 6}" y="${GY + (1 + 2 * k) * SQ + 11}" class="hand pencil" text-anchor="end">${n}</text>`));
// a slightly wobbly pencil frame around the year
const wob = () => f1((random() - 0.5) * 1.4);
const fx0 = GX - 1, fy0 = GY - 1, fx1 = GX + weeks * SQ + 1, fy1 = GY + 7 * SQ + 1;
const frame = `M${fx0 + wob()} ${fy0 + wob()}L${f1((fx0 + fx1) / 2)} ${fy0 + wob()}L${fx1 + wob()} ${fy0 + wob()}L${fx1 + wob()} ${fy1 + wob()}L${f1((fx0 + fx1) / 2)} ${fy1 + wob()}L${fx0 + wob()} ${fy1 + wob()}Z`;
out.push(`<g ${anim("labels", [[0, "opacity:0"], [TITLE - 0.2, "opacity:0"], [TITLE + 0.3, "opacity:1", TW], [WIPE[0], "opacity:1"], [WIPE[1], "opacity:0", TW]])}>${labels}
  <path d="${frame}" fill="none" stroke="${GRAPHITE}" stroke-width="1.1" stroke-linejoin="round" opacity=".7"/></g>`);

// ---------- hatching ----------
function hatch(c) {
  const pad = 1.6, x0 = c.x + pad, y0 = c.y + pad, w = SQ - 2 * pad, h = SQ - 2 * pad;
  const n = 7 + c.level * 2;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const top = k % 2 === 0;
    const x = x0 + (k / n) * w + (top ? 1.2 : -1.2) + (random() - 0.5) * 0.6;
    pts.push([f1(Math.min(x0 + w, Math.max(x0, x))), f1((top ? y0 : y0 + h) + (random() - 0.5) * 0.8)]);
  }
  if (c.level >= 3) {  // second pass across, like pressing harder
    for (let k = 0; k <= n / 2; k++) {
      const left = k % 2 === 0;
      pts.push([f1(left ? x0 + 0.5 : x0 + w - 0.5), f1(y0 + h - (k / (n / 2)) * h)]);
    }
  }
  return pts;
}
const tip = [];     // pencil tip keyframes
let shading = "";
cells.forEach((c, i) => {
  const pts = hatch(c);
  const d = "M" + pts.map((p) => p.join(" ")).join("L");
  // a light wash under the strokes so the square reads as shaded
  shading += `<rect x="${c.x + 1}" y="${c.y + 1}" width="${SQ - 2}" height="${SQ - 2}" fill="${PENCIL[c.level]}" ${anim(`w${i}`, [
    [0, "opacity:0"], [c.tStart, "opacity:0"], [c.tEnd, "opacity:.38", TW], [WIPE[0], "opacity:.38"], [WIPE[1], "opacity:0", TW],
  ])}/>`;
  shading += `<path d="${d}" pathLength="1" stroke-dasharray="1 2" fill="none" stroke="${PENCIL[c.level]}" stroke-width="${f1(1.5 + c.level * 0.25)}" stroke-linecap="round" stroke-linejoin="round" opacity=".92" ${anim(`h${i}`, [
    [0, "stroke-dashoffset:1;opacity:.92"], [c.tStart, "stroke-dashoffset:1;opacity:.92"], [c.tEnd, "stroke-dashoffset:0;opacity:.92", TW],
    [WIPE[0], "stroke-dashoffset:0;opacity:.92"], [WIPE[1], "stroke-dashoffset:0;opacity:0", TW],
  ])}><title>${c.count} — ${c.date}</title></path>`;
  tip.push([c.tMove, null], [c.tStart, pts[0]]);
  pts.forEach((p, k) => tip.push([c.tStart + ((k + 1) / pts.length) * (c.tEnd - c.tStart), p]));
});
out.push(shading);

// ---------- pencil ----------
const pencil = `
  <g transform="rotate(-38)">
    <path d="M0 0L15 -5.5V5.5Z" fill="#f2c98c"/>
    <path d="M0 0L5 -1.9V1.9Z" fill="#3a3a3a"/>
    <rect x="15" y="-5.5" width="78" height="11" fill="#ffcc2f"/>
    <rect x="15" y="-5.5" width="78" height="3.6" fill="#ffe07a"/>
    <rect x="15" y="1.9" width="78" height="3.6" fill="#e0a800"/>
    <rect x="93" y="-5.8" width="10" height="11.6" fill="#b9bec6"/><rect x="95" y="-5.8" width="1.4" height="11.6" fill="#8b919a"/><rect x="99" y="-5.8" width="1.4" height="11.6" fill="#8b919a"/>
    <rect x="103" y="-5.5" width="11" height="11" rx="2.5" fill="#f28b95"/>
  </g>`;
const REST = [W - 34, H - 16];
const tipFrames = [[0, `transform:translate(${REST[0]}px,${REST[1]}px)`], [TITLE, `transform:translate(${REST[0]}px,${REST[1]}px)`]];
let prev = REST;
for (const [time, p] of tip) {
  if (!p) { tipFrames.push([time, `transform:translate(${prev[0]}px,${prev[1]}px);animation-timing-function:ease-in-out`]); continue; }
  tipFrames.push([time, `transform:translate(${p[0]}px,${p[1]}px)`, TW]);
  prev = p;
}
tipFrames.push([SHADED + 0.5, `transform:translate(${REST[0]}px,${REST[1]}px)`, TW]);
// shadow first, pencil on top
out.push(`<g ${anim("pshadow", tipFrames.map(([a, b, c]) => [a, b.replace(/translate\(([\d.]+)px,([\d.]+)px\)/, (_, x, y) => `translate(${f1(+x + 5)}px,${f1(+y + 7)}px)`), c]))}><g opacity=".18" filter="url(#soft)">${pencil}</g></g>`);
out.push(`<g ${anim("pencil", tipFrames)}>${pencil}</g>`);

// ---------- footer: total, legend, teacher's mark ----------
const word = plural(total, ["коммит", "коммита", "коммитов"]);
defs.push(`<clipPath id="tot"><rect x="${GX - 30}" y="${fy1 + 10}" width="300" height="26" ${reveal("tot", SHADED + 0.1, 0.8)}/></clipPath>`);
out.push(`<text x="${GX - 26}" y="${fy1 + 30}" class="hand pen" clip-path="url(#tot)">Итого: ${total} ${word} за год ✓</text>`);
let legend = `<text x="${fx1 - 128}" y="${fy1 + 26}" class="hand pencil" text-anchor="end">меньше</text>`;
PENCIL.forEach((c, k) => {
  const x = fx1 - 122 + k * (SQ + 4), y = fy1 + 15;
  legend += c ? `<rect x="${x + 1.5}" y="${y + 1.5}" width="${SQ - 3}" height="${SQ - 3}" fill="${c}" rx="1"/>` : `<rect x="${x + 1.5}" y="${y + 1.5}" width="${SQ - 3}" height="${SQ - 3}" fill="none" stroke="${GRAPHITE}" stroke-width=".6" rx="1"/>`;
});
legend += `<text x="${fx1 - 122 + 5 * (SQ + 4) + 2}" y="${fy1 + 26}" class="hand pencil">больше</text>`;
out.push(`<g ${anim("legend", [[0, "opacity:0"], [TITLE, "opacity:0"], [TITLE + 0.4, "opacity:1", TW], [WIPE[0], "opacity:1"], [WIPE[1], "opacity:0", TW]])}>${legend}</g>`);

// the red "5+" circled by the teacher
const MX = GX + 360, MY = fy1 + 26;
out.push(`<g transform="translate(${MX},${MY}) rotate(-10)">
  <path d="M-19 -2C-20 -18 2 -24 14 -14C24 -6 21 12 6 17C-8 21 -21 12 -19 -2C-18 -12 -8 -19 3 -19" fill="none" stroke="${RED}" stroke-width="2" stroke-linecap="round" pathLength="1" stroke-dasharray="1 2" ${anim("ring", [
    [0, "stroke-dashoffset:1"], [MARK + 0.35, "stroke-dashoffset:1"], [MARK + 0.9, "stroke-dashoffset:0", TW], [WIPE[0], "stroke-dashoffset:0"], [WIPE[1], "stroke-dashoffset:1"],
  ])}/>
  <text x="0" y="9" text-anchor="middle" ${anim("five", [[0, "opacity:0;transform:scale(1.6)"], [MARK, "opacity:0;transform:scale(1.6)"], [MARK + 0.3, "opacity:1;transform:scale(1)", TW], [WIPE[0], "opacity:1;transform:scale(1)"], [WIPE[1], "opacity:0;transform:scale(1)", TW]], "fb hand mark")}>5+</text>
</g>`);
defs.push(`<clipPath id="good"><rect x="${MX + 28}" y="${MY - 12}" width="90" height="24" ${reveal("good", MARK + 1, 0.6)}/></clipPath>`);
out.push(`<text x="${MX + 30}" y="${MY + 6}" class="hand red" clip-path="url(#good)">Молодец!</text>`);

const style = `
  .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
  .fb{transform-box:fill-box;transform-origin:center}
  .fbl{transform-box:fill-box;transform-origin:left center}
  .hand{font-family:${HAND}}
  .pen{font-size:15px;fill:${PEN}}
  .small{font-size:12px}
  .pencil{font-size:11px;fill:${GRAPHITE}}
  .mark{font-size:26px;font-weight:bold;fill:${RED}}
  .red{font-size:13px;fill:${RED}}
  ${css.join("\n")}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${login}: contributions shaded in a squared notebook</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
${out.join("\n")}
</svg>`;
console.log(`${cells.length} squares shaded, ${DURATION.toFixed(1)}s loop, ${await save(outDir, "notebook.svg", svg)}`);
