/* Gallery for screens/manifest.js. Loaded by the project's index.html.
   URL params: ?g=B (one group) · ?z=.5 (zoom) · ?print (no chrome, eager load — used by `uis sheet`)
   Hash: #B4 opens the focus view for B4 (100%, notes, links in/out). Clicking a data-goto hotspot follows it. */
(function () {
  const M = window.UIS || { groups: [] };
  const P = new URLSearchParams(location.search);
  const PRINT = P.has("print");
  const devices = Object.assign({ phone: { w: 402, h: 874 }, tablet: { w: 834, h: 1194 }, desktop: { w: 1280, h: 832 } }, M.devices || {});
  const groups = M.groups.filter((g) => !P.get("g") || P.get("g").split(",").includes(g.id));
  const all = [];
  groups.forEach((g) => g.screens.forEach(([code, title]) => all.push({ code, title, group: g })));
  const byCode = Object.fromEntries(all.map((s) => [s.code, s]));
  const reports = {};
  let hotspots = false;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  document.title = (M.name || "UI") + " — screens";

  const css = `
  body{background:#E8E8E3;font-family:var(--font-ui)}
  .g-top{position:sticky;top:0;z-index:20;background:var(--ink-deep);color:var(--on-ink);padding:12px 28px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
  .g-top .name{font:700 18px/24px var(--font-display)}
  .g-top nav{display:flex;gap:6px;flex-wrap:wrap}
  .g-top a,.g-top button{color:var(--on-ink);padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.08);font:600 13px/18px var(--font-ui)}
  .g-top .tools{margin-left:auto;display:flex;gap:6px}
  .g-top button.on{background:var(--accent);color:var(--on-accent)}
  .g-group{padding:40px 28px 16px}
  .g-group h2{font:650 22px/28px var(--font-display)}
  .g-group .sub{color:var(--ink-muted);font:400 14px/20px var(--font-ui);margin-top:2px}
  .g-strip{display:flex;gap:calc(64px * var(--z));overflow-x:auto;padding:20px 0 12px;align-items:flex-start}
  body.print .g-strip{flex-wrap:wrap;overflow:visible;row-gap:40px}
  .g-board{flex:none;display:flex;flex-direction:column;gap:8px}
  .g-label{font:600 13px/18px var(--font-ui);color:var(--ink-muted);display:flex;gap:8px;align-items:center;cursor:pointer}
  .g-label b{color:var(--ink)}
  .g-label .warn{background:var(--warning-soft);color:var(--warning);border-radius:999px;padding:0 7px;font-size:11px}
  .g-frame{width:calc(var(--w) * var(--z));height:calc(var(--h) * var(--z));overflow:hidden;border-radius:8px;background:var(--bg);box-shadow:0 1px 2px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.08)}
  .g-frame iframe{width:var(--w);height:var(--h);border:0;transform:scale(var(--z));transform-origin:0 0;display:block}
  .g-frame.missing{display:grid;place-items:center;color:var(--ink-subtle);font:600 13px/18px var(--font-ui);background:repeating-linear-gradient(45deg,#efefea 0 10px,#e8e8e3 10px 20px)}
  .g-notes{width:calc(var(--w) * var(--z));font:400 12px/17px var(--font-ui);color:var(--ink-muted)}
  .g-notes p,.g-notes li{margin-bottom:5px} .g-notes code{font-family:var(--font-mono);font-size:11px}
  body.hide-notes .g-notes{display:none}
  .g-focus{position:fixed;inset:0;z-index:30;background:rgba(14,16,20,.82);display:none;gap:28px;padding:28px;overflow:auto}
  .g-focus.open{display:flex}
  .g-focus .stage{flex:none}
  .g-focus .stage iframe{border:0;border-radius:10px;background:var(--bg);display:block;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  .g-focus .side{flex:1;min-width:280px;max-width:520px;color:var(--on-ink);display:flex;flex-direction:column;gap:14px;font:400 14px/21px var(--font-ui)}
  .g-focus .side h3{font:700 24px/30px var(--font-display)}
  .g-focus .side .notes{background:rgba(255,255,255,.06);border-radius:12px;padding:16px}
  .g-focus .side .notes p,.g-focus .side .notes li{margin-bottom:8px}
  .g-focus .side a{color:#AFC0FF;font-weight:600;cursor:pointer}
  .g-focus .side .k{font:600 11px/14px var(--font-ui);letter-spacing:.06em;text-transform:uppercase;opacity:.6}
  .g-focus .side .issue{color:#FFD28A}
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
  document.body.style.setProperty("--z", P.get("z") || (PRINT ? ".5" : ".6"));
  if (PRINT) document.body.classList.add("print");

  if (!PRINT) {
    document.body.insertAdjacentHTML("beforeend", `<header class="g-top"><span class="name">${esc(M.name || "UI")}</span>
      <nav>${groups.map((g) => `<a href="#g-${g.id}">${g.id}</a>`).join("")}</nav>
      <div class="tools"><button data-z=".4">40%</button><button data-z=".6">60%</button><button data-z="1">100%</button>
      <button id="t-hot">Hotspots</button><button id="t-notes" class="on">Notes</button></div></header>`);
  }
  const wrap = document.createElement("div");
  document.body.appendChild(wrap);

  for (const g of groups) {
    const dev = devices[g.device || "phone"] || devices.phone;
    const sec = document.createElement("section");
    sec.className = "g-group"; sec.id = "g-" + g.id;
    sec.innerHTML = `<h2>${esc(g.id)} · ${esc(g.title)}</h2>${g.description ? `<div class="sub">${esc(g.description)}</div>` : ""}<div class="g-strip"></div>`;
    wrap.appendChild(sec);
    for (const [code, title] of g.screens) {
      const b = document.createElement("div");
      b.className = "g-board"; b.id = "b-" + code;
      b.style.setProperty("--w", dev.w + "px"); b.style.setProperty("--h", dev.h + "px");
      b.innerHTML = `<span class="g-label"><b>${esc(code)}</b>${esc(title)}</span>
        <div class="g-frame"><iframe ${PRINT ? "" : 'loading="lazy"'} src="screens/${encodeURIComponent(code)}.html" title="${esc(code)}"></iframe></div><div class="g-notes"></div>`;
      $(".g-strip", sec).appendChild(b);
      const ifr = $("iframe", b);
      ifr.addEventListener("load", () => setTimeout(() => {
        if (!reports[code]) { const f = $(".g-frame", b); f.classList.add("missing"); f.textContent = "not built yet"; reports[code] = { missing: true }; done(); }
      }, 2500));
      $(".g-label", b).onclick = () => (location.hash = code);
    }
  }

  window.addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.uis === "ready" && d.report) {
      const r = d.report, b = document.getElementById("b-" + r.code);
      if (e.source !== ($("#focus-frame") || {}).contentWindow) reports[r.code] = r;
      if (b && e.source === $("iframe", b).contentWindow) {
        b.style.setProperty("--h", r.h + "px");
        $(".g-notes", b).innerHTML = r.notes;
        if (r.issues.length) $(".g-label", b).insertAdjacentHTML("beforeend", `<span class="warn">${r.issues.length} issue${r.issues.length > 1 ? "s" : ""}</span>`);
        e.source.postMessage({ uis: "hotspots", on: hotspots }, "*");
        done();
      }
      if (e.source === ($("#focus-frame") || {}).contentWindow) renderSide(r);
    }
    if (d.uis === "goto" && d.code) location.hash = d.code;
  });

  function done() {
    if (all.every((s) => reports[s.code])) html().setAttribute("data-measured-height", Math.ceil(document.body.scrollHeight));
  }
  const html = () => document.documentElement;

  // ---------- focus view ----------
  const focus = document.createElement("div");
  focus.className = "g-focus";
  focus.innerHTML = `<div class="stage"><iframe id="focus-frame"></iframe></div><div class="side"></div>`;
  document.body.appendChild(focus);
  focus.addEventListener("click", (e) => { if (e.target === focus) location.hash = ""; });
  function linksIn(code) { return Object.values(reports).filter((r) => r.gotos && r.gotos.some((g) => g.to === code)).map((r) => r.code); }
  function renderSide(r) {
    const s = byCode[r.code] || { title: r.title, group: {} };
    const outs = [...new Set(r.gotos.map((g) => g.to))];
    const ins = linksIn(r.code);
    const link = (c) => `<a onclick="location.hash='${esc(c)}'">${esc(c)}</a>${byCode[c] ? " " + esc(byCode[c].title) : " (not in manifest)"}`;
    $(".side", focus).innerHTML = `<span class="k">${esc(s.group.id || "")} · ${esc(s.group.title || "")}</span><h3>${esc(r.code)} · ${esc(s.title)}</h3>
      <div class="notes">${r.notes || "<em>No notes. Add &lt;aside data-notes&gt;.</em>"}</div>
      ${outs.length ? `<span class="k">Goes to</span><div>${outs.map(link).join("<br>")}</div>` : ""}
      ${ins.length ? `<span class="k">Reached from</span><div>${ins.map(link).join("<br>")}</div>` : ""}
      ${r.issues.length ? `<span class="k">Self-check</span>${r.issues.map((i) => `<div class="issue">${esc(i.type)} — ${esc(i.el)}: ${esc(i.msg)}</div>`).join("")}` : ""}
      <span class="k">Keys: ← → previous/next · Esc close · click hotspots to follow</span>`;
  }
  function openFocus() {
    const code = decodeURIComponent(location.hash.slice(1));
    if (!byCode[code]) { focus.classList.remove("open"); $("#focus-frame").removeAttribute("src"); return; }
    const dev = devices[byCode[code].group.device || "phone"] || devices.phone;
    const f = $("#focus-frame");
    const h = (reports[code] && reports[code].h) || dev.h;
    const scale = Math.min(1, (innerHeight - 56) / h, (innerWidth - 400) / dev.w);
    f.style.width = dev.w + "px"; f.style.height = h + "px";
    $(".stage", focus).style.cssText = `width:${dev.w * Math.max(scale, .3)}px;height:${h * Math.max(scale, .3)}px`;
    f.style.transform = `scale(${Math.max(scale, .3)})`; f.style.transformOrigin = "0 0";
    f.src = `screens/${encodeURIComponent(code)}.html${hotspots ? "?hotspots" : ""}`;
    focus.classList.add("open");
  }
  window.addEventListener("hashchange", openFocus);
  if (location.hash.length > 1 && !location.hash.startsWith("#g-")) openFocus();
  document.addEventListener("keydown", (e) => {
    const code = decodeURIComponent(location.hash.slice(1)), i = all.findIndex((s) => s.code === code);
    if (e.key === "Escape") location.hash = "";
    if (i < 0) return;
    if (e.key === "ArrowRight" && all[i + 1]) location.hash = all[i + 1].code;
    if (e.key === "ArrowLeft" && all[i - 1]) location.hash = all[i - 1].code;
  });

  // ---------- toolbar ----------
  document.querySelectorAll(".g-top [data-z]").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.z === document.body.style.getPropertyValue("--z"));
    btn.onclick = () => {
      document.body.style.setProperty("--z", btn.dataset.z);
      document.querySelectorAll(".g-top [data-z]").forEach((x) => x.classList.toggle("on", x === btn));
    };
  });
  const hot = $("#t-hot"), notes = $("#t-notes");
  if (hot) hot.onclick = () => {
    hotspots = !hotspots; hot.classList.toggle("on", hotspots);
    document.querySelectorAll("iframe").forEach((f) => f.contentWindow && f.contentWindow.postMessage({ uis: "hotspots", on: hotspots }, "*"));
  };
  if (notes) notes.onclick = () => notes.classList.toggle("on", !document.body.classList.toggle("hide-notes"));
})();
