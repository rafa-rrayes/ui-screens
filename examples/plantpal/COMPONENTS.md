# Components: copy-paste reference

Everything here is defined in `kit/components.css` (which imports `kit/tokens.css`). Copy the markup, then change the
text. Selected state is always `.on`, and the active tab is `.active`. Icons are `<svg class="i"><use href="#i-NAME"/></svg>`.

## Tokens
Colors: `--ink --ink-muted --ink-subtle` (text) · `--bg --surface --sunken --line` (surfaces) ·
`--accent --accent-strong --accent-soft --on-accent` · `--success(-soft) --warning(-soft) --danger(-soft)` ·
`--ink-deep --on-ink --scrim`. Spacing `--s-2…--s-48` · radii `--r-sm/md/lg/xl/full` · `--shadow-card --shadow-float`.

Text: `.t-display` 30 · `.t-numeric-xl` 36 · `.t-title` 22 · `.t-headline` 17 · `.t-body` 15 · `.t-body-strong` ·
`.t-caption` 13 · `.t-caption-strong` · `.t-overline` 11 caps · `.t-mono`.
Color: `.c-ink .c-muted .c-subtle .c-accent .c-accent-strong .c-success .c-warning .c-danger .c-on-ink`.

Layout: `.row` (flex, centered) · `.col` · `.between` · `.center` · `.start` · `.end` · `.wrap` · `.grow` · `.none` ·
`.gap-2…gap-32` · `.grid-2/3/4` · `.divider` · `.vdivider` · `.spacer` · `.truncate` · `.clamp-2` · `.tnum`.

## Artboards
```html
<main class="artboard phone" data-code="B4" data-title="Lead detail">        <!-- 402×874, fixed -->
<main class="artboard phone scroll" …>                                        <!-- full-length -->
<main class="artboard phone dark" …>                                          <!-- ink-deep background, light status bar -->
<main class="artboard tablet" …>  <main class="artboard desktop" …>           <!-- 834×1194 · 1280 wide (row layout) -->
```
Phone order: `.status-bar` → (`.browser-bar`) → `.top-bar` | `.large-header` → `section.content` → `.bottom-bar` | `.tab-bar` → overlays.

## Phone chrome
```html
<div class="status-bar"></div>                                   <!-- uis.js adds 9:41 + glyphs; .light on dark -->
<div class="browser-bar"><div class="url"><span>aA</span><span class="addr"><svg class="i"><use href="#i-lock"/></svg>example.com/path</span><svg class="i"><use href="#i-refresh"/></svg></div></div>

<header class="top-bar">                                          <!-- pushed screen -->
  <button class="circle-btn" aria-label="Back" data-goto="B1"><svg class="i"><use href="#i-chevron-left"/></svg></button>
  <span class="title">Lead</span>
  <span class="slot"></span>                                      <!-- or another .circle-btn -->
</header>
<header class="large-header"><h1>Leads</h1><button class="circle-btn"><svg class="i"><use href="#i-bell"/></svg></button></header>

<section class="content">…</section>                             <!-- .flush = no side padding -->

<nav class="tab-bar"><div class="tabs">
  <a class="tab active" data-goto="B1"><span class="pill"><svg class="i"><use href="#i-home"/></svg></span>Home</a>
  <a class="tab"><span class="pill"><svg class="i"><use href="#i-bell"/></svg><span class="badge">2</span></span>Alerts</a>
</div><div class="home-indicator"></div></nav>

<div class="bottom-bar"><div class="inner">
  <button class="btn primary block">Continue</button>
  <span class="t-caption c-muted" style="text-align:center">Secure payment</span>
</div><div class="home-indicator"></div></div>
<div class="bottom-bar"><div class="row"><button class="btn secondary">Cancel</button><button class="btn accent grow">Save</button></div><div class="home-indicator"></div></div>
```

## Buttons
```html
<button class="btn primary">Ink</button> <button class="btn accent">Brand</button> <button class="btn secondary">Outlined</button>
<button class="btn soft">Accent-soft</button> <button class="btn ghost">Text</button> <button class="btn danger">Delete</button>
<button class="btn danger-soft">Remove</button> <button class="btn on-dark">On dark</button>
<!-- modifiers: .block (full width) .grow (share a row) .sm (40px) .xs (32px) [disabled] -->
<button class="btn primary sm"><svg class="i"><use href="#i-plus"/></svg>New</button>
<button class="circle-btn" aria-label="Share"><svg class="i"><use href="#i-share"/></svg></button>   <!-- .clear .dark .accent .sm -->
<button class="fab"><svg class="i"><use href="#i-plus"/></svg>New</button>   <!-- floating, above tab bar -->
<a class="link">Forgot password?</a>
```

## Tags, chips, segmented, tabs
```html
<span class="tag">Neutral</span> <span class="tag success dot">Live</span> <span class="tag warning">Pending</span>
<span class="tag danger">Overdue</span> <span class="tag accent">New</span> <span class="tag dark">Admin</span> <span class="tag outline">Draft</span>
<nav class="chips"><span class="chip on">All</span><span class="chip"><svg class="i"><use href="#i-filter"/></svg>Filters</span></nav>
<div class="seg"><span class="on">Day</span><span>Week</span><span>Month</span></div>          <!-- .auto = hug content -->
<nav class="underline-tabs"><span class="on">Active</span><span>Ended</span></nav>
```

