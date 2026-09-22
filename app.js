/* ==========================================================
   YOUR CONTACT DETAILS (edit here, they update on every page)
   ========================================================== */
const CONTACT = [
  { label: "Email",     value: "goldbot.ea2026@gmail.com", href: "mailto:goldbot.ea2026@gmail.com",   icon: "mail",      tile: "#2148F0" },
  { label: "Instagram", value: "@goldbot2026",             href: "https://instagram.com/goldbot2026",  icon: "instagram", tile: "linear-gradient(135deg,#F58529,#DD2A7B 55%,#8134AF)" },
  { label: "Telegram",  value: "@sebastian_ea",            href: "https://t.me/sebastian_ea",          icon: "telegram",  tile: "#229ED9" }
];
const ORDER_EMAIL    = "goldbot.ea2026@gmail.com";
const ORDER_TELEGRAM = "https://t.me/sebastian_ea";

/* ==========================================================
   CRYPTO PAYMENT METHODS (edit here, they update in the cart)
   ========================================================== */
const PAYMENT_METHODS = [
  { id: "bnb",  emoji: "🟡", label: "BNB",       network: "BNB Smart Chain (BEP20)", address: "0xC083cc2f4DDc804193C5716309BD7Eb8079C1958" },
  { id: "tron", emoji: "🔴", label: "TRON",      network: "TRON (TRC20)",            address: "TNeojsS2HwwJjXbRshQFnQjSy4XNF5qUN2" },
  { id: "ada",  emoji: "🔵", label: "Cardano",   network: "Cardano",                 address: "addr1qy00dvahhg2phca0mym53capu9xaf3lkx9dfk65njamaw8y0hm4ma8q47zqaetmg2zwvquua03dzp03lk2932mrzsmvq0vd2xg" },
  { id: "doge", emoji: "🐕", label: "Dogecoin",  network: "Dogecoin",                address: "DDfotkTcjze7wLQrrFWaDzDCDB6wBQxJBN" },
  { id: "xrp",  emoji: "💧", label: "XRP",       network: "XRP Ledger",              address: "rBW7jCJzFRkaVDZ4kwgDFGJBHuxA8eVUXH" }
];
let selectedCrypto = PAYMENT_METHODS[0].id;

/* ==========================================================
   HELPERS
   ========================================================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => "$" + Number(n).toLocaleString("en-US");

/* Icons (Feather style, drawn with strokes) */
const ICONS = {
  mail: '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  telegram: '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
};
const IMAGE_ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';

/* ==========================================================
   CONTACT DOCK, CONTACT CARDS AND FOOTER LINKS
   Fills #dock, #contactGrid and #footerContact if present on the page.
   ========================================================== */
function renderContact() {
  const external = href => href.startsWith("http") ? ' target="_blank" rel="noopener"' : "";

  const dock = $("#dock");
  if (dock) {
    dock.innerHTML =
      `<div class="dock-status"><span class="dot"></span>Online</div>` +
      CONTACT.map(c => `
        <a class="dock-item" href="${c.href}"${external(c.href)} aria-label="${c.label}: ${c.value}">
          <span class="dock-icon" style="--tile:${c.tile}">${ICONS[c.icon]}</span>
          <span class="dock-label">${c.value}</span>
        </a>`).join("");
  }

  const grid = $("#contactGrid");
  if (grid) {
    grid.innerHTML = CONTACT.map(c => `
      <a class="contact-card" href="${c.href}"${external(c.href)}>
        <span class="contact-tile" style="--tile:${c.tile}">${ICONS[c.icon]}</span>
        <span><small>${c.label}</small><strong>${c.value}</strong></span>
      </a>`).join("");
  }

  const footer = $("#footerContact");
  if (footer) {
    footer.innerHTML = CONTACT.map(c =>
      `<li><a href="${c.href}"${external(c.href)}>${c.value}</a></li>`).join("");
  }
}

/* ==========================================================
   CRYPTO PAYMENT METHODS (rendered inside the cart dialog)
   ========================================================== */
function renderPaymentMethods() {
  const method = PAYMENT_METHODS.find(m => m.id === selectedCrypto) || PAYMENT_METHODS[0];
  return `
    <div class="payment-methods">
      <h4 class="payment-title">Pay with crypto</h4>
      <p class="payment-sub">Select your preferred cryptocurrency</p>
      <div class="payment-tabs" role="tablist" aria-label="Cryptocurrency">
        ${PAYMENT_METHODS.map(m => `
          <button type="button" class="payment-tab${m.id === method.id ? " is-active" : ""}" data-crypto="${m.id}" role="tab" aria-selected="${m.id === method.id}">
            <span class="payment-emoji">${m.emoji}</span>${m.label}
          </button>`).join("")}
      </div>
      <div class="payment-card">
        <div class="payment-network"><span>Network</span><strong>${method.network}</strong></div>
        <div class="payment-address">
          <code id="paymentAddress">${method.address}</code>
          <button type="button" class="copy-btn" id="copyAddress" data-copy="${method.address}">Copy</button>
        </div>
      </div>
      <p class="payment-warning">⚠️ Important: please make sure you select the correct network before sending your payment. Sending funds through an unsupported or incorrect network may result in permanent loss of funds.</p>
      <p class="payment-instructions">After completing the payment, contact us on <a href="${ORDER_TELEGRAM}" target="_blank" rel="noopener">Telegram</a> and send a screenshot of the payment along with your transaction ID (TXID) so we can confirm it and send you the product file.</p>
    </div>`;
}

