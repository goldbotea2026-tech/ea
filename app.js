/* ==========================================================
   GOLDBOT SITE ENGINE
   You normally never need to edit this file.
     - Texts, contact, crypto wallets  -> site.json
     - Products, videos, backtests     -> products.json
     - Colors, sizes, layout           -> style.css
   ========================================================== */

let SITE = null;
let PRODUCTS = [];
const PAGE = document.body.dataset.page || "home";   // "home" or "product"

/* ---------- helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => "$" + Number(n).toLocaleString("en-US");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const isExternal = href => /^https?:/.test(href);
const extAttr = href => isExternal(href) ? ' target="_blank" rel="noopener"' : "";
const paragraphs = v => (Array.isArray(v) ? v : String(v ?? "").split(/\n\n+/)).map(t => `<p>${esc(t)}</p>`).join("");

/* ---------- icons ---------- */
const ICONS = {
  mail: '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  telegram: '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>'
};
const IMAGE_ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
const ARROW_RIGHT = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ARROW_LEFT = '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const CART_ICON = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>';
const LOGO_SIMPLE = '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="8" width="4" height="7" rx="1" fill="#6FE3B8"/><rect x="10" y="9" width="4" height="6" rx="1" fill="#FF7A7A"/><rect x="16" y="5" width="4" height="8" rx="1" fill="#6FE3B8"/></svg>';
const LOGO_FULL = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"><path d="M6 3v18M12 6v13M18 2v16" stroke="#6FE3B8" stroke-width="2"/><rect x="4" y="8" width="4" height="7" rx="1" fill="#6FE3B8" stroke="none"/><rect x="10" y="9" width="4" height="6" rx="1" fill="#FF7A7A" stroke="none"/><rect x="16" y="5" width="4" height="8" rx="1" fill="#6FE3B8" stroke="none"/></svg>';

/* ==========================================================
   IMAGE PATHS
   "image": "photo-1"            -> tries images/photo-1.jpg / .jpeg / .png / .webp
   "image": "images/x/cover.png" -> used exactly as written
   ========================================================== */
const EXT = ["jpg", "jpeg", "png", "webp"];
const hasExt = s => /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(s);
const coverBase = name => name.includes("/") ? name : "images/" + name;
const candidates = base => hasExt(base) ? [base] : EXT.map(e => base + "." + e);

function resolveImage(base) {
  return new Promise(resolve => {
    const list = candidates(base);
    let i = 0;
    const next = () => {
      if (i >= list.length) return resolve(null);
      const src = list[i++], im = new Image();
      im.onload = () => resolve(src);
      im.onerror = next;
      im.src = src;
    };
    next();
  });
}

/* card images on the homepage */
function loadImages(scope = document) {
  $$("img[data-src]", scope).forEach(img => {
    const list = candidates(img.dataset.src);
    let i = 0;
    const tryNext = () => {
      if (i >= list.length) { img.remove(); return; }
      img.src = list[i++];
    };
    img.addEventListener("load", () => img.classList.add("loaded"));
    img.addEventListener("error", tryNext);
    tryNext();
  });
}

/* ==========================================================
   LOAD DATA, THEN BUILD THE PAGE
   ========================================================== */
async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
}

