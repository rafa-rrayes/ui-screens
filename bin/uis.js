#!/usr/bin/env node
/* uis — UI Screens CLI. Zero dependencies. Run `uis help`. */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");
const http = require("http");
const { execFile } = require("child_process");

const PKG = path.resolve(__dirname, "..");
const KIT = path.join(PKG, "kit");
const TPL = path.join(PKG, "templates");

// ---------- args ----------
function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) out.flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out.flags[k] = argv[++i];
      else out.flags[k] = true;
    } else out._.push(a);
  }
  return out;
}
const BOOL = new Set(["json", "all", "web", "scroll", "sheet", "tabs", "force", "no-browser", "quiet"]);
function normalizeFlags(args) {
  // boolean flags must not swallow the next positional argument
  for (const k of Object.keys(args.flags)) {
    if (BOOL.has(k) && typeof args.flags[k] === "string") { args._.push(args.flags[k]); args.flags[k] = true; }
  }
  return args;
}

// ---------- project ----------
function findRoot(start) {
  let d = path.resolve(start);
  for (;;) {
    for (const cand of [d, path.join(d, "ui")]) if (fs.existsSync(path.join(cand, "screens", "manifest.js"))) return cand;
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}
function project(flags) {
  const root = flags.dir ? path.resolve(flags.dir) : findRoot(process.cwd());
  if (!root || !fs.existsSync(path.join(root, "screens", "manifest.js"))) die("No UI project found (looked for screens/manifest.js here, in ./ui and in parent folders). Run `uis init` or pass --dir.");
  const manifestPath = path.join(root, "screens", "manifest.js");
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(manifestPath, "utf8"), ctx, { filename: manifestPath });
  const M = ctx.window.UIS;
  if (!M || !Array.isArray(M.groups)) die(`${rel(manifestPath)} must set window.UIS = { name, groups: [...] }`);
  M.devices = Object.assign({ phone: { w: 402, h: 874 }, tablet: { w: 834, h: 1194 }, desktop: { w: 1280, h: 832 } }, M.devices || {});
  const screens = [];
  for (const g of M.groups) for (const [code, title] of g.screens) screens.push({ code, title, group: g, device: g.device || "phone", file: path.join(root, "screens", code + ".html") });
  return { root, manifestPath, M, screens, byCode: Object.fromEntries(screens.map((s) => [s.code, s])) };
}
function writeManifest(p) {
  const { M } = p;
  const devices = Object.entries(M.devices).filter(([k, v]) => !(DEFAULT_DEV[k] && DEFAULT_DEV[k].w === v.w && DEFAULT_DEV[k].h === v.h));
  const lines = [
    "// Screen manifest — the single list of artboards. The gallery (index.html) and the `uis` CLI read it.",
    "// One group per flow. Codes are <group letter><number> and match screens/<CODE>.html.",
    "// device: phone (402×874) · tablet (834×1194) · desktop (1280×832) or any key in `devices`.",
    "window.UIS = {",
    `  name: ${JSON.stringify(M.name || "UI")},`,
    `  lang: ${JSON.stringify(M.lang || "en")},`,
  ];
  if (devices.length) lines.push(`  devices: { ${devices.map(([k, v]) => `${k}: { w: ${v.w}, h: ${v.h} }`).join(", ")} },`);
  if (M.allowClasses && M.allowClasses.length) lines.push(`  allowClasses: ${JSON.stringify(M.allowClasses)},`);
  lines.push("  groups: [");
  for (const g of M.groups) {
    lines.push(`    { id: ${JSON.stringify(g.id)}, title: ${JSON.stringify(g.title)}, device: ${JSON.stringify(g.device || "phone")},${g.description ? ` description: ${JSON.stringify(g.description)},` : ""} screens: [`);
    for (const [c, t] of g.screens) lines.push(`      [${JSON.stringify(c)}, ${JSON.stringify(t)}],`);
    lines.push("    ] },");
  }
  lines.push("  ],", "};", "");
  fs.writeFileSync(p.manifestPath, lines.join("\n"));
}
const DEFAULT_DEV = { phone: { w: 402, h: 874 }, tablet: { w: 834, h: 1194 }, desktop: { w: 1280, h: 832 } };

