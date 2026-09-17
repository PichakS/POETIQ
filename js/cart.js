/* Poetiq — localStorage cart. No backend; cart lives in the customer's browser
   until they submit the order form on checkout.html. */

const POETIQ_CART_KEY = "poetiq_cart_v1";

function poetiqGetCart() {
  try {
    const raw = localStorage.getItem(POETIQ_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function poetiqSaveCart(cart) {
  try {
    localStorage.setItem(POETIQ_CART_KEY, JSON.stringify(cart));
  } catch (e) {
    /* private-browsing or storage disabled: cart just won't persist across reloads */
  }
  poetiqRenderCart();
}

function poetiqAddToCart(productId, scent, qty, sizeOverride) {
  const product = POETIQ_PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  const size = sizeOverride ? sizeOverride.size : product.size;
  const price = sizeOverride ? sizeOverride.price : product.price;
  const cart = poetiqGetCart();
  const existing = cart.find(
    (line) => line.productId === productId && line.scent === scent && line.size === size
  );
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      productId,
      name: product.name,
      size,
      price,
      scent,
      qty,
    });
  }
  poetiqSaveCart(cart);
  poetiqOpenCart();
}

function poetiqRemoveLine(index) {
  const cart = poetiqGetCart();
  cart.splice(index, 1);
  poetiqSaveCart(cart);
}

function poetiqSetQty(index, qty) {
  const cart = poetiqGetCart();
  if (!cart[index]) return;
  cart[index].qty = Math.max(1, qty);
  poetiqSaveCart(cart);
}

function poetiqCartSubtotal(cart) {
  return cart.reduce((sum, line) => sum + line.price * line.qty, 0);
}

function poetiqCartCount(cart) {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

function poetiqOpenCart() {
  const overlay = document.querySelector(".cart-overlay");
  const drawer = document.querySelector(".cart-drawer");
  if (overlay && drawer) {
    overlay.classList.add("is-open");
    drawer.classList.add("is-open");
  }
}

function poetiqCloseCart() {
  const overlay = document.querySelector(".cart-overlay");
  const drawer = document.querySelector(".cart-drawer");
  if (overlay && drawer) {
    overlay.classList.remove("is-open");
    drawer.classList.remove("is-open");
  }
}

function poetiqRenderCart() {
  const cart = poetiqGetCart();

  document.querySelectorAll(".cart-count").forEach((el) => {
    el.textContent = poetiqCartCount(cart);
  });

  const itemsWrap = document.querySelector(".cart-drawer__items");
  const subtotalEl = document.querySelector("[data-cart-subtotal]");
  const checkoutLink = document.querySelector("[data-cart-checkout]");

  if (itemsWrap) {
    itemsWrap.innerHTML = "";
    if (cart.length === 0) {
      itemsWrap.innerHTML = '<p class="cart-empty">Your bag is empty.<br>Explore the Forest Bathing Collection.</p>';
    } else {
      cart.forEach((line, index) => {
        const product = POETIQ_PRODUCTS.find((p) => p.id === line.productId) || {};
        const row = document.createElement("div");
        row.className = "cart-line";
        row.innerHTML = `
          <div class="cart-line__swatch" style="background:var(--${product.tone || "moss"})">
            <img class="symbol" src="/assets/brand/symbol-light.png" alt="">
          </div>
          <div>
            <p class="cart-line__name">${line.name}</p>
            <p class="cart-line__meta">${line.size} &middot; ${line.scent}</p>
            <div class="field-row">
              <div class="qty-control">
                <button type="button" data-qty-minus="${index}" aria-label="Decrease quantity">&minus;</button>
                <input type="text" readonly value="${line.qty}" aria-label="Quantity">
                <button type="button" data-qty-plus="${index}" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="cart-line__remove" data-remove="${index}">Remove</button>
            </div>
          </div>
          <div class="cart-line__price">${poetiqFormatBaht(line.price * line.qty)}</div>
        `;
        itemsWrap.appendChild(row);
      });
    }
  }

  if (subtotalEl) subtotalEl.textContent = poetiqFormatBaht(poetiqCartSubtotal(cart));
  if (checkoutLink) {
    if (cart.length === 0) checkoutLink.setAttribute("disabled", "true");
    else checkoutLink.removeAttribute("disabled");
  }

  document.querySelectorAll(".cart-drawer__items").forEach((wrap) => {
    wrap.querySelectorAll("[data-qty-minus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-qty-minus"));
        const cart = poetiqGetCart();
        poetiqSetQty(i, cart[i].qty - 1 <= 0 ? 1 : cart[i].qty - 1);
      });
    });
    wrap.querySelectorAll("[data-qty-plus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-qty-plus"));
        const cart = poetiqGetCart();
        poetiqSetQty(i, cart[i].qty + 1);
      });
    });
    wrap.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        poetiqRemoveLine(Number(btn.getAttribute("data-remove")));
      });
    });
  });

  poetiqRenderOrderSummary(cart);
}

/* Checkout page: fill the read-only order summary + hidden form field so the
   Netlify form submission carries the order contents in one text block. */
function poetiqRenderOrderSummary(cart) {
  const summaryEl = document.querySelector("[data-order-summary]");
  const hiddenField = document.querySelector("#order-details");
  if (!summaryEl && !hiddenField) return;

  if (cart.length === 0) {
    if (summaryEl) summaryEl.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
    if (hiddenField) hiddenField.value = "";
    return;
  }

  const lines = cart.map(
    (l) => `${l.qty} x ${l.name} (${l.size}, ${l.scent}) - ${poetiqFormatBaht(l.price * l.qty)}`
  );
  const subtotal = poetiqCartSubtotal(cart);

  if (summaryEl) {
    summaryEl.innerHTML =
      lines.map((l) => `<div class="cart-subtotal-row"><span>${l}</span></div>`).join("") +
      `<div class="cart-subtotal-row" style="margin-top:12px;border-top:1px solid rgba(48,45,43,0.15);padding-top:12px;"><span>Subtotal</span><strong>${poetiqFormatBaht(subtotal)}</strong></div>`;
  }
  if (hiddenField) {
    hiddenField.value = lines.join("\n") + `\nSubtotal: ${poetiqFormatBaht(subtotal)}`;
  }
}

// Rendered once data has loaded — see main.js's poetiqInit(), which calls
// poetiqRenderCart() itself. No separate DOMContentLoaded listener here:
// POETIQ_PRODUCTS isn't populated yet at that point.