async function main() {
  try {
    const [site, prod] = await Promise.all([loadJSON("site.json"), loadJSON("products.json")]);
    SITE = site;
    PRODUCTS = prod.products || [];
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<p style="padding:40px;text-align:center;color:#D64550;font-family:sans-serif">Could not load site.json / products.json. Open this site with Live Server instead of double-clicking the file.</p>`;
    return;
  }

  buildShell();
  if (PAGE === "product") await renderProductPage(); else renderHomePage();
  renderContact();
  buildRail();
  setHeaderHeight();
  initRail();
  initLightbox();
  initCartUI();
  syncButtons();
}

/* ==========================================================
   SHELL: rail, dock, strip, header, contact section, footer, dialogs
   ========================================================== */
function buildShell() {
  const b = SITE.brand, L = SITE.labels, f = SITE.footer, s = SITE.sections.contact;
  const logo = `<span class="logo-mark">${LOGO_FULL}</span>${esc(b.name)}`;

  document.body.innerHTML = `
  <aside class="rail" aria-label="Page sections">
    <a class="rail-logo" href="index.html" aria-label="${esc(b.name)}">${LOGO_SIMPLE}</a>
    <div class="rail-title">${esc(b.railTitle)}</div>
    <nav class="rail-dots" id="railDots" aria-label="Section navigation"></nav>
    <div class="rail-progress" aria-hidden="true"><i></i></div>
  </aside>

  <aside class="dock" id="dock" aria-label="Contact"></aside>

  <div class="strip"><div class="wrap">
    ${SITE.strip.map(t => `<span>${CHECK_ICON}${esc(t)}</span>`).join("")}
  </div></div>

  <header class="site-header" id="siteHeader"><div class="wrap">
    <a href="index.html" class="logo" aria-label="${esc(b.name)}">${logo}</a>
    <nav class="main-nav" aria-label="Main navigation">
      ${SITE.nav.map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join("")}
    </nav>
    <button class="cart-btn" id="openCart" aria-label="${esc(L.cart)}">${CART_ICON}${esc(L.cart)} <span class="cart-count" id="cartCount">0</span></button>
  </div></header>

  <main id="top">
    <div id="pageContent"></div>

    <section class="section" id="contact">
      <div class="wrap">
        <header class="section-head">
          <div class="section-icon"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></div>
          <div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>
        </header>
        <div class="contact-grid" id="contactGrid"></div>
      </div>
    </section>
  </main>

  <footer class="site-footer"><div class="wrap">
    <div class="footer-grid">
      <div>
        <a href="index.html" class="logo"><span class="logo-mark">${LOGO_SIMPLE}</span>${esc(b.name)}</a>
        <p>${esc(f.about)}</p>
      </div>
      <div>
        <h4>${esc(f.pagesTitle)}</h4>
        <ul>${SITE.nav.map(n => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`).join("")}</ul>
      </div>
      <div>
        <h4>${esc(f.contactTitle)}</h4>
        <ul id="footerContact"></ul>
      </div>
    </div>
    <p class="risk">${esc(f.risk)}</p>
  </div></footer>

  <dialog id="cartDialog" aria-labelledby="cartTitle">
    <div class="dialog-head">
      <h3 id="cartTitle">${esc(L.cartTitle)}</h3>
      <button class="icon-btn" id="closeCart" aria-label="Close">&times;</button>
    </div>
    <div id="cartBody"></div>
  </dialog>

  <dialog id="lightbox" class="lightbox" aria-label="Image preview">
    <button class="icon-btn lb-close" id="closeLightbox" aria-label="Close">&times;</button>
    <img id="lightboxImg" alt="">
  </dialog>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function buildRail() {
  const wrap = $("#railDots");
  if (!wrap) return;
  const items = (SITE.rail[PAGE] || []).filter(i => document.getElementById(i.id));
  wrap.innerHTML = items.map(i => `<a href="#${i.id}" data-target="${i.id}" aria-label="${esc(i.label)}"><span>${esc(i.label)}</span></a>`).join("");
}

/* ==========================================================
   CONTACT (dock, cards, footer)
   ========================================================== */
function renderContact() {
  const list = SITE.contact;
  const dock = $("#dock");
  if (dock) dock.innerHTML =
    `<div class="dock-status"><span class="dot"></span>${esc(SITE.labels.online)}</div>` +
    list.map(c => `
      <a class="dock-item" href="${esc(c.href)}"${extAttr(c.href)} aria-label="${esc(c.label)}: ${esc(c.value)}">
        <span class="dock-icon" style="--tile:${c.tile}">${ICONS[c.icon] || ICONS.link}</span>
        <span class="dock-label">${esc(c.value)}</span>
      </a>`).join("");

  const grid = $("#contactGrid");
  if (grid) grid.innerHTML = list.map(c => `
    <a class="contact-card" href="${esc(c.href)}"${extAttr(c.href)}>
      <span class="contact-tile" style="--tile:${c.tile}">${ICONS[c.icon] || ICONS.link}</span>
      <span><small>${esc(c.label)}</small><strong>${esc(c.value)}</strong></span>
    </a>`).join("");

  const footer = $("#footerContact");
  if (footer) footer.innerHTML = list.map(c => `<li><a href="${esc(c.href)}"${extAttr(c.href)}>${esc(c.value)}</a></li>`).join("");
}

/* ==========================================================
   HOME PAGE
   ========================================================== */
function renderHomePage() {
  document.title = SITE.brand.homeTitle;
  $('meta[name="description"]')?.setAttribute("content", SITE.brand.description);

  const h = SITE.hero, c = h.chart, s = SITE.sections.products;
  $("#pageContent").innerHTML = `
  <section class="hero" id="home">
    <div class="wrap hero-inner">
      <div class="hero-copy">
        <h1>${esc(h.title)}</h1>
        <p class="lead">${esc(h.lead)}</p>
        <div class="hero-actions">
          <a href="${esc(h.primaryButton.href)}" class="btn btn-primary">${esc(h.primaryButton.label)}</a>
          <a href="${esc(h.secondaryButton.href)}" class="btn btn-ghost">${esc(h.secondaryButton.label)}</a>
        </div>
      </div>
      <div class="terminal">
        <div class="terminal-bar"><span><b>${esc(c.symbol)}</b>, ${esc(c.timeframe)}</span><span>${esc(c.status)}</span></div>
        <svg id="chart" viewBox="0 0 640 380" role="img" aria-label="${esc(c.alt)}"></svg>
        <div class="terminal-foot">${esc(c.note)}</div>
      </div>
    </div>
  </section>

  <section class="section" id="products">
    <div class="wrap">
      <header class="section-head">
        <div class="section-icon"><svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg></div>
        <div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>
      </header>
      <div class="product-grid" id="productGrid"></div>
    </div>
  </section>`;

  renderProductGrid();
  drawChart();
}

function renderProductGrid() {
  const L = SITE.labels;
  $("#productGrid").innerHTML = PRODUCTS.map(p => {
    const videos = (p.media || []).filter(m => m.type === "video" || m.type === "youtube").length;
    const tests = (p.backtests || []).length;
    const badges = (videos || tests)
      ? `<div class="shot-badges">${videos ? `<span>${PLAY_ICON}${esc(L.video)}</span>` : ""}${tests ? `<span>${esc(L.backtest)}</span>` : ""}</div>` : "";
    const base = coverBase(p.image);
    return `
    <article class="product">
      <a href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(L.viewDetails)}: ${esc(p.name)}">
        <div class="shot">
          <div class="shot-ph">${IMAGE_ICON}<b>${esc(L.imagePlaceholder)}</b><code>${esc(hasExt(base) ? base : base + ".jpg")}</code></div>
          <img data-src="${esc(base)}" alt="${esc(p.name)}">
          ${badges}
        </div>
      </a>
      <div class="product-body">
        <div class="product-top">
          <span class="tag">${esc(p.tag)}</span>
          <span class="product-price">${money(p.price)}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.shortDescription)}</p>
        <div class="product-actions">
          <button class="btn-add" data-add data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-price="${p.price}">${esc(L.addToCart)}</button>
          <a class="btn-view" href="product.html?id=${encodeURIComponent(p.id)}">${esc(L.viewDetails)}${ARROW_RIGHT}</a>
        </div>
      </div>
    </article>`;
  }).join("");
  loadImages();
}

/* ==========================================================
   PRODUCT PAGE
   ========================================================== */
const ytId = m => m.id || ((m.src || "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1] || "";

function stageHTML(it, name) {
  if (it.type === "video") {
    return `<video controls playsinline preload="metadata"${it.poster ? ` poster="${esc(it.poster)}"` : ""}><source src="${esc(it.src)}"></video>`;
  }
  if (it.type === "youtube") {
    return `<iframe src="https://www.youtube-nocookie.com/embed/${esc(ytId(it))}?rel=0" title="${esc(it.title || name)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`;
  }
  return `<img src="${esc(it.src)}" alt="${esc(it.title || name)}" data-zoom>`;
}

