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
        ${h.badge ? `<span class="hero-badge"><i></i>${esc(h.badge)}</span>` : ""}
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

  ${statsHTML()}

  <section class="section" id="products">
    <div class="wrap">
      <header class="section-head">
        <div class="section-icon"><svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg></div>
        <div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>
      </header>
      ${filtersHTML()}
      <div class="product-grid" id="productGrid"></div>
    </div>
  </section>`;

  $("#pageContent").insertAdjacentHTML("beforeend", extraSectionsHTML());
  renderProductGrid();
  initFilters();
  drawChart();
}

let ACTIVE_FILTER = "all";

function renderProductGrid() {
  const L = SITE.labels;
  $("#productGrid").innerHTML = PRODUCTS.filter(p => ACTIVE_FILTER === "all" || p.tag === ACTIVE_FILTER).map(p => {
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
        ${trustHTML()}
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

    ${backtestHTML(p)}

    ${relatedHTML(p)}`;

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
   HERO CHART: live demo of a stop-and-reverse setup on gold.
   1. A Buy Stop and a Sell Stop are placed around the price.
   2. Price breaks up: the Buy Stop triggers and the BUY opens.
      The Sell Stop and the stop loss trail behind the price.
   3. The BUY reaches +$15.00 and closes. The Sell Stop keeps trailing.
   4. Price reverses and hits the Sell Stop: the SELL opens.
      Now the Buy Stop and its stop loss trail above the price.
   5. The SELL reaches +$12.00 and closes. Then the demo restarts.
   Illustration only, the prices are generated.
   ========================================================== */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const CH = { W: 640, H: 380, L: 12, R: 64, T: 22, B: 26, N: 30, TICKS: 9, DIST: 4, GAP: 0.8, TARGET: 15, TARGET2: 12, HIST: 16, RANGE: 4, WAIT: 10, HOLD: 48, MS: 60 };
const CH_STATUS = {
  idle: "Waiting for entry",
  pending: "Buy Stop + Sell Stop placed",
  long: "BUY active · stops trailing",
  flat: "BUY +$15.00 · Sell Stop trailing",
  short: "SELL active · Buy Stop trailing",
  closed: "SELL +$12.00 · target reached",
  stopped: "Closed by trailing stop",
  reversed: "Closed by trailing stop"
};

function chartMakeSim(seed) {
  const r = rng(seed), base = 3985 + Math.floor(r() * 30), cs = [];
  let p = base + 5;
  const push = (drift, noise, wick, lo, hi) => {
    const o = p;
    let c = o + drift + (r() - 0.5) * 2 * noise;
    if (lo !== undefined) c = Math.min(hi, Math.max(lo, c));
    cs.push({ o, c, h: Math.max(o, c) + r() * wick, l: Math.min(o, c) - r() * wick });
    p = c;
  };
  for (let i = 0; i < CH.HIST; i++) push(-0.35, 1.5, 1.1);
  const c0 = p;
  for (let i = 0; i < CH.RANGE; i++) push(0, 1.1, 0.7, c0 - 2, c0 + 2);
  for (let i = 0; i < 16; i++) push(i % 3 === 2 ? -0.7 : 2.3, 0.9, 0.8);   // rally
  for (let i = 0; i < 2; i++) push(0.2, 0.8, 0.7);                            // top
  for (let i = 0; i < 22; i++) push(i % 3 === 2 ? 0.7 : -2.3, 0.9, 0.8);      // reversal
  return { r, cs, c0, shown: cs.slice(0, CH.HIST), i: CH.HIST, t: 0, ticks: null, cur: null, price: c0, state: "idle", wait: CH.WAIT, hold: 0 };
}

/* the price walks through the candle: open -> first extreme -> second extreme -> close */
function chartTicks(s, k) {
  const seq = k.c >= k.o ? [k.o, k.l, k.h, k.c] : [k.o, k.h, k.l, k.c], out = [];
  for (let a = 0; a < 3; a++) {
    for (let j = 1; j <= 3; j++) {
      let v = seq[a] + (seq[a + 1] - seq[a]) * j / 3;
      if (j < 3) v += (s.r() - 0.5) * 0.5;
      out.push(Math.min(k.h, Math.max(k.l, v)));
    }
  }
  out[out.length - 1] = k.c;
  return out;
}

