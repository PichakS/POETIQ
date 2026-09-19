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

// Applies any [data-media] photo whose key exists in POETIQ_MEDIA (see
// js/media.js / content/media.json). Elements keep their original src as a
// fallback if a key is missing or the fetch failed.
function poetiqApplyMedia() {
  if (typeof POETIQ_MEDIA === "undefined") return;
  document.querySelectorAll("[data-media]").forEach((img) => {
    const entry = POETIQ_MEDIA[img.getAttribute("data-media")];
    if (!entry) return;
    if (entry.src) img.src = entry.src;
    if (entry.position) img.style.objectPosition = entry.position;
  });
}

function poetiqInit() {
  poetiqApplyContent();
  poetiqApplyMedia();

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

  // Sound toggle: "Poet's Garden" original soundscape. Uses Spotify's iFrame
  // API (not a plain <iframe>) so playback position can be saved and resumed
  // when navigating to a new page — a full page load always destroys the
  // previous player, so this is a "pick up where it left off" resume, not
  // truly gapless audio, but it keeps the music going instead of restarting.
  const soundToggle = document.getElementById("sound-toggle");
  const soundPanel = document.getElementById("sound-panel");
  if (soundToggle && soundPanel) {
    const SOUND_URI = "spotify:album:3Sd0hAXzAASuEsbJ8LBO5N";
    const SOUND_STATE_KEY = "poetiq_sound_state";

    function poetiqSaveSoundState(isPaused, position) {
      try {
        sessionStorage.setItem(SOUND_STATE_KEY, JSON.stringify({ isPaused, position }));
      } catch (e) {}
    }
    function poetiqLoadSoundState() {
      try {
        return JSON.parse(sessionStorage.getItem(SOUND_STATE_KEY) || "null");
      } catch (e) {
        return null;
      }
    }

    let controller = null;
    let initializing = false;
    // Browsers block autoplay without a real click, so a page-load resume
    // attempt often lands here paused even though we asked it to play —
    // track the REAL state so the toggle button always does the right thing
    // next click, instead of trusting whether the panel happens to be open.
    let lastIsPaused = true;
    let lastKnownGood = { isPaused: true, position: 0 };
    let leavingPage = false;

    // Navigating away makes the Spotify iframe report one last "paused"
    // update as it tears down, arriving around the same time as the page
    // unload. Left alone, that overwrites the "it was playing" state right
    // before it's needed. Freeze it as soon as unload starts instead.
    window.addEventListener("beforeunload", () => {
      leavingPage = true;
      poetiqSaveSoundState(lastKnownGood.isPaused, lastKnownGood.position);
    });

    function setupController(startPositionMs, autoplay) {
      if (initializing || controller) return;
      initializing = true;
      const slot = document.getElementById("sound-embed-slot");
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        IFrameAPI.createController(slot, { uri: SOUND_URI, width: "100%", height: 352 }, (c) => {
          controller = c;
          controller.addListener("ready", () => {
            if (startPositionMs) controller.seek(Math.floor(startPositionMs / 1000));
            if (autoplay) controller.play();
          });
          controller.addListener("playback_update", (e) => {
            lastIsPaused = e.data.isPaused;
            soundToggle.classList.toggle("is-playing", !e.data.isPaused);
            if (leavingPage) return;
            lastKnownGood = { isPaused: e.data.isPaused, position: e.data.position };
            poetiqSaveSoundState(e.data.isPaused, e.data.position);
          });
        });
      };
      const script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      document.body.appendChild(script);
    }

    soundToggle.addEventListener("click", () => {
      if (!controller) {
        soundPanel.classList.add("is-open");
        setupController(0, true);
        return;
      }
      if (lastIsPaused) {
        soundPanel.classList.add("is-open");
        controller.play();
      } else {
        soundPanel.classList.remove("is-open");
        controller.pause();
      }
    });

    document.addEventListener("click", (e) => {
      if (!soundPanel.contains(e.target) && !soundToggle.contains(e.target)) {
        soundPanel.classList.remove("is-open");
      }
    });

    // Resume music that was playing when the visitor navigated here. This
    // may get blocked by the browser's autoplay policy (no click has
    // happened yet on this fresh page) — if so, playback_update reports
    // isPaused:true and the toggle button's next click (a real gesture)
    // will correctly resume it instead of mistakenly closing the panel.
    const savedSound = poetiqLoadSoundState();
    if (savedSound && savedSound.isPaused === false) {
      soundPanel.classList.add("is-open");
      setupController(savedSound.position, true);
    }
  }

  // Shop page: build product grid + wire add-to-cart
  const shopGrid = document.querySelector("[data-shop-grid]");
  if (shopGrid) {
    shopGrid.innerHTML = POETIQ_PRODUCTS.map(
      (p, i) => {
        const defaultSize = p.size || (p.sizes && p.sizes[0].size) || "";
        const defaultPrice = p.sizes ? p.sizes[0].price : p.price;
        return `
      <article class="product-card">
        ${
          p.photo
            ? `<div class="product-card__media has-photo${p.photoStyle === "lifestyle" ? " is-lifestyle" : ""}">
                ${p.photoStyle !== "scene" ? "" : `<div class="product-card__media-bg" style="background-image:url('${p.photo}')"></div>`}
                <img src="${p.photo}" alt="${p.name}, ${defaultSize}" style="object-position:${p.photoPosition || "center center"};${p.photoZoom && p.photoZoom !== 1 ? " transform:scale(" + p.photoZoom + ");" : ""}">
              </div>`
            : `<div class="product-card__media" style="background:var(--${p.tone})">
                <div>
                  <img class="symbol symbol--light" src="/assets/brand/symbol-dark.png" alt="">
                  <p class="product-card__media-label">${p.name}</p>
                  <p class="product-card__size">${defaultSize}</p>
                </div>
              </div>`
        }
        <div class="product-card__body">
          <h3 class="product-card__name"><span class="product-card__name-text">${p.name}</span> ${p.size ? `<span class="product-card__size product-card__size--inline">${p.size}</span>` : ""}</h3>
          <p class="product-card__desc">${p.desc}</p>
          ${
            p.sizes
              ? `<div class="field-row">
                  <select class="scent-select" id="size-${p.id}" data-size-select="${p.id}">
                    ${p.sizes.map((s, si) => `<option value="${si}">${s.size}</option>`).join("")}
                  </select>
                </div>`
              : ""
          }
          <div class="field-row">
            <select class="scent-select" id="scent-${p.id}">
              ${POETIQ_SCENTS.map((s) => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </div>
          <div class="field-row" style="justify-content:space-between;align-items:center;">
            <span class="product-card__price" id="price-${p.id}">${poetiqFormatBaht(defaultPrice)}</span>
            <div class="qty-control">
              <button type="button" data-shop-qty-minus="${i}" aria-label="Decrease quantity">&minus;</button>
              <input type="text" readonly value="1" id="qty-${p.id}" aria-label="Quantity">
              <button type="button" data-shop-qty-plus="${i}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button type="button" class="btn btn--block" data-add-to-cart="${p.id}">Add to Bag</button>
        </div>
      </article>
    `;
      }
    ).join("");

    shopGrid.querySelectorAll("[data-size-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const id = select.getAttribute("data-size-select");
        const product = POETIQ_PRODUCTS.find((p) => p.id === id);
        const chosen = product.sizes[Number(select.value)];
        document.getElementById(`price-${id}`).textContent = poetiqFormatBaht(chosen.price);
      });
    });

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
        const product = POETIQ_PRODUCTS.find((p) => p.id === id);
        const sizeOverride = product.sizes
          ? product.sizes[Number(document.getElementById(`size-${id}`).value)]
          : null;
        poetiqAddToCart(id, scent, qty, sizeOverride);
      });
    });
  }

  poetiqRenderCart();
}

document.addEventListener("DOMContentLoaded", () => {
  Promise.all([poetiqLoadContent(), poetiqLoadProducts(), poetiqLoadMedia()]).then(([content, products, media]) => {
    window.POETIQ_CONTENT = content;
    window.POETIQ_PRODUCTS = products.products || [];
    window.POETIQ_SCENTS = products.scents || [];
    window.POETIQ_MEDIA = media || {};
    poetiqInit();
    document.dispatchEvent(new CustomEvent("poetiq:ready"));
  });
});