// ---------- utils ----------
const rel = (f) => path.relative(process.cwd(), f) || ".";
function die(msg) { console.error("uis: " + msg); process.exit(2); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function copyDir(src, dst, vars, force) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, vars, force);
    else if (!fs.existsSync(d) || force) {
      let txt = fs.readFileSync(s);
      if (vars && /\.(html|md|js|css|json)$/.test(e.name)) txt = Object.entries(vars).reduce((t, [k, v]) => t.split(`{{${k}}}`).join(v), txt.toString());
      fs.writeFileSync(d, txt);
    }
  }
}
function selectScreens(p, codes) {
  if (!codes.length) return p.screens;
  const out = [];
  for (const c of codes) {
    if (p.byCode[c]) out.push(p.byCode[c]);
    else { const g = p.screens.filter((s) => s.group.id === c); if (g.length) out.push(...g); else die(`unknown screen or group: ${c}`); }
  }
  return out;
}
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
function htmlToText(h) {
  return h.replace(/<li[^>]*>/g, "- ").replace(/<\/(p|li|div|h\d)>/g, "\n").replace(/<br\s*\/?>/g, "\n")
    .replace(/<code>(.*?)<\/code>/g, "`$1`").replace(/<(b|strong)>(.*?)<\/\1>/g, "**$2**").replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

// ---------- static lint ----------
function cssClasses(css) {
  const set = new Set();
  css = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
  // keep only selectors: drop declaration blocks (innermost first, handles @media)
  let prev;
  do { prev = css; css = css.replace(/\{[^{}]*\}/g, ","); } while (css !== prev);
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) set.add(m[1]);
  return set;
}
function iconNames(root) {
  const src = fs.readFileSync(path.join(root, "kit", "uis.js"), "utf8");
  const m = src.match(/const ICONS = (\{[\s\S]*?\n  \});/);
  return new Set(m ? Object.keys(vm.runInNewContext("(" + m[1] + ")")) : []);
}
function lintFile(p, s, ctx) {
  const issues = [];
  const add = (level, type, msg) => issues.push({ code: s.code, level, type, msg });
  if (!fs.existsSync(s.file)) { add("warn", "not-built", `${rel(s.file)} does not exist yet (\`uis new ${s.code} "${s.title}"\`)`); return issues; }
  const src = fs.readFileSync(s.file, "utf8");
  const art = src.match(/<main\b[^>]*class="[^"]*\bartboard\b[^"]*"[^>]*>/);
  if (!art) add("error", "no-artboard", 'missing <main class="artboard phone|tablet|desktop" data-code=… data-title=…>');
  else {
    const code = (art[0].match(/data-code="([^"]*)"/) || [])[1];
    const rawTitle = (art[0].match(/data-title="([^"]*)"/) || [])[1];
    const title = rawTitle === undefined ? undefined : unesc(rawTitle);
    if (code !== s.code) add("error", "code-mismatch", `data-code="${code}" but the file is ${s.code}.html`);
    if (title !== undefined && title !== s.title) add("warn", "title-mismatch", `data-title="${title}" but the manifest says "${s.title}"`);
    const dev = s.device;
    if (!new RegExp(`\\b${dev}\\b`).test(art[0])) add("warn", "device-mismatch", `group ${s.group.id} is "${dev}" but the artboard lacks the .${dev} class`);
  }
  const t = (src.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  if (!t.startsWith(s.code)) add("warn", "title-tag", `<title> should start with "${s.code} · "`);
  if (!/kit\/uis\.js/.test(src)) add("error", "no-runtime", "screen must load ../kit/uis.js (icons, status bar, self-check)");
  if (!/kit\/components\.css/.test(src)) add("error", "no-kit-css", "screen must link ../kit/components.css");
  const notes = src.match(/<aside[^>]*data-notes[^>]*>([\s\S]*?)<\/aside>/);
  if (!notes || !htmlToText(notes[1]).trim()) add("warn", "no-notes", "add <aside data-notes hidden> with numbered interaction notes (what each control does, where it goes)");
  // icons
  for (const m of src.matchAll(/href="#i-([\w-]+)"/g)) if (!ctx.icons.has(m[1])) add("error", "unknown-icon", `#i-${m[1]} — available: \`uis icons\`; add Lucide paths to ICONS in kit/uis.js`);
  if (/<svg[^>]*viewBox/.test(src.replace(/<svg[^>]*data-free[\s\S]*?<\/svg>/g, ""))) add("warn", "inline-svg", "inline <svg viewBox> found — add the icon to kit/uis.js instead (or mark the svg data-free if it is an illustration)");
  // links
  for (const m of src.matchAll(/data-goto="([^"]*)"/g)) if (!p.byCode[m[1]]) add("error", "bad-goto", `data-goto="${m[1]}" is not a screen in the manifest`);
  // classes
  let defined = new Set([...ctx.kitClasses, ...(p.M.allowClasses || [])]);
  for (const m of src.matchAll(/<link[^>]*href="([^"]+\.css)"/g)) {
    const f = path.resolve(path.dirname(s.file), m[1]);
    if (!/^https?:/.test(m[1]) && fs.existsSync(f) && !f.startsWith(path.join(p.root, "kit"))) cssClasses(fs.readFileSync(f, "utf8")).forEach((c) => defined.add(c));
    else if (!/^https?:/.test(m[1]) && !fs.existsSync(f)) add("error", "missing-css", `${m[1]} not found`);
  }
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) cssClasses(m[1]).forEach((c) => defined.add(c));
  const unknown = new Set();
  for (const m of src.matchAll(/\bclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c && !defined.has(c)) unknown.add(c);
  if (unknown.size) add("warn", "unknown-class", `${[...unknown].join(", ")} — not defined in kit/ or linked CSS (typo? add it to styles/<group>.css)`);
  if (/<style[^>]*>/.test(src)) add("info", "inline-style-block", "<style> block in the screen — move reusable rules to styles/<group>.css or kit/components.css");
  if (/<img[^>]*src="https?:/.test(src)) add("warn", "remote-image", "remote image — use .ph placeholders (set --hue) or a file in assets/ so renders stay deterministic");
  return issues;
}
function lint(p, list) {
  const ctx = { icons: iconNames(p.root), kitClasses: new Set([...cssClasses(fs.readFileSync(path.join(p.root, "kit", "components.css"), "utf8")), ...cssClasses(fs.readFileSync(path.join(p.root, "kit", "tokens.css"), "utf8"))]) };
  const issues = [];
  const seen = new Set();
  for (const s of p.screens) { if (seen.has(s.code)) issues.push({ code: s.code, level: "error", type: "duplicate-code", msg: "listed twice in the manifest" }); seen.add(s.code); }
  if (list === p.screens) {
    for (const f of fs.readdirSync(path.join(p.root, "screens"))) {
      const c = f.replace(/\.html$/, "");
      if (f.endsWith(".html") && !p.byCode[c]) issues.push({ code: c, level: "warn", type: "orphan", msg: `screens/${f} is not in the manifest` });
    }
  }
  for (const s of list) issues.push(...lintFile(p, s, ctx));
  return issues;
}

// ---------- browser ----------
function findChrome() {
  const cands = [process.env.CHROME_PATH, process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].filter(Boolean);
  const hit = cands.find((c) => fs.existsSync(c));
  if (!hit) die("Chrome/Chromium not found. Set CHROME_PATH to the browser binary.");
  return hit;
}
function chrome(args) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "uis-"));
  const base = ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--allow-file-access-from-files", "--hide-scrollbars", `--user-data-dir=${profile}`, "--virtual-time-budget=4000", "--run-all-compositor-stages-before-draw"];
  return new Promise((res) => {
    execFile(findChrome(), [...base, ...args], { maxBuffer: 64 << 20, timeout: 60000 }, (err, stdout) => {
      fs.rmSync(profile, { recursive: true, force: true });
      res(stdout || "");
    });
  });
}
const fileUrl = (f, q = "") => "file://" + path.resolve(f).split(path.sep).join("/").replace(/ /g, "%20") + q;
async function render(s, w) {
  const dom = await chrome([`--window-size=${w},4000`, "--dump-dom", fileUrl(s.file)]);
  const m = dom.match(/data-uis-report="([^"]*)"/);
  if (!m) return { code: s.code, issues: [{ type: "no-report", el: "", msg: "page did not finish rendering (is ../kit/uis.js loaded? any script error?)" }], h: 0 };
  const json = m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  return JSON.parse(json);
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