function chartStep(s) {
  if (s.hold > 0) { s.hold--; return s.hold === 0 ? "reset" : null; }
  if (s.wait > 0) {
    s.wait--;
    if (s.wait === 0) { s.state = "pending"; s.placeAt = s.i; s.B = s.c0 + CH.DIST; s.S = s.c0 - CH.DIST; }
    return null;
  }
  if (!s.ticks) {
    if (s.i >= s.cs.length) { s.hold = 20; return null; }
    const k = s.cs[s.i];
    s.ticks = chartTicks(s, k); s.t = 0;
    s.cur = { o: k.o, h: k.o, l: k.o, c: k.o };
  }
  const px = s.ticks[s.t], c = s.cur, x = s.i + s.t / CH.TICKS;
  c.h = Math.max(c.h, px); c.l = Math.min(c.l, px); c.c = px; s.price = px;
  const finish = (state, exit) => { s.state = state; s.exit = exit; s.price = exit; c.c = exit; s.hold = CH.HOLD; };

  /* 1. Buy Stop triggers: BUY opens */
  if (s.state === "pending" && px >= s.B) {
    s.state = "long"; s.entry = s.B; s.entryX = x; s.high = px;
    s.sell = s.S; s.sl = s.S - CH.GAP;
    s.trail = [{ x, sell: s.sell, sl: s.sl }];
  }
  /* 2. BUY runs: Sell Stop and stop loss trail the price up to +$15 */
  if (s.state === "long") {
    s.high = Math.max(s.high, px);
    const ns = s.high - CH.DIST;
    if (ns > s.sell) { s.sell = ns; s.sl = ns - CH.GAP; s.trail.push({ x, sell: s.sell, sl: s.sl }); }
    if (px - s.entry >= CH.TARGET) {
      s.state = "flat"; s.exit1 = s.entry + CH.TARGET; s.exit1X = x;
    } else if (px <= s.sell) {
      s.exit1 = s.sell; s.exit1X = x; finish("stopped", s.sell); return null;
    }
  }
  /* 3. BUY closed at target: the Sell Stop keeps trailing and waits for a reversal */
  if (s.state === "flat") {
    s.high = Math.max(s.high, px);
    const ns = s.high - CH.DIST;
    if (ns > s.sell) { s.sell = ns; s.trail.push({ x, sell: s.sell, sl: s.sl }); }
    if (px <= s.sell) {
      s.state = "short"; s.entry2 = s.sell; s.entry2X = x; s.low = px;
      s.buy = s.entry2 + CH.DIST; s.slB = s.buy + CH.GAP;
      s.trail2 = [{ x, buy: s.buy, sl: s.slB }];
    }
  }
  /* 4. SELL runs: Buy Stop and stop loss trail the price down to +$12 */
  if (s.state === "short") {
    s.low = Math.min(s.low, px);
    const nb = s.low + CH.DIST;
    if (nb < s.buy) { s.buy = nb; s.slB = nb + CH.GAP; s.trail2.push({ x, buy: s.buy, sl: s.slB }); }
    if (s.entry2 - px >= CH.TARGET2) { finish("closed", s.entry2 - CH.TARGET2); return null; }
    if (px >= s.buy) { finish("reversed", s.buy); return null; }
  }
  s.t++;
  if (s.t >= CH.TICKS) { s.shown.push(c); s.ticks = null; s.cur = null; s.i++; }
  return null;
}