function thumbHTML(it, i) {
  const isVideo = it.type !== "image";
  const pic = it.type === "image" ? it.src
            : it.type === "video" ? it.poster
            : `https://i.ytimg.com/vi/${ytId(it)}/mqdefault.jpg`;
  return `<button type="button" class="thumb${isVideo ? " is-video" : ""}" data-index="${i}" aria-label="${esc(it.title || "Media " + (i + 1))}">
    ${pic ? `<img src="${esc(pic)}" alt="" loading="lazy">` : ""}
    ${isVideo ? `<span class="thumb-play">${PLAY_ICON}</span>` : ""}
  </button>`;
}

function initGallery(items, name) {
  const box = $("#gallery");
  if (!items.length) { box.innerHTML = `<div class="stage stage-empty">${IMAGE_ICON}</div>`; return; }

  box.innerHTML =
    `<div class="stage" id="stage"></div><p class="stage-cap" id="stageCap"></p>` +
    (items.length > 1 ? `<div class="thumbs">${items.map(thumbHTML).join("")}</div>` : "");

  const show = i => {
    $("#stage").innerHTML = stageHTML(items[i], name);
    $("#stageCap").textContent = items[i].title || "";
    $$(".thumb", box).forEach(t => t.classList.toggle("is-active", Number(t.dataset.index) === i));
  };
  box.addEventListener("click", e => {
    const t = e.target.closest(".thumb");
    if (t) show(Number(t.dataset.index));
  });
  show(0);
}