/* ==========================================================
   IMAGE LOADING
   Looks for images/<name>.jpg, .jpeg, .png or .webp.
   If none exist, the placeholder box (or the <img> itself) is removed.
   ========================================================== */
function loadImages(scope = document) {
  const EXT = ["jpg", "jpeg", "png", "webp"];
  $$("img[data-src]", scope).forEach(img => {
    let i = 0;
    const tryNext = () => {
      if (i >= EXT.length) { img.remove(); return; }
      img.src = img.dataset.src + "." + EXT[i++];
    };
    img.addEventListener("load", () => img.classList.add("loaded"));
    img.addEventListener("error", tryNext);
    tryNext();
  });
}

/* ==========================================================
   LIGHTBOX (click a loaded image to enlarge it)
   Requires a <dialog id="lightbox"> with <img id="lightboxImg"> and
   a close button with id="closeLightbox" on the page.
   ========================================================== */
function initLightbox() {
  const lightbox = $("#lightbox");
  if (!lightbox) return;
  document.addEventListener("click", e => {
    const img = e.target.closest(".shot img.loaded, .detail-shot img.loaded");
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
   CART
   Stored in localStorage so it carries over between the homepage
   and every product page.
   ========================================================== */
const CART_KEY = "goldbot_cart_v1";

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return new Map(raw.map(i => [i.id, i]));
  } catch (err) { return new Map(); }
}
function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify([...cart.values()])); } catch (err) {}
}
let cart = loadCart();

function syncButtons() {
  $$("[data-add]").forEach(btn => {
    const added = cart.has(btn.dataset.id);
    btn.classList.toggle("is-added", added);
    btn.textContent = added ? "Added" : (btn.dataset.label || "Add to cart");
    btn.setAttribute("aria-pressed", added);
  });
  const count = $("#cartCount");
  if (count) count.textContent = cart.size;
}

function toggleCart(btn) {
  const id = btn.dataset.id;
  if (cart.has(id)) {
    cart.delete(id);
    toast(btn.dataset.name + " removed from cart");
  } else {
    cart.set(id, { id, name: btn.dataset.name, price: Number(btn.dataset.price) });
    toast(btn.dataset.name + " added to cart");
  }
  saveCart(cart);
  syncButtons();
  renderCart();
}

function orderText() {
  const items = [...cart.values()];
  const total = items.reduce((n, i) => n + i.price, 0);
  return "Hello, I would like to order for MetaTrader 5:\n" +
    items.map(i => `- ${i.name} (${money(i.price)})`).join("\n") +
    `\nTotal: ${money(total)}`;
}

function renderCart() {
  const body = $("#cartBody");
  if (!body) return;
  if (!cart.size) {
    body.innerHTML =
      `<p class="cart-empty">Your cart is empty. Add a product to get started.</p>` +
      renderPaymentMethods();
    return;
  }
  const items = [...cart.values()];
  const total = items.reduce((n, i) => n + i.price, 0);
  const mail = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent("New order")}&body=${encodeURIComponent(orderText())}`;
  body.innerHTML = `
    <ul class="cart-list">
      ${items.map(i => `<li><span>${i.name}</span><span><strong>${money(i.price)}</strong><button class="remove" data-remove="${i.id}">Remove</button></span></li>`).join("")}
    </ul>
    <div class="dialog-foot">
      <div class="total"><span>Total</span><span>${money(total)}</span></div>
      <a class="btn btn-primary" href="${mail}">Order by email</a>
      <a class="btn btn-ghost" id="orderTg" href="${ORDER_TELEGRAM}" target="_blank" rel="noopener">Order on Telegram</a>
      <p class="order-note">For Telegram, your order text is copied automatically. Paste it into the chat.</p>
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

function initCartUI() {
  document.addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    if (add) return toggleCart(add);

    const rem = e.target.closest("[data-remove]");
    if (rem) { cart.delete(rem.dataset.remove); saveCart(cart); syncButtons(); renderCart(); return; }

    const cryptoTab = e.target.closest("[data-crypto]");
    if (cryptoTab) { selectedCrypto = cryptoTab.dataset.crypto; renderCart(); return; }

    const copyBtn = e.target.closest("#copyAddress");
    if (copyBtn) {
      const address = copyBtn.dataset.copy;
      try {
        navigator.clipboard.writeText(address).then(
          () => toast("Address copied"),
          () => toast("Could not copy. Please select and copy the address manually.")
        );
      } catch (err) { toast("Could not copy. Please select and copy the address manually."); }
      return;
    }

    if (e.target.closest("#orderTg")) {
      try {
        navigator.clipboard.writeText(orderText()).then(
          () => toast("Order copied. Paste it into the Telegram chat."),
          () => toast("Telegram opened. Please type your order in the chat.")
        );
      } catch (err) { toast("Telegram opened. Please type your order in the chat."); }
    }
  });

  const dialog = $("#cartDialog");
  const openBtn = $("#openCart");
  if (dialog && openBtn) {
    openBtn.addEventListener("click", () => { renderCart(); dialog.showModal(); });
    $("#closeCart")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  }
  syncButtons();
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