function chartDraw(svg, s, view) {
  const { W, H, L, R, T, B, N } = CH;
  const UP = "#34D6A0", DN = "#FF7A7A", GOLD = "#F2B84B", INK = "#08111F", WHITE = "#DCE5F5";
  const f = v => +v.toFixed(1), fmt = v => v.toFixed(2);
  const all = s.cur ? s.shown.concat(s.cur) : s.shown;
  const frac = s.ticks ? s.t / CH.TICKS : 0;
  const off = Math.max(0, s.i + frac - (N - 3));
  const step = (W - L - R) / N, bw = step * 0.6;
  const X = j => L + step * (j - off + 0.5);
  const first = Math.max(0, Math.floor(off) - 1);
  const st = s.state;
  const has1 = ["long", "flat", "short", "closed", "stopped", "reversed"].includes(st);
  const has2 = st === "short" || st === "closed" || st === "reversed";
  const nowX = X(s.i + frac);

  /* smooth vertical range */
  let lo = Infinity, hi = -Infinity;
  for (let j = first; j < all.length; j++) { lo = Math.min(lo, all[j].l); hi = Math.max(hi, all[j].h); }
  if (st === "pending") { hi = Math.max(hi, s.B); lo = Math.min(lo, s.S); }
  if (st === "long") { hi = Math.max(hi, s.entry + CH.TARGET); lo = Math.min(lo, s.sl); }
  if (st === "flat") lo = Math.min(lo, s.sell);
  if (has2) { lo = Math.min(lo, s.entry2 - CH.TARGET2); hi = Math.max(hi, s.slB); }
  lo = Math.min(lo, s.price); hi = Math.max(hi, s.price);
  const m = (hi - lo) * 0.08; lo -= m; hi += m;
  if (view.lo === undefined) { view.lo = lo; view.hi = hi; }
  else { view.lo += (lo - view.lo) * 0.12; view.hi += (hi - view.hi) * 0.12; }
  const Y = v => T + (view.hi - v) / (view.hi - view.lo) * (H - T - B);

  const pill = (x, yy, txt, bg, fg, end) => {
    const w = txt.length * 6.4 + 18, x0 = end ? x - w : x;
    return `<rect x="${f(x0)}" y="${f(yy - 9)}" width="${f(w)}" height="18" rx="9" fill="${bg}"/>` +
      `<text x="${f(x0 + w / 2)}" y="${f(yy + 4)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${fg}" font-family="IBM Plex Sans,sans-serif">${txt}</text>`;
  };
  const tag = (v, bg, fg) =>
    `<rect x="${W - R + 2}" y="${f(Y(v) - 9)}" width="${R - 6}" height="18" rx="4" fill="${bg}"/>` +
    `<text x="${W - R + 2 + (R - 6) / 2}" y="${f(Y(v) + 4)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${fg}" font-family="IBM Plex Sans,sans-serif">${fmt(v)}</text>`;
  const line = (x1, x2, v, col, w, dash, op) =>
    `<line x1="${f(x1)}" x2="${f(x2)}" y1="${f(Y(v))}" y2="${f(Y(v))}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}${op ? ` opacity="${op}"` : ""}/>`;
  const stepped = (arr, key, x0, v0, x1) => {
    let prev = v0;
    const pts = [[x0, Y(prev)]];
    for (const t of arr) { pts.push([X(t.x), Y(prev)], [X(t.x), Y(t[key])]); prev = t[key]; }
    pts.push([x1, Y(prev)]);
    return pts.map(q => f(q[0]) + "," + f(q[1])).join(" ");
  };
  const poly = (pts, col, w, dash) => `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  const zone = (x0, x1, a, b, good) => {
    const top = Math.min(Y(a), Y(b)), h = Math.abs(Y(a) - Y(b));
    return `<rect x="${f(x0)}" y="${f(top)}" width="${f(Math.max(0, x1 - x0))}" height="${f(h)}" fill="${good ? "rgba(52,214,160,.14)" : "rgba(255,122,122,.14)"}"/>`;
  };
  const dot = (x, v, col) => `<circle cx="${f(x)}" cy="${f(Y(v))}" r="9" fill="${col}" opacity=".25"/><circle cx="${f(x)}" cy="${f(Y(v))}" r="5" fill="${col}" stroke="#fff" stroke-width="2"/>`;

  const p = [`<defs><clipPath id="chartClip"><rect x="${L}" y="0" width="${W - R - L}" height="${H}"/></clipPath></defs>`];

  for (let g = 0; g <= 5; g++) {
    const v = view.lo + (view.hi - view.lo) * g / 5, yy = f(Y(v));
    p.push(`<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="grid"/><text x="${W - R + 8}" y="${yy + 4}" class="axis">${fmt(v)}</text>`);
  }

  p.push(`<g clip-path="url(#chartClip)">`);

  /* profit zones */
  if (has1) {
    const end1 = st === "long" ? nowX : X(s.exit1X);
    const cur1 = st === "long" ? s.price : s.exit1;
    p.push(zone(X(s.entryX), end1, s.entry, cur1, cur1 >= s.entry));
  }
  if (has2) p.push(zone(X(s.entry2X), nowX, s.entry2, s.price, s.price <= s.entry2));

  /* candles */
  for (let j = first; j < all.length; j++) {
    const k = all[j], x = X(j), col = k.c >= k.o ? UP : DN;
    p.push(`<line x1="${f(x)}" x2="${f(x)}" y1="${f(Y(k.h))}" y2="${f(Y(k.l))}" stroke="${col}" stroke-width="1.4"/>` +
      `<rect x="${f(x - bw / 2)}" y="${f(Y(Math.max(k.o, k.c)))}" width="${f(bw)}" height="${f(Math.max(2, Math.abs(Y(k.o) - Y(k.c))))}" rx="1" fill="${col}"/>`);
  }

  /* moving average */
  const ma = [];
  for (let j = Math.max(first, 8); j < all.length; j++) {
    let sum = 0; for (let q = j - 8; q <= j; q++) sum += all[q].c;
    ma.push(f(X(j)) + "," + f(Y(sum / 9)));
  }
  if (ma.length > 1) p.push(poly(ma.join(" "), "#8FB0FF", 1.6).replace("/>", ` stroke-linejoin="round" opacity=".8"/>`));

  /* current price line */
  p.push(line(L, W - R, s.price, "#fff", 1, "2 4", 0.35));

  if (st === "pending") {
    p.push(line(X(s.placeAt), W - R, s.B, UP, 1.5, "6 4"), line(X(s.placeAt), W - R, s.S, DN, 1.5, "6 4"));
  }

  if (has1) {
    const end1 = st === "long" ? W - R : X(s.exit1X);
    const sellEnd = st === "long" || st === "flat" ? W - R : (has2 ? X(s.entry2X) : nowX);
    p.push(line(X(s.placeAt), X(s.entryX), s.entry, UP, 1.5, "6 4"));
    p.push(line(X(s.entryX), end1, s.entry, WHITE, 1.6));
    p.push(line(X(s.entryX), end1, s.entry + CH.TARGET, GOLD, 1.4, "2 4"));
    p.push(poly(stepped(s.trail, "sell", X(s.placeAt), s.S, sellEnd), DN, 1.6, "6 4"));
    p.push(poly(stepped(s.trail, "sl", X(s.entryX), s.trail[0].sl, end1), "#E5484D", 1.8));
    if (st !== "long" && st !== "stopped") p.push(dot(X(s.exit1X), s.exit1, GOLD));
    if (st === "flat" || has2) p.push(pill(X(s.exit1X) - 10, Y(s.exit1) - 16, "BUY +$" + fmt(CH.TARGET), GOLD, INK, true));
  }

  if (has2) {
    const end2 = st === "short" ? W - R : nowX;
    p.push(line(X(s.entry2X), W - R, s.entry2, WHITE, 1.6));
    p.push(line(X(s.entry2X), W - R, s.entry2 - CH.TARGET2, GOLD, 1.4, "2 4"));
    p.push(poly(stepped(s.trail2, "buy", X(s.entry2X), s.trail2[0].buy, end2), UP, 1.6, "6 4"));
    p.push(poly(stepped(s.trail2, "sl", X(s.entry2X), s.trail2[0].sl, end2), "#E5484D", 1.8));
  }
  p.push(`</g>`);

  /* labels */
  if (st === "pending") {
    p.push(pill(W - R - 8, Y(s.B) - 12, "BUY STOP", UP, INK, true), tag(s.B, UP, INK));
    p.push(pill(W - R - 8, Y(s.S) + 12, "SELL STOP", DN, INK, true), tag(s.S, DN, INK));
  }
  if (st === "long") {
    const ex = Math.min(Math.max(L + 8, X(s.entryX) + 6), W - R - 110);
    p.push(pill(ex, Y(s.entry) + 13, "BUY " + fmt(s.entry), WHITE, INK, false));
    p.push(pill(W - R - 8, Y(s.sell) - 12, "SELL STOP", DN, INK, true), tag(s.sell, DN, INK));
    p.push(pill(W - R - 8, Y(s.sl) + 12, "STOP LOSS", "#E5484D", "#fff", true));
    p.push(pill(W - R - 8, Y(s.entry + CH.TARGET) - 12, "TARGET +$" + fmt(CH.TARGET), GOLD, INK, true), tag(s.entry + CH.TARGET, GOLD, INK));
    const pr = s.price - s.entry;
    p.push(pill(W - R - 8, Y(s.price) + 13, (pr >= 0 ? "+$" : "-$") + fmt(Math.abs(pr)), pr >= 0 ? UP : DN, INK, true));
  }
  if (st === "flat") {
    p.push(pill(W - R - 8, Y(s.sell) + 12, "SELL STOP", DN, INK, true), tag(s.sell, DN, INK));
  }
  if (st === "stopped") {
    p.push(pill(W - R - 8, Y(s.exit) + 16, "TRAILING STOP HIT", DN, INK, true), tag(s.exit, DN, INK));
  }
  if (has2) {
    const ex = Math.min(Math.max(L + 8, X(s.entry2X) + 6), W - R - 120);
    p.push(pill(ex, Y(s.entry2) - 13, "SELL " + fmt(s.entry2), WHITE, INK, false));
    if (st === "short") {
      p.push(pill(W - R - 8, Y(s.slB) - 12, "STOP LOSS", "#E5484D", "#fff", true));
      p.push(pill(W - R - 8, Y(s.buy) + 12, "BUY STOP", UP, INK, true), tag(s.buy, UP, INK));
      p.push(pill(W - R - 8, Y(s.entry2 - CH.TARGET2) + 12, "TARGET +$" + fmt(CH.TARGET2), GOLD, INK, true), tag(s.entry2 - CH.TARGET2, GOLD, INK));
      const pr = s.entry2 - s.price;
      p.push(pill(W - R - 8, Y(s.price) + 13, (pr >= 0 ? "+$" : "-$") + fmt(Math.abs(pr)), pr >= 0 ? UP : DN, INK, true));
    } else if (st === "closed") {
      p.push(dot(nowX, s.exit, GOLD));
      p.push(pill(W - R - 8, Y(s.exit) + 16, "SELL +$" + fmt(CH.TARGET2) + "  TARGET HIT", GOLD, INK, true), tag(s.exit, GOLD, INK));
    } else {
      p.push(dot(nowX, s.exit, DN));
      p.push(pill(W - R - 8, Y(s.exit) - 16, "TRAILING STOP HIT", DN, INK, true), tag(s.exit, DN, INK));
    }
  }
  p.push(tag(s.price, "#fff", INK));

  svg.innerHTML = p.join("");
}

function drawChart() {
  const svg = $("#chart");
  if (!svg) return;
  const status = $(".terminal-bar span:last-child");
  const view = {};
  let run = 0, sim, last = "", visible = true;

  /* only play runs where both trades reach their target */
  const ok = seed => { const q = chartMakeSim(seed); let n = 0; while (!q.hold && n++ < 5000) chartStep(q); return q.state === "closed"; };
  const fresh = () => {
    let seed; do { seed = 11 + run++ * 7; } while (!ok(seed));
    sim = chartMakeSim(seed); view.lo = view.hi = undefined;
  };
  const paint = () => {
    chartDraw(svg, sim, view);
    if (status && sim.state !== last) { last = sim.state; status.textContent = CH_STATUS[last]; }
  };

  fresh();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let n = 0;
    while (!sim.hold && n++ < 5000) chartStep(sim);
    paint();
    return;
  }
  paint();
  if ("IntersectionObserver" in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(svg);
  setInterval(() => {
    if (!visible || document.hidden) return;
    if (chartStep(sim) === "reset") fresh();
    paint();
  }, CH.MS);
}

/* ==========================================================
   EXTRA SECTIONS: stats, filters, why us, how to order, FAQ,
   trust points and related products. Texts come from site.json.
   ========================================================== */
const MORE_ICONS = {
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5"/></svg>'
};

function statsHTML() {
  const list = SITE.stats || [];
  if (!list.length) return "";
  const vars = { count: PRODUCTS.length, payments: (SITE.payment?.methods || []).length };
  return `<section class="stats" aria-label="Highlights"><div class="wrap stats-grid">${
    list.map(s => `<div class="stat"><strong>${esc(fill(s.value, vars))}</strong><span>${esc(s.label)}</span></div>`).join("")
  }</div></section>`;
}

function filtersHTML() {
  const tags = [...new Set(PRODUCTS.map(p => p.tag))];
  if (tags.length < 2) return "";
  const chip = (value, label, n) =>
    `<button type="button" class="chip${value === ACTIVE_FILTER ? " is-active" : ""}" data-filter="${esc(value)}">${esc(label)}<em>${n}</em></button>`;
  return `<div class="filters" id="filters" role="group" aria-label="Filter tools">${
    chip("all", SITE.labels.filterAll || "All", PRODUCTS.length) +
    tags.map(t => chip(t, t, PRODUCTS.filter(p => p.tag === t).length)).join("")
  }</div>`;
}

function initFilters() {
  const box = $("#filters");
  if (!box) return;
  box.addEventListener("click", e => {
    const c = e.target.closest("[data-filter]");
    if (!c) return;
    ACTIVE_FILTER = c.dataset.filter;
    $$(".chip", box).forEach(x => x.classList.toggle("is-active", x === c));
    renderProductGrid();
    syncButtons();
  });
}

function sectionHead(icon, s) {
  return `<header class="section-head"><div class="section-icon">${icon}</div><div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div></header>`;
}

function extraSectionsHTML() {
  const S = SITE.sections, out = [];

  if (S.why && (SITE.why || []).length) out.push(`
  <section class="section" id="why"><div class="wrap">
    ${sectionHead(MORE_ICONS.shield, S.why)}
    <div class="why-grid">${SITE.why.map(w => `
      <article class="why-card">
        <span class="ico why-ico">${MORE_ICONS[w.icon] || MORE_ICONS.chart}</span>
        <h3>${esc(w.title)}</h3><p>${esc(w.text)}</p>
      </article>`).join("")}</div>
  </div></section>`);

  if (S.how && (SITE.steps || []).length) out.push(`
  <section class="section band-dark" id="how"><div class="wrap">
    ${sectionHead(MORE_ICONS.file, S.how)}
    <ol class="steps">${SITE.steps.map((st, i) => `
      <li class="step"><span class="step-n">${i + 1}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></li>`).join("")}</ol>
  </div></section>`);

  if (S.faq && (SITE.faq || []).length) out.push(`
  <section class="section" id="faq"><div class="wrap">
    ${sectionHead(MORE_ICONS.chat, S.faq)}
    <div class="faq">${SITE.faq.map(f => `
      <details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
  </div></section>`);

  return out.join("");
}

function trustHTML() {
  const t = SITE.trust || [];
  return t.length
    ? `<ul class="trust">${t.map(i => `<li><span class="ico">${MORE_ICONS[i.icon] || MORE_ICONS.shield}</span>${esc(i.text)}</li>`).join("")}</ul>`
    : "";
}

function relatedHTML(p) {
  const L = SITE.labels;
  let list = PRODUCTS.filter(x => x.id !== p.id && x.tag === p.tag);
  if (list.length < 3) list = list.concat(PRODUCTS.filter(x => x.id !== p.id && x.tag !== p.tag));
  list = list.slice(0, 3);
  if (!list.length) return "";
  return `<section class="wrap related" id="related"><h2>${esc(L.related || "You may also like")}</h2><div class="related-grid">${
    list.map(x => `
    <a class="rel-card" href="product.html?id=${encodeURIComponent(x.id)}">
      <div class="rel-top"><span class="tag">${esc(x.tag)}</span><b>${money(x.price)}</b></div>
      <h3>${esc(x.name)}</h3>
      <p>${esc(x.shortDescription)}</p>
      <span class="rel-more">${esc(L.viewDetails)}${ARROW_RIGHT}</span>
    </a>`).join("")
  }</div></section>`;
}

main();