function backtestHTML(p) {
  const L = SITE.labels, tests = p.backtests || [], stats = p.backtestStats || [];
  if (!tests.length && !stats.length) return "";
  return `
  <section class="wrap bt-section" id="backtests">
    <h2>${esc(L.backtests)}</h2>
    <p class="bt-intro">${esc(p.backtestNote || L.backtestsIntro)}</p>
    ${stats.length ? `<div class="bt-stats">${stats.map(s => `<div class="bt-stat"><small>${esc(s.label)}</small><strong>${esc(s.value)}</strong></div>`).join("")}</div>` : ""}
    ${tests.length ? `<div class="bt-grid">${tests.map(t => `
      <figure class="bt-card">
        <img src="${esc(t.image)}" alt="${esc(t.title || p.name)}" loading="lazy" data-zoom>
        ${(t.title || t.caption) ? `<figcaption>${t.title ? `<b>${esc(t.title)}</b>` : ""}${t.caption ? `<span>${esc(t.caption)}</span>` : ""}</figcaption>` : ""}
      </figure>`).join("")}</div>` : ""}
  </section>`;
}

async function renderProductPage() {
  const L = SITE.labels;
  const id = new URLSearchParams(location.search).get("id");
  const p = PRODUCTS.find(x => x.id === id);
  const content = $("#pageContent");

  if (!p) {
    document.title = L.notFoundTitle + " | " + SITE.brand.name;
    content.innerHTML = `
      <div class="wrap not-found">
        <h1>${esc(L.notFoundTitle)}</h1>
        <p>${esc(L.notFoundText)}</p>
        <a class="btn btn-primary" href="index.html#products">${esc(L.backToProducts)}</a>
      </div>`;
    return;
  }

  document.title = p.name + " | " + SITE.brand.name;
  $('meta[name="description"]')?.setAttribute("content", p.shortDescription);

  const list = arr => (arr || []).map(x => `<li>${CHECK_ICON}<span>${esc(x)}</span></li>`).join("");
  const features = list(p.features), requirements = list(p.requirements);

  content.innerHTML = `
    <div class="wrap">
      <a class="back-link" href="index.html#products">${ARROW_LEFT}${esc(L.backToProducts)}</a>
    </div>

    <div class="wrap detail-hero" id="overview">
      <div class="gallery" id="gallery"></div>
      <div class="detail-info">
        <div class="detail-badges">
          <span class="tag">${esc(p.tag)}</span>
          <span class="tag">${esc(p.platform)}</span>
        </div>
        <h1>${esc(p.name)}</h1>
        <p class="detail-short">${esc(p.shortDescription)}</p>
        <div class="detail-price">${money(p.price)}</div>
        <div class="detail-actions">
          <button class="btn btn-primary" data-add data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-price="${p.price}">${esc(L.addToCart)}</button>
          <a class="btn btn-ghost" href="index.html#products">${esc(L.seeOthers)}</a>
        </div>
      </div>
    </div>

    <div class="wrap detail-body" id="details">
      <div class="detail-block">
        <h2>${esc(L.overview)}</h2>
        ${paragraphs(p.overview)}
        ${(p.sections || []).map(sec => `
          <h2 class="sub-h">${esc(sec.title)}</h2>
          ${sec.text ? paragraphs(sec.text) : ""}
          ${sec.items ? `<ul class="check-list">${list(sec.items)}</ul>` : ""}`).join("")}
      </div>
      <div>
        ${features ? `<div class="side-card"><h2>${esc(L.features)}</h2><ul class="check-list">${features}</ul></div>` : ""}
        ${requirements ? `<div class="side-card"><h2>${esc(L.requirements)}</h2><ul class="check-list">${requirements}</ul></div>` : ""}
      </div>
    </div>

    ${backtestHTML(p)}`;

  /* backtest images that fail to load are removed */
  $$("#backtests .bt-card img").forEach(im => im.addEventListener("error", () => {
    im.closest(".bt-card")?.remove();
    if (!$("#backtests .bt-card") && !$("#backtests .bt-stat")) $("#backtests")?.remove();
  }));

  /* gallery: cover image first, then everything from "media" */
  const cover = await resolveImage(coverBase(p.image));
  const items = [];
  if (cover) items.push({ type: "image", src: cover, title: "" });
  (p.media || []).forEach(m => items.push({ type: "image", ...m }));
  initGallery(items, p.name);
}