// ---------- output ----------
function printIssues(issues, json) {
  if (json) { console.log(JSON.stringify(issues, null, 2)); return; }
  const order = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => (a.code > b.code ? 1 : a.code < b.code ? -1 : order[a.level] - order[b.level]));
  for (const i of issues) console.log(`${i.code.padEnd(5)} ${i.level.padEnd(5)} ${i.type.padEnd(18)} ${i.el ? i.el + " — " : ""}${i.msg}`);
  const e = issues.filter((i) => i.level === "error").length, w = issues.filter((i) => i.level === "warn").length;
  console.log(`\n${e} error${e === 1 ? "" : "s"}, ${w} warning${w === 1 ? "" : "s"}${issues.length - e - w ? `, ${issues.length - e - w} info` : ""}`);
}
const browserLevel = { "missing-icon": "error", "overflow-x": "error", "no-artboard": "error", "no-report": "error", "broken-image": "error", "hard-coded-color": "warn", "clipped-text": "error", "text-overflow": "error", "cut-off": "info" };

// ---------- commands ----------
const C = {};

C.help = () => console.log(`uis — build UI screens before building the app. Static HTML, one file per artboard.

  uis init [dir] [--name "App"]          scaffold a project (default dir: ./ui)
  uis new <CODE> "<Title>" [options]     create screens/<CODE>.html and add it to the manifest
        --group <ID> --group-title "…"   group (default: letters of CODE; created if missing)
        --device phone|tablet|desktop    for a new group (default phone)
        --like <CODE>                    copy an existing screen's markup (best way to stay consistent)
        --web  --tabs  --sheet  --scroll phone skeleton variants (browser bar · tab bar · bottom sheet · full length)
  uis list [--json]                      every screen with status
  uis lint [CODE|GROUP…] [--json]        static checks: manifest, icons, classes, links, notes
  uis check [CODE|GROUP…] [--json]       lint + render in headless Chrome: overflow, clipped text, missing icons…
  uis shot [CODE|GROUP…] [--scale 2]     PNGs in shots/ (prints the self-check too)
  uis sheet [GROUP…] [--z .5]            contact sheet of a group/flow → shots/_sheet-<GROUP>.png
  uis spec [--out SPEC.md]               hand-off doc for the build: screens, notes, navigation graph (mermaid)
  uis export [GROUP…] [--out file.html]  the whole gallery as ONE self-contained HTML file to share (dist/)
  uis icons                              list icon names
  uis serve [--port 4400]                serve the gallery at http://localhost:4400

  Exit code is 1 when lint/check find errors. Set CHROME_PATH if Chrome is not auto-detected.`);