## Cards, lists, sections
```html
<div class="card pad">…</div>     <!-- .pad-16 · .flat · .sunken · .accent · .dark -->
<div class="card list">
  <div class="list-row" data-goto="E3">
    <div class="icon-box"><svg class="i"><use href="#i-key"/></svg></div>
    <div class="text"><span class="t-body-strong">Payout key</span><span class="t-caption c-muted">•••.482.117-••</span></div>
    <svg class="i chev"><use href="#i-chevron-right"/></svg>
  </div>
  <div class="divider"></div>
  <div class="list-row"><div class="text"><span class="t-body-strong">Push</span></div><span class="switch on"></span></div>
</div>                                                         <!-- .card.list.plain = dividers without the icon inset -->
<section class="section">
  <div class="section-head"><h2>Activity</h2><a class="link t-caption">See all</a></div>
  …
</section>
<div class="kv"><span>Subtotal</span><span>$490.00</span></div>  <div class="kv total"><span>Total</span><span>$490.00</span></div>
```

## Feedback
```html
<div class="banner warning"><svg class="i"><use href="#i-alert"/></svg><span class="grow">Expires in 2 days.</span></div>  <!-- accent success warning danger -->
<div class="empty"><div class="icon-box"><svg class="i"><use href="#i-inbox"/></svg></div><h3>No leads yet</h3><p class="t-body">…</p><button class="btn primary">Find leads</button></div>
<div class="toast"><svg class="i"><use href="#i-check-circle"/></svg>Link copied</div>   <!-- .top -->
<div class="skel" style="height:16px;width:60%"></div>   <span class="spinner"></span>
```

## Media
```html
<div class="icon-box">…</div>    <!-- 40px · .sm .lg .round · .accent .success .warning .danger .dark -->
<div class="avatar">CS</div>     <!-- .sm .lg .soft ; group: <div class="avatars">…</div> -->
<div class="ph" style="--hue:28;height:180px"></div>      <!-- placeholder photo; .round; vary --hue 0–360 -->
```

## Forms
```html
<div class="field"><label>E-mail</label><div class="input">camila@example.com</div><span class="hint">We'll send a code.</span></div>
<div class="input focus">typing<span class="caret"></span></div>   <div class="input placeholder">Search businesses</div>
<div class="field error"><label>CPF</label><div class="input">123</div><span class="hint">Invalid CPF</span></div>
<div class="input search"><svg class="i"><use href="#i-search"/></svg><span class="ph-text">Search</span></div>
<div class="input textarea">Multi-line…</div>
<div class="code-boxes"><span>4</span><span>8</span><span class="on"></span><span></span><span></span><span></span></div>
<span class="check on"></span> <span class="radio on"></span> <span class="switch on"></span>
<div class="stepper"><button><svg class="i"><use href="#i-minus"/></svg></button><span>2</span><button><svg class="i"><use href="#i-plus"/></svg></button></div>
```

## Progress & data
```html
<div class="progress" style="--p:62%"><span></span></div>      <!-- .success .warning .danger -->
<div class="steps"><span class="on"></span><span class="on"></span><span></span></div>
<div class="timeline">
  <div class="item"><span class="dot done"><svg class="i"><use href="#i-check"/></svg></span><div class="col"><span class="t-body-strong">Paid</span><span class="t-caption c-muted">Oct 23, 9:12</span></div></div>
  <div class="item"><span class="dot now"></span>…</div>  <div class="item"><span class="dot"></span>…</div>
</div>
<div class="stat"><span class="t-caption c-muted">Visits</span><span class="value">1,284</span><span class="delta">+18%</span></div>  <!-- .delta.down -->
<div class="bars"><span style="--h:40%"></span><span class="on" style="--h:80%"></span></div>
```

## Overlays (each sheet/modal is its own screen)
```html
<div class="scrim"></div>
<div class="sheet">
  <div class="sheet-head"><div class="col gap-4"><h2>Reserve lead?</h2><span class="t-body c-muted">…</span></div>
    <button class="sheet-close" aria-label="Close" data-goto="B4"><svg class="i"><use href="#i-x"/></svg></button></div>
  …
  <button class="btn primary block">Reserve</button>
  <div class="home-indicator"></div>
</div>
<div class="modal"><h2 class="t-title">Delete?</h2><p class="t-body c-muted">…</p><div class="row gap-12"><button class="btn secondary grow">Cancel</button><button class="btn danger grow">Delete</button></div></div>
<div class="menu" style="top:100px;right:16px"><a>Edit</a><a class="on">Duplicate</a><a class="danger">Delete</a></div>
```

## System UI imitations (hard-coded colors are allowed inside `data-free`)
```html
<main class="artboard phone lockscreen" data-free …>
  <div class="push"><div class="app-icon"><svg class="i"><use href="#i-zap"/></svg></div><div class="col"><b>App</b><span>Message</span></div></div>
```

## Desktop
```html
<main class="artboard desktop" …>
  <aside class="sidebar">
    <div class="brand"><span class="icon-box sm dark"><svg class="i"><use href="#i-zap"/></svg></span>Admin</div>
    <span class="nav-label">Operations</span>
    <a class="nav on"><svg class="i"><use href="#i-dashboard"/></svg>Overview</a>
    <a class="nav"><svg class="i"><use href="#i-users"/></svg>Users<span class="count">12</span></a>
  </aside>
  <div class="main">
    <header class="page-head"><h1>Overview</h1><div class="toolbar"><div class="input search">…</div><button class="btn primary sm">New</button></div></header>
    <section class="page">
      <div class="grid-4"><div class="card pad stat">…</div>…</div>
      <div class="card table-card"><table class="table"><thead><tr><th>Name</th><th class="num">Amount</th></tr></thead>
        <tbody><tr><td>…</td><td class="num">$98.00</td></tr></tbody></table>
        <div class="pager"><span>1–20 of 214</span><div class="row gap-8"><button class="btn secondary xs">Prev</button><button class="btn secondary xs">Next</button></div></div></div>
    </section>
  </div>
</main>
```