/* ==========================================================
   LIGHTBOX (any <img data-zoom>)
   ========================================================== */
function initLightbox() {
  const lightbox = $("#lightbox");
  if (!lightbox) return;
  document.addEventListener("click", e => {
    const img = e.target.closest("img[data-zoom]");
    if (img) {
      $("#lightboxImg").src = img.src;
      $("#lightboxImg").alt = img.alt;
      lightbox.showModal();
    }
  });
  $("#closeLightbox")?.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", e => { if (e.target === lightbox) lightbox.close(); });
}

/* ==========================================================
   CART + CRYPTO PAYMENT
   ========================================================== */
const CART_KEY = "goldbot_cart_v1";
let selectedCrypto = null;

function loadCart() {
  try { return new Map(JSON.parse(localStorage.getItem(CART_KEY) || "[]").map(i => [i.id, i])); }
  catch (err) { return new Map(); }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify([...cart.values()])); } catch (err) {}
}
let cart = loadCart();

function syncButtons() {
  const L = SITE.labels;
  $$("[data-add]").forEach(btn => {
    const added = cart.has(btn.dataset.id);
    btn.classList.toggle("is-added", added);
    btn.textContent = added ? L.added : L.addToCart;
    btn.setAttribute("aria-pressed", added);
  });
  const count = $("#cartCount");
  if (count) count.textContent = cart.size;
}

function toggleCart(btn) {
  const L = SITE.labels, id = btn.dataset.id, name = btn.dataset.name;
  if (cart.has(id)) {
    cart.delete(id);
    toast(fill(L.toastRemoved, { name }));
  } else {
    cart.set(id, { id, name, price: Number(btn.dataset.price) });
    toast(fill(L.toastAdded, { name }));
  }
  saveCart();
  syncButtons();
  renderCart();
}

function orderText() {
  const items = [...cart.values()];
  const total = items.reduce((n, i) => n + i.price, 0);
  return SITE.order.greeting + "\n" +
    items.map(i => `- ${i.name} (${money(i.price)})`).join("\n") +
    `\n${SITE.labels.total}: ${money(total)}`;
}