C.init = ({ _, flags }) => {
  const dir = path.resolve(_[0] || "ui");
  const name = flags.name || path.basename(path.resolve(dir, dir.endsWith("ui") ? ".." : "."));
  if (fs.existsSync(path.join(dir, "screens", "manifest.js")) && !flags.force) die(`${rel(dir)} already has a project (use --force to refresh kit/ files)`);
  copyDir(path.join(TPL, "project"), dir, { NAME: name, DATE: new Date().toISOString().slice(0, 10) }, false);
  copyDir(KIT, path.join(dir, "kit"), null, !!flags.force);
  fs.mkdirSync(path.join(dir, "shots"), { recursive: true });
  fs.mkdirSync(path.join(dir, "styles"), { recursive: true });
  console.log(`Created ${rel(dir)}/
  index.html        gallery (open it, or \`uis serve\`)
  AGENTS.md         rules for agents building screens — point your agent here
  BRIEF.md          canonical demo data & business rules (fill this in first)
  COMPONENTS.md     copy-paste markup for every component
  kit/              tokens.css · components.css · uis.js · gallery.js (vendored, edit freely)
  screens/          manifest.js + one <CODE>.html per artboard
  styles/           optional per-group CSS
Next: fill BRIEF.md, plan groups in screens/manifest.js, then \`uis new A1 "Welcome"\`.`);
};

