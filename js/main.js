// Fills every [data-c="path.to.key"] element from POETIQ_CONTENT. Runs first
// so all copy is in place before anything else renders.
function poetiqApplyContent() {
  if (typeof POETIQ_CONTENT === "undefined") return;
  document.querySelectorAll("[data-c]").forEach((el) => {
    const value = el.getAttribute("data-c").split(".").reduce(
      (obj, key) => (obj && typeof obj === "object" ? obj[key] : undefined),
      POETIQ_CONTENT
    );
    if (typeof value === "string") el.innerHTML = value;
  });
}

function poetiqInit() {
  poetiqApplyContent();

  // Mobile nav toggle
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".site-nav__links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => navLinks.classList.toggle("is-open"));
  }

  // Cart drawer open/close
  document.querySelectorAll("[data-cart-open]").forEach((btn) =>
    btn.addEventListener("click", poetiqOpenCart)
  );
  document.querySelectorAll("[data-cart-close]").forEach((btn) =>
    btn.addEventListener("click", poetiqCloseCart)
  );
  const overlay = document.querySelector(".cart-overlay");
  if (overlay) overlay.addEventListener("click", poetiqCloseCart);

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Sound toggle: "Poet's Garden" original soundscape (Spotify embed, lazy-loaded)
  const soundToggle = document.getElementById("sound-toggle");
  const soundPanel = document.getElementById("sound-panel");
  if (soundToggle && soundPanel) {
    soundToggle.addEventListener("click", () => {
      const isOpen = soundPanel.classList.toggle("is-open");
      soundToggle.classList.toggle("is-playing", isOpen);
      const slot = document.getElementById("sound-embed-slot");
      if (isOpen && slot && !slot.hasChildNodes()) {
        const iframe = document.createElement("iframe");
        iframe.src = "https://open.spotify.com/embed/album/3Sd0hAXzAASuEsbJ8LBO5N?utm_source=generator&theme=0";
        iframe.width = "100%";
        iframe.height = "352";
        iframe.style.border = "0";
        iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        iframe.loading = "lazy";
        slot.appendChild(iframe);
      }
    });
    document.addEventListener("click", (e) => {
      if (!soundPanel.contains(e.target) && !soundToggle.contains(e.target)) {
        soundPanel.classList.remove("is-open");
        soundToggle.classList.remove("is-playing");
      }
    });
  }

  // Shop page: build product grid + wire add-to-cart
  const shopGrid = document.querySelector("[data-shop-grid]");
  if (shopGrid) {
    shopGrid.innerHTML = POETIQ_PRODUCTS.map(
      (p, i) => `
      <article class="product-card">
        ${
          p.photo
            ? `<div class="product-card__media has-photo${p.photoStyle === "lifestyle" ? " is-lifestyle" : ""}">
                <img src="${p.photo}" alt="${p.name}, ${p.size}">
              </div>`
            : `<div class="product-card__media" style="background:var(--${p.tone})">
                <div>
                  <img class="symbol symbol--light" src="/assets/brand/symbol-dark.png" alt="">
                  <p class="product-card__media-label">${p.name}</p>
                  <p class="product-card__size">${p.size}</p>
                </div>
              </div>`
        }
        <div class="product-card__body">
          <h3 class="product-card__name">${p.name} <span class="product-card__size product-card__size--inline">${p.size}</span></h3>
          <p class="product-card__desc">${p.desc}</p>
          <div class="field-row">
            <select class="scent-select" id="scent-${p.id}">
              ${POETIQ_SCENTS.map((s) => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
          <div class="field-row" style="justify-content:space-between;align-items:center;">
            <span class="product-card__price">${poetiqFormatBaht(p.price)}</span>
            <div class="qty-control">
              <button type="button" data-shop-qty-minus="${i}" aria-label="Decrease quantity">&minus;</button>
              <input type="text" readonly value="1" id="qty-${p.id}" aria-label="Quantity">
              <button type="button" data-shop-qty-plus="${i}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button type="button" class="btn btn--block" data-add-to-cart="${p.id}">Add to Bag</button>
        </div>
      </article>
    `
    ).join("");

    shopGrid.querySelectorAll("[data-shop-qty-minus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = POETIQ_PRODUCTS[Number(btn.getAttribute("data-shop-qty-minus"))].id;
        const input = document.getElementById(`qty-${id}`);
        input.value = Math.max(1, Number(input.value) - 1);
      });
    });
    shopGrid.querySelectorAll("[data-shop-qty-plus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = POETIQ_PRODUCTS[Number(btn.getAttribute("data-shop-qty-plus"))].id;
        const input = document.getElementById(`qty-${id}`);
        input.value = Number(input.value) + 1;
      });
    });
    shopGrid.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-add-to-cart");
        const scent = document.getElementById(`scent-${id}`).value;
        const qty = Number(document.getElementById(`qty-${id}`).value);
        poetiqAddToCart(id, scent, qty);
      });
    });
  }

  poetiqRenderCart();
}

document.addEventListener("DOMContentLoaded", () => {
  Promise.all([poetiqLoadContent(), poetiqLoadProducts()]).then(([content, products]) => {
    window.POETIQ_CONTENT = content;
    window.POETIQ_PRODUCTS = products.products || [];
    window.POETIQ_SCENTS = products.scents || [];
    poetiqInit();
    document.dispatchEvent(new CustomEvent("poetiq:ready"));
  });
});