function renderPaymentMethods() {
  const P = SITE.payment;
  const method = P.methods.find(m => m.id === selectedCrypto) || P.methods[0];
  selectedCrypto = method.id;
  const tg = `<a href="${esc(SITE.order.telegram)}" target="_blank" rel="noopener">Telegram</a>`;
  return `
    <div class="payment-methods">
      <h4 class="payment-title">${esc(P.title)}</h4>
      <p class="payment-sub">${esc(P.subtitle)}</p>
      <div class="payment-tabs" role="tablist" aria-label="Cryptocurrency">
        ${P.methods.map(m => `
          <button type="button" class="payment-tab${m.id === method.id ? " is-active" : ""}" data-crypto="${esc(m.id)}" role="tab" aria-selected="${m.id === method.id}">
            <span class="payment-emoji">${m.emoji}</span>${esc(m.label)}
          </button>`).join("")}
      </div>
      <div class="payment-card">
        <div class="payment-network"><span>${esc(P.networkLabel)}</span><strong>${esc(method.network)}</strong></div>
        <div class="payment-address">
          <code id="paymentAddress">${esc(method.address)}</code>
          <button type="button" class="copy-btn" id="copyAddress" data-copy="${esc(method.address)}">${esc(P.copyLabel)}</button>
        </div>
      </div>
      <p class="payment-warning">${esc(P.warning)}</p>
      <p class="payment-instructions">${esc(P.instructions).replace("{telegram}", tg)}</p>
    </div>`;
}

function renderCart() {
  const body = $("#cartBody");
  if (!body) return;
  const L = SITE.labels;
  if (!cart.size) {
    body.innerHTML = `<p class="cart-empty">${esc(L.cartEmpty)}</p>` + renderPaymentMethods();
    return;
  }
  const items = [...cart.values()];
  const total = items.reduce((n, i) => n + i.price, 0);
  const mail = `mailto:${SITE.order.email}?subject=${encodeURIComponent(SITE.order.subject)}&body=${encodeURIComponent(orderText())}`;
  body.innerHTML = `
    <ul class="cart-list">
      ${items.map(i => `<li><span>${esc(i.name)}</span><span><strong>${money(i.price)}</strong><button class="remove" data-remove="${esc(i.id)}">${esc(L.remove)}</button></span></li>`).join("")}
    </ul>
    <div class="dialog-foot">
      <div class="total"><span>${esc(L.total)}</span><span>${money(total)}</span></div>
      <a class="btn btn-primary" href="${mail}">${esc(L.orderEmail)}</a>
      <a class="btn btn-ghost" id="orderTg" href="${esc(SITE.order.telegram)}" target="_blank" rel="noopener">${esc(L.orderTelegram)}</a>
      <p class="order-note">${esc(L.orderNote)}</p>
    </div>
    ${renderPaymentMethods()}`;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

function copyText(text, okMsg, failMsg) {
  try { navigator.clipboard.writeText(text).then(() => toast(okMsg), () => toast(failMsg)); }
  catch (err) { toast(failMsg); }
}

function initCartUI() {
  const L = SITE.labels;
  document.addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    if (add) return toggleCart(add);

    const rem = e.target.closest("[data-remove]");
    if (rem) { cart.delete(rem.dataset.remove); saveCart(); syncButtons(); renderCart(); return; }

    const tab = e.target.closest("[data-crypto]");
    if (tab) { selectedCrypto = tab.dataset.crypto; renderCart(); return; }

    const copyBtn = e.target.closest("#copyAddress");
    if (copyBtn) return copyText(copyBtn.dataset.copy, L.toastCopied, L.toastCopyFail);

    if (e.target.closest("#orderTg")) copyText(orderText(), L.toastOrderCopied, L.toastOrderCopyFail);
  });

  const dialog = $("#cartDialog");
  $("#openCart")?.addEventListener("click", () => { renderCart(); dialog.showModal(); });
  $("#closeCart")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
}

/* ==========================================================
   HEADER HEIGHT AND SIDE RAIL PROGRESS
   ========================================================== */
function setHeaderHeight() {
  const header = $("#siteHeader");
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
}
window.addEventListener("resize", setHeaderHeight);