function skeleton({ code, title, device, lang, web, tabs, sheet, scroll }) {
  const head = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${DEFAULT_DEV[device] ? DEFAULT_DEV[device].w : 402}">
<title>${esc(code)} · ${esc(title)}</title>
<link rel="stylesheet" href="../kit/components.css">
<script src="../kit/uis.js"></script>
</head>
<body>
`;
  const notes = `<aside data-notes hidden>
  <p>1. TODO — what each control does, which screen it opens (data-goto), the rule or API behind it.</p>
</aside>
</body>
</html>
`;
  if (device === "desktop") return head + `<main class="artboard desktop" data-code="${esc(code)}" data-title="${esc(title)}">
  <aside class="sidebar">
    <div class="brand"><span class="icon-box sm dark"><svg class="i"><use href="#i-zap"/></svg></span>App</div>
    <a class="nav on"><svg class="i"><use href="#i-dashboard"/></svg>Overview</a>
    <a class="nav"><svg class="i"><use href="#i-users"/></svg>Users<span class="count">128</span></a>
    <a class="nav"><svg class="i"><use href="#i-settings"/></svg>Settings</a>
  </aside>
  <div class="main">
    <header class="page-head"><h1>${esc(title)}</h1><button class="btn primary sm"><svg class="i"><use href="#i-plus"/></svg>New</button></header>
    <section class="page">
      <!-- content -->
    </section>
  </div>
</main>
` + notes;
  const bar = tabs
    ? `  <nav class="tab-bar">
    <div class="tabs">
      <a class="tab active"><span class="pill"><svg class="i"><use href="#i-home"/></svg></span>Home</a>
      <a class="tab"><span class="pill"><svg class="i"><use href="#i-search"/></svg></span>Search</a>
      <a class="tab"><span class="pill"><svg class="i"><use href="#i-bell"/></svg></span>Alerts</a>
      <a class="tab"><span class="pill"><svg class="i"><use href="#i-user"/></svg></span>Profile</a>
    </div>
    <div class="home-indicator"></div>
  </nav>`
    : `  <div class="bottom-bar">
    <div class="inner"><button class="btn primary block">Continue</button></div>
    <div class="home-indicator"></div>
  </div>`;
  const top = tabs
    ? `  <header class="large-header"><h1>${esc(title)}</h1><button class="circle-btn" aria-label="More"><svg class="i"><use href="#i-more"/></svg></button></header>`
    : `  <header class="top-bar">
    <button class="circle-btn" aria-label="Back"><svg class="i"><use href="#i-chevron-left"/></svg></button>
    <span class="title">${esc(title)}</span>
    <span class="slot"></span>
  </header>`;
  const sheetHtml = sheet ? `
  <div class="scrim"></div>
  <div class="sheet">
    <div class="sheet-head"><h2>${esc(title)}</h2><button class="sheet-close" aria-label="Close"><svg class="i"><use href="#i-x"/></svg></button></div>
    <p class="t-body c-muted">Sheet content.</p>
    <button class="btn primary block">Confirm</button>
    <div class="home-indicator"></div>
  </div>` : "";
  return head + `<main class="artboard ${device}${scroll ? " scroll" : ""}" data-code="${esc(code)}" data-title="${esc(title)}">
  <div class="status-bar"></div>
${web ? `  <div class="browser-bar"><div class="url"><span>aA</span><span class="addr"><svg class="i"><use href="#i-lock"/></svg>example.com</span><svg class="i"><use href="#i-refresh"/></svg></div></div>\n` : ""}${top}
  <section class="content">
    <!-- content -->
  </section>
${bar}${sheetHtml}
</main>
` + notes;
}

C.new = ({ _, flags }) => {
  const p = project(flags);
  const [code, title] = _;
  if (!code || !title) die('usage: uis new <CODE> "<Title>" [--group ID] [--like CODE] [--web|--tabs|--sheet|--scroll]');
  if (!/^[A-Za-z]+\d+[a-z]?$/.test(code)) die(`code "${code}" should look like B4 (group letters + number)`);
  const gid = flags.group || code.match(/^[A-Za-z]+/)[0];
  let g = p.M.groups.find((x) => x.id === gid);
  if (!g) { g = { id: gid, title: flags["group-title"] || `Group ${gid}`, device: flags.device || "phone", screens: [] }; p.M.groups.push(g); p.M.groups.sort((a, b) => a.id.localeCompare(b.id)); }
  const file = path.join(p.root, "screens", code + ".html");
  if (fs.existsSync(file) && !flags.force) die(`${rel(file)} exists (use --force to overwrite)`);
  let html;
  if (flags.like) {
    const src = p.byCode[flags.like];
    if (!src || !fs.existsSync(src.file)) die(`--like ${flags.like}: no such built screen`);
    html = fs.readFileSync(src.file, "utf8")
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(code)} · ${esc(title)}</title>`)
      .replace(/data-code="[^"]*"/, `data-code="${esc(code)}"`).replace(/data-title="[^"]*"/, `data-title="${esc(title)}"`)
      .replace(/<aside[^>]*data-notes[^>]*>[\s\S]*?<\/aside>/, `<aside data-notes hidden>\n  <p>1. TODO — copied from ${flags.like}; rewrite these notes for ${code}.</p>\n</aside>`);
  } else {
    html = skeleton({ code, title, device: g.device || "phone", lang: p.M.lang || "en", web: flags.web, tabs: flags.tabs, sheet: flags.sheet, scroll: flags.scroll });
  }
  fs.writeFileSync(file, html);
  if (!g.screens.some(([c]) => c === code)) {
    g.screens.push([code, title]);
    g.screens.sort((a, b) => { const n = (s) => [s.match(/^[A-Za-z]+/)[0], +(s.match(/\d+/) || [0])[0]]; const [x, y] = [n(a[0]), n(b[0])]; return x[0].localeCompare(y[0]) || x[1] - y[1]; });
    writeManifest(p);
  }
  console.log(`${rel(file)}  (group ${g.id} · ${g.device || "phone"})${flags.like ? `  copied from ${flags.like}` : ""}`);
};