function initRail() {
  const links = $$(".rail-dots a");
  if (!links.length) return;
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) links.forEach(a => a.classList.toggle("is-active", a.dataset.target === en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(a => { const s = document.getElementById(a.dataset.target); if (s) io.observe(s); });
  }
  const update = () => {
    const h = document.documentElement;
    const p = h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1);
    h.style.setProperty("--p", Math.min(100, Math.max(0, p * 100)) + "%");
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ==========================================================
   HERO CHART (illustration drawn with SVG)
   ========================================================== */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function drawChart() {
  const svg = $("#chart"), NS = "http://www.w3.org/2000/svg";
  if (!svg) return;
  const W = 640, H = 380, L = 12, R = 60, T = 16, B = 24, N = 52;
  const rand = rng(11);

  let price = 100; const d = [];
  for (let i = 0; i < N; i++) {
    const drift = i < 20 ? -0.3 : i < 38 ? 0.5 : -0.35;
    const o = price, c = o + (rand() - 0.5) * 3 + drift;
    d.push({ o, c, h: Math.max(o, c) + rand() * 1.5, l: Math.min(o, c) - rand() * 1.5 });
    price = c;
  }
  const lo = Math.min(...d.map(k => k.l)), hi = Math.max(...d.map(k => k.h)), m = (hi - lo) * 0.09;
  const min = lo - m, max = hi + m;
  const y = v => T + (max - v) / (max - min) * (H - T - B);
  const step = (W - L - R) / N, x = i => L + step * (i + 0.5), bw = step * 0.6;

  const el = (name, attrs, parent = svg) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };

  for (let g = 0; g <= 5; g++) {
    const v = min + (max - min) * g / 5, yy = y(v);
    el("line", { x1: L, x2: W - R, y1: yy, y2: yy, class: "grid" });
    el("text", { x: W - R + 8, y: yy + 4, class: "axis" }).textContent = (2300 + (v - min) / (max - min) * 60).toFixed(2);
  }

  const candles = d.map((k, i) => {
    const g = el("g", { class: "candle " + (k.c >= k.o ? "up" : "down") });
    el("line", { x1: x(i), x2: x(i), y1: y(k.h), y2: y(k.l) }, g);
    el("rect", { x: x(i) - bw / 2, y: y(Math.max(k.o, k.c)), width: bw, height: Math.max(2, Math.abs(y(k.o) - y(k.c))), rx: 1 }, g);
    return g;
  });

  const P = 9, pts = [];
  for (let i = P - 1; i < N; i++) {
    let s = 0; for (let j = i - P + 1; j <= i; j++) s += d[j].c;
    pts.push(x(i).toFixed(1) + "," + y(s / P).toFixed(1));
  }
  const ma = el("polyline", { points: pts.join(" "), class: "ma" });

  /* drawn tools: a trendline and a zone (instead of trade markers) */
  let bi = 0; for (let i = 0; i < 30; i++) if (d[i].l < d[bi].l) bi = i;
  let si = bi + 4; for (let i = bi + 4; i < N; i++) if (d[i].h > d[si].h) si = i;
  const marks = el("g", { class: "marks" });
  const zx = x(Math.min(N - 14, si - 2));
  el("rect", { x: zx, y: y(d[si].h) + 38, width: W - R - zx, height: 30, rx: 4, class: "zone" }, marks);
  el("text", { x: zx + 8, y: y(d[si].h) + 57, class: "pill-text zone-text" }, marks).textContent = "FVG";
  el("line", { x1: x(bi), y1: y(d[bi].l), x2: x(si), y2: y(d[si].h), class: "trade" }, marks);
  el("text", { x: x(bi) + 12, y: y(d[bi].l) + 20, class: "pill-text trade-text" }, marks).textContent = "Trendline";

  const finish = () => { ma.classList.add("on"); marks.classList.add("on"); };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    candles.forEach(c => c.classList.add("on")); finish(); return;
  }
  const len = ma.getTotalLength();
  ma.style.strokeDasharray = len; ma.style.strokeDashoffset = len;
  candles.forEach((c, i) => setTimeout(() => c.classList.add("on"), 300 + i * 45));
  setTimeout(finish, 300 + N * 45 + 200);
}

main();