C.list = ({ flags }) => {
  const p = project(flags);
  const rows = p.screens.map((s) => {
    const built = fs.existsSync(s.file);
    const src = built ? fs.readFileSync(s.file, "utf8") : "";
    return { code: s.code, title: s.title, group: s.group.id, device: s.device, built, gotos: [...new Set([...src.matchAll(/data-goto="([^"]*)"/g)].map((m) => m[1]))], shot: fs.existsSync(path.join(p.root, "shots", s.code + ".png")) };
  });
  if (flags.json) return console.log(JSON.stringify(rows, null, 2));
  let gid;
  for (const r of rows) {
    if (r.group !== gid) { gid = r.group; const g = p.M.groups.find((x) => x.id === gid); console.log(`\n${gid} · ${g.title} (${g.device || "phone"})`); }
    console.log(`  ${r.built ? "●" : "○"} ${r.code.padEnd(5)} ${r.title}${r.gotos.length ? `  → ${r.gotos.join(", ")}` : ""}`);
  }
  const b = rows.filter((r) => r.built).length;
  console.log(`\n${b}/${rows.length} built · ${p.M.name} · ${rel(p.root)}`);
};

C.lint = ({ _, flags }) => {
  const p = project(flags);
  const list = selectScreens(p, _);
  const issues = lint(p, list);
  printIssues(issues, flags.json);
  if (issues.some((i) => i.level === "error")) process.exitCode = 1;
};

async function browserCheck(p, list, onEach) {
  const built = list.filter((s) => fs.existsSync(s.file));
  return pool(built, +(process.env.UIS_CONCURRENCY || 4), async (s) => {
    const w = p.M.devices[s.device] ? p.M.devices[s.device].w : 402;
    const r = await render(s, w);
    if (onEach) await onEach(s, r, w);
    return { s, r };
  });
}
const toIssues = (results) => results.flatMap(({ s, r }) => r.issues.map((i) => ({ code: s.code, level: browserLevel[i.type] || "warn", type: i.type, el: i.el, msg: i.msg })));

C.check = async ({ _, flags }) => {
  const p = project(flags);
  const list = selectScreens(p, _);
  const issues = lint(p, list);
  if (!flags["no-browser"]) issues.push(...toIssues(await browserCheck(p, list)));
  printIssues(issues, flags.json);
  if (issues.some((i) => i.level === "error")) process.exitCode = 1;
};

C.shot = async ({ _, flags }) => {
  const p = project(flags);
  const list = selectScreens(p, _);
  const scale = flags.scale || 1;
  const out = path.join(p.root, "shots");
  fs.mkdirSync(out, { recursive: true });
  const results = await browserCheck(p, list, async (s, r, w) => {
    const png = path.join(out, s.code + ".png");
    await chrome([`--window-size=${w},${r.h || 874}`, `--force-device-scale-factor=${scale}`, `--screenshot=${png}`, fileUrl(s.file)]);
    console.log(`${rel(png)}  ${w}×${r.h}${r.issues.length ? `  ⚠ ${r.issues.length} issue(s)` : ""}`);
  });
  const issues = toIssues(results);
  if (issues.length) { console.log(""); printIssues(issues, false); }
  const missing = list.filter((s) => !fs.existsSync(s.file));
  if (missing.length) console.log(`skipped (not built): ${missing.map((s) => s.code).join(", ")}`);
};

C.sheet = async ({ _, flags }) => {
  const p = project(flags);
  const ids = _.length ? _ : p.M.groups.map((g) => g.id);
  const z = flags.z || ".5";
  fs.mkdirSync(path.join(p.root, "shots"), { recursive: true });
  for (const id of ids) {
    const g = p.M.groups.find((x) => x.id === id);
    if (!g) die(`unknown group ${id}`);
    const dev = p.M.devices[g.device || "phone"];
    const width = Math.max(900, Math.min(3200, Math.round(56 + g.screens.length * (dev.w * z + 64 * z))));
    const url = fileUrl(path.join(p.root, "index.html"), `?print&g=${encodeURIComponent(id)}&z=${z}`);
    const dom = await chrome([`--window-size=${width},6000`, "--virtual-time-budget=9000", "--dump-dom", url]);
    const h = +((dom.match(/data-measured-height="(\d+)"/) || [])[1] || 1600);
    const png = path.join(p.root, "shots", `_sheet-${id}.png`);
    await chrome([`--window-size=${width},${h}`, "--virtual-time-budget=9000", `--screenshot=${png}`, url]);
    console.log(`${rel(png)}  ${width}×${h}`);
  }
};

C.spec = ({ flags }) => {
  const p = project(flags);
  const info = {};
  for (const s of p.screens) {
    const src = fs.existsSync(s.file) ? fs.readFileSync(s.file, "utf8") : "";
    const gotos = [...src.matchAll(/<([a-z0-9]+)\b([^>]*)data-goto="([^"]*)"([^>]*)>([\s\S]*?)<\/\1>/g)].map((m) => ({ to: m[3], label: htmlToText(m[5]).replace(/\n/g, " ").slice(0, 50) || (m[2] + m[4]).match(/aria-label="([^"]*)"/)?.[1] || "" }));
    const notes = (src.match(/<aside[^>]*data-notes[^>]*>([\s\S]*?)<\/aside>/) || [])[1] || "";
    info[s.code] = { s, built: !!src, gotos, notes: htmlToText(notes) };
  }
  const L = [`# ${p.M.name} — screen spec`, "", `Generated by \`uis spec\` from \`${rel(path.join(p.root, "screens"))}\`. The HTML screens are the design source of truth; this file is the index for whoever builds the app.`, "",
    "- Design tokens: `kit/tokens.css` · components: `kit/components.css` + `COMPONENTS.md` · demo data & rules: `BRIEF.md`", ""];
  L.push("## Navigation", "", "```mermaid", "flowchart LR");
  for (const g of p.M.groups) {
    L.push(`  subgraph ${g.id}["${g.id} · ${g.title.replace(/"/g, "'")}"]`);
    for (const [c, t] of g.screens) L.push(`    ${c}["${c} ${t.replace(/"/g, "'")}"]`);
    L.push("  end");
  }
  for (const c of Object.keys(info)) for (const to of new Set(info[c].gotos.map((g) => g.to))) if (to !== c) L.push(`  ${c} --> ${to}`);
  L.push("```", "");
  for (const g of p.M.groups) {
    L.push(`## ${g.id} · ${g.title}`, "", `Device: ${g.device || "phone"}${g.description ? ` — ${g.description}` : ""}`, "");
    for (const [c, t] of g.screens) {
      const x = info[c];
      L.push(`### ${c} · ${t}`, "");
      L.push(`File: \`screens/${c}.html\`${fs.existsSync(path.join(p.root, "shots", c + ".png")) ? ` · Shot: \`shots/${c}.png\`` : ""}${x.built ? "" : " · **not built yet**"}`, "");
      if (x.gotos.length) L.push("Goes to: " + x.gotos.map((g) => `${g.to}${g.label ? ` (${g.label})` : ""}`).join(" · "), "");
      const ins = Object.keys(info).filter((k) => info[k].gotos.some((g) => g.to === c));
      if (ins.length) L.push("Reached from: " + ins.join(", "), "");
      if (x.notes) L.push(x.notes, "");
    }
  }
  const out = flags.out ? path.resolve(flags.out) : path.join(p.root, "SPEC.md");
  fs.writeFileSync(out, L.join("\n"));
  console.log(`${rel(out)}  (${p.screens.length} screens)`);
};

// ---------- export: one self-contained HTML file ----------
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };
const isLocal = (ref) => !/^(https?:|data:|blob:|\/\/|\/|#|about:)/i.test(ref);
function dataUri(file) {
  const mime = MIME[path.extname(file).toLowerCase()];
  return mime && fs.existsSync(file) ? `data:${mime};base64,${fs.readFileSync(file).toString("base64")}` : null;
}
// url(…) pointing at local files → data: URIs, resolved against `dir`.
const inlineUrls = (text, dir) => text.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, ref) => (isLocal(ref) && dataUri(path.resolve(dir, ref))) ? `url("${dataUri(path.resolve(dir, ref))}")` : m);
function readCss(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return "";
  seen.add(file);
  const dir = path.dirname(file);
  const css = fs.readFileSync(file, "utf8").replace(/@import\s+(?:url\()?\s*['"]?([^'")\s]+)['"]?\s*\)?\s*;/g, (m, ref) => (isLocal(ref) ? readCss(path.resolve(dir, ref), seen) : m));
  return inlineUrls(css, dir);
}

C.export = ({ _, flags }) => {
  const p = project(flags);
  const groups = _.length ? _.map((id) => p.M.groups.find((g) => g.id === id) || die(`unknown group ${id}`)) : p.M.groups;
  const assets = {}, screens = {}, skipped = [];
  const asset = (abs) => {
    const key = path.relative(p.root, abs).split(path.sep).join("/");
    if (!(key in assets)) assets[key] = abs.endsWith(".css") ? readCss(abs) : fs.readFileSync(abs, "utf8");
    return key;
  };
  for (const g of groups) for (const [code] of g.screens) {
    const s = p.byCode[code];
    if (!fs.existsSync(s.file)) { skipped.push(code); continue; }
    const dir = path.dirname(s.file);
    const local = (ref) => isLocal(ref) && fs.existsSync(path.resolve(dir, ref)) ? path.resolve(dir, ref) : null;
    let doc = fs.readFileSync(s.file, "utf8")
      .replace(/<link\b[^>]*>/g, (tag) => { const href = (tag.match(/\bhref="([^"]+)"/) || [])[1]; return /stylesheet/.test(tag) && href && local(href) ? `<link data-uis-asset="${asset(local(href))}">` : tag; })
      .replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (tag, src) => (local(src) ? `<script data-uis-asset="${asset(local(src))}"></script>` : tag))
      .replace(/(<(?:img|source)\b[^>]*\bsrc=")([^"]+)(")/g, (m, a, src, b) => (isLocal(src) && dataUri(path.resolve(dir, src)) ? a + dataUri(path.resolve(dir, src)) + b : m));
    screens[code] = inlineUrls(doc, dir);
  }
  // Older vendored kits predate embed mode: fall back to this package's gallery.
  const ownGallery = path.join(p.root, "kit", "gallery.js");
  const galleryJs = fs.readFileSync(fs.existsSync(ownGallery) && /UIS_EMBED/.test(fs.readFileSync(ownGallery, "utf8")) ? ownGallery : path.join(KIT, "gallery.js"), "utf8");
  const galleryCss = readCss(path.join(p.root, "kit", "components.css"));
  const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
  const raw = (t, tag) => t.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);
  const manifest = Object.assign({}, p.M, { groups });
  const exported = new Date().toLocaleDateString("en-CA");
  const html = `<!doctype html>
<html lang="${esc(p.M.lang || "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.M.name || "UI")} — screens</title>
<style>${raw(galleryCss, "style")}</style>
<script>window.UIS = ${json(manifest)};
window.UIS_EMBED = ${json({ exported, assets, screens })};</script>
</head>
<body>
<script>${raw(galleryJs, "script")}</script>
</body>
</html>
`;
  const slug = (p.M.name || "ui").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ui";
  const out = flags.out ? path.resolve(flags.out) : path.join(p.root, "dist", `${slug}-screens${_.length ? "-" + _.join("") : ""}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  const n = Object.keys(screens).length;
  console.log(`${rel(out)}  ${n} screen${n === 1 ? "" : "s"} · ${Math.round(Buffer.byteLength(html) / 1024)} KB · open it anywhere, no server needed`);
  if (skipped.length) console.log(`not built (shown as placeholders): ${skipped.join(", ")}`);
};

C.icons = ({ flags }) => { const p = project(flags); console.log([...iconNames(p.root)].sort().join(" ")); };

C.serve = ({ flags }) => {
  const p = project(flags);
  const port = +(flags.port || 4400);
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".woff2": "font/woff2" };
  http.createServer((req, res) => {
    let f = path.join(p.root, decodeURIComponent(req.url.split("?")[0]));
    if (!f.startsWith(p.root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(f).pipe(res);
  }).listen(port, () => console.log(`${p.M.name} gallery → http://localhost:${port}/   (Ctrl+C to stop)`));
};

// ---------- main ----------
const args = normalizeFlags(parseArgs(process.argv.slice(2)));
const cmd = args._.shift() || "help";
if (!C[cmd]) die(`unknown command "${cmd}" — run \`uis help\``);
Promise.resolve(C[cmd](args)).catch((e) => die(e.stack || String(e)));
