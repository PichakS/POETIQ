/* Poetiq — on-page inline editor.
   If you're logged in (via Netlify Identity), a small "Edit Page" button
   appears bottom-left. Turn it on and pencil icons appear on the actual
   text/photos — click one, change it, save. Writes go straight to GitHub
   through Netlify's Git Gateway, the same thing /admin uses, so the two
   never conflict. /admin still exists as a fallback for bulk edits. */
(function () {
  const REPO = "PichakS/POETIQ";
  const BRANCH = "main";
  const API = "/.netlify/git/github/repos/" + REPO;
  const EXCLUDE_SELECTOR = ".site-header, .site-footer, .cart-drawer, .sound-panel, .sound-toggle";

  let identity = null;
  let currentUser = null;
  let editMode = false;

  // ---------------------------------------------------------------------
  // Identity bootstrap
  // ---------------------------------------------------------------------
  function loadIdentityWidget() {
    return new Promise((resolve) => {
      if (window.netlifyIdentity) return resolve(window.netlifyIdentity);
      const s = document.createElement("script");
      s.src = "https://identity.netlify.com/v1/netlify-identity-widget.js";
      s.onload = () => resolve(window.netlifyIdentity);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  // ---------------------------------------------------------------------
  // UTF-8 safe base64 (site copy includes Thai text)
  // ---------------------------------------------------------------------
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }
  function base64ToUtf8(b64) {
    const binary = atob(b64.replace(/\n/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------------------------------------------------------------------
  // Git Gateway file read/write
  // ---------------------------------------------------------------------
  function authHeaders() {
    if (!currentUser) {
      return Promise.reject(new Error("You've been logged out — refresh the page and log in again."));
    }
    // Force a refresh check rather than trusting a possibly-expired cached token.
    return currentUser.jwt(true).then((token) => ({
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    }));
  }

  function getFile(path) {
    return authHeaders().then((headers) =>
      fetch(API + "/contents/" + path + "?ref=" + BRANCH, { headers }).then((r) => {
        if (!r.ok) throw new Error("Couldn't read " + path + " (" + r.status + ")");
        return r.json();
      })
    );
  }

  function putFile(path, contentStr, sha, message) {
    return authHeaders().then((headers) =>
      fetch(API + "/contents/" + path, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: message,
          content: utf8ToBase64(contentStr),
          sha: sha,
          branch: BRANCH,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Couldn't save " + path + " (" + r.status + ")");
        return r.json();
      })
    );
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function putImage(path, dataUrl) {
    const base64 = dataUrl.split(",")[1];
    return authHeaders().then((headers) =>
      fetch(API + "/contents/" + path, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: "Upload " + path,
          content: base64,
          branch: BRANCH,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Couldn't upload photo (" + r.status + ")");
        return r.json();
      })
    );
  }

  function setAtPath(obj, dotPath, value) {
    const keys = dotPath.split(".");
    let target = obj;
    for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
    target[keys[keys.length - 1]] = value;
  }
  function getAtPath(obj, dotPath) {
    return dotPath.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  // ---------------------------------------------------------------------
  // Toast + modal UI
  // ---------------------------------------------------------------------
  function toast(msg, isError) {
    const el = document.createElement("div");
    el.className = "poetiq-toast" + (isError ? " is-error" : "");
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-shown"));
    setTimeout(() => {
      el.classList.remove("is-shown");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function openModal({ title, hint, inputType, initialValue, onSave }) {
    const overlay = document.createElement("div");
    overlay.className = "poetiq-editor-overlay";
    const isTextarea = inputType !== "number";
    overlay.innerHTML = `
      <div class="poetiq-editor-modal">
        <h4>${title}</h4>
        ${hint ? `<p class="poetiq-editor-hint">${hint}</p>` : ""}
        ${
          isTextarea
            ? `<textarea class="poetiq-editor-input"></textarea>`
            : `<input class="poetiq-editor-input" type="number">`
        }
        <div class="poetiq-editor-actions">
          <button type="button" class="btn btn--ghost poetiq-editor-cancel">Cancel</button>
          <button type="button" class="btn poetiq-editor-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector(".poetiq-editor-input");
    input.value = initialValue;
    input.focus();
    overlay.querySelector(".poetiq-editor-cancel").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector(".poetiq-editor-save").addEventListener("click", () => {
      const value = inputType === "number" ? Number(input.value) : input.value;
      const saveBtn = overlay.querySelector(".poetiq-editor-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
      Promise.resolve(onSave(value))
        .then(() => {
          overlay.remove();
          toast("Saved — live on the site within about a minute.");
          // Saving replaces the edited element's contents (innerHTML/textContent),
          // which also removes the pencil button living inside it — put it back.
          if (editMode) attachAllPencils();
        })
        .catch((err) => {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
          console.error("Poetiq editor save failed:", err);
          toast(err.message || "Something went wrong saving that.", true);
        });
    });
  }

  // Shared photo editor: crop position (9-point anchor grid) + optional zoom
  // + replace-photo, all previewed live before saving.
  function openMediaEditor({ title, currentSrc, currentPosition, currentZoom, showZoom, aspectRatio, onSave }) {
    const overlay = document.createElement("div");
    overlay.className = "poetiq-editor-overlay";
    const anchors = ["left top", "center top", "right top", "left center", "center center", "right center", "left bottom", "center bottom", "right bottom"];
    const startPosition = currentPosition || "center center";
    const startZoom = currentZoom || 1;
    overlay.innerHTML = `
      <div class="poetiq-editor-modal poetiq-media-modal">
        <h4>${title}</h4>
        <div class="poetiq-media-preview-wrap" style="aspect-ratio:${aspectRatio || "4/5"}">
          <img class="poetiq-media-preview" src="${currentSrc}">
        </div>
        <div class="poetiq-media-anchors">
          ${anchors.map((a) => `<button type="button" class="poetiq-media-anchor" data-pos="${a}" aria-label="Focus ${a}"></button>`).join("")}
        </div>
        ${showZoom ? `<div class="poetiq-media-zoom-row">Zoom<input type="range" class="poetiq-media-zoom" min="100" max="180" value="${Math.round(startZoom * 100)}"></div>` : ""}
        <div class="poetiq-media-upload-row">
          <button type="button" class="btn btn--ghost poetiq-media-upload">Change Photo</button>
          <input type="file" accept="image/*" class="poetiq-media-file" style="display:none">
        </div>
        <div class="poetiq-editor-actions">
          <button type="button" class="btn btn--ghost poetiq-editor-cancel">Cancel</button>
          <button type="button" class="btn poetiq-editor-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const preview = overlay.querySelector(".poetiq-media-preview");
    let chosenPosition = startPosition;
    let chosenZoom = startZoom;
    let chosenFile = null;

    preview.style.objectPosition = chosenPosition;
    if (showZoom) preview.style.transform = "scale(" + chosenZoom + ")";

    overlay.querySelectorAll(".poetiq-media-anchor").forEach((btn) => {
      if (btn.getAttribute("data-pos") === chosenPosition) btn.classList.add("is-selected");
      btn.addEventListener("click", () => {
        overlay.querySelectorAll(".poetiq-media-anchor").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        chosenPosition = btn.getAttribute("data-pos");
        preview.style.objectPosition = chosenPosition;
      });
    });

    const zoomInput = overlay.querySelector(".poetiq-media-zoom");
    if (zoomInput) {
      zoomInput.addEventListener("input", () => {
        chosenZoom = Number(zoomInput.value) / 100;
        preview.style.transform = "scale(" + chosenZoom + ")";
      });
    }

    const fileInput = overlay.querySelector(".poetiq-media-file");
    overlay.querySelector(".poetiq-media-upload").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      chosenFile = file;
      readFileAsDataUrl(file).then((dataUrl) => {
        preview.src = dataUrl;
      });
    });

    overlay.querySelector(".poetiq-editor-cancel").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector(".poetiq-editor-save").addEventListener("click", () => {
      const saveBtn = overlay.querySelector(".poetiq-editor-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
      Promise.resolve(onSave({ file: chosenFile, position: chosenPosition, zoom: chosenZoom }))
        .then(() => {
          overlay.remove();
          toast("Saved — live on the site within about a minute.");
          if (editMode) attachAllPencils();
        })
        .catch((err) => {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
          console.error("Poetiq editor save failed:", err);
          toast(err.message || "Something went wrong saving that.", true);
        });
    });
  }

  // ---------------------------------------------------------------------
  // Editing content/site.json (page copy)
  // ---------------------------------------------------------------------
  function editSiteField(dotPath, el) {
    const currentValue = getAtPath(window.POETIQ_CONTENT, dotPath) || "";
    openModal({
      title: "Edit text",
      hint: currentValue.includes("<") ? "This text contains formatting tags (like &lt;br&gt; or &lt;strong&gt;) — keep them if you want the same layout." : "",
      inputType: "text",
      initialValue: currentValue,
      onSave: (newValue) =>
        getFile("content/site.json").then(({ content, sha }) => {
          const data = JSON.parse(base64ToUtf8(content));
          setAtPath(data, dotPath, newValue);
          return putFile("content/site.json", JSON.stringify(data, null, 2) + "\n", sha, "Edit " + dotPath).then(() => {
            setAtPath(window.POETIQ_CONTENT, dotPath, newValue);
            el.innerHTML = newValue;
          });
        }),
    });
  }

  // ---------------------------------------------------------------------
  // Editing content/products.json (product fields + photos)
  // ---------------------------------------------------------------------
  function editProductField(index, field, el, isNumber) {
    const currentValue = POETIQ_PRODUCTS[index][field];
    openModal({
      title: "Edit " + field,
      inputType: isNumber ? "number" : "text",
      initialValue: currentValue,
      onSave: (newValue) =>
        getFile("content/products.json").then(({ content, sha }) => {
          const data = JSON.parse(base64ToUtf8(content));
          data.products[index][field] = newValue;
          return putFile("content/products.json", JSON.stringify(data, null, 2) + "\n", sha, "Edit product " + data.products[index].id + " " + field).then(() => {
            POETIQ_PRODUCTS[index][field] = newValue;
            if (field === "price") el.textContent = poetiqFormatBaht(newValue);
            else el.textContent = newValue;
          });
        }),
    });
  }

  function editProductPhoto(index, imgEl) {
    const product = POETIQ_PRODUCTS[index];
    const rect = imgEl.getBoundingClientRect();
    openMediaEditor({
      title: "Edit photo",
      currentSrc: product.photo,
      currentPosition: product.photoPosition || "center center",
      currentZoom: product.photoZoom || 1,
      showZoom: true,
      aspectRatio: rect.width && rect.height ? rect.width + "/" + rect.height : "4/5",
      onSave: ({ file, position, zoom }) => {
        const uploaded = file
          ? readFileAsDataUrl(file).then((dataUrl) => {
              const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
              const path = "assets/uploads/" + Date.now() + "-" + product.id + "." + ext;
              return putImage(path, dataUrl).then(() => "/" + path);
            })
          : Promise.resolve(null);

        return uploaded.then((newPath) =>
          getFile("content/products.json").then(({ content, sha }) => {
            const data = JSON.parse(base64ToUtf8(content));
            const p = data.products[index];
            if (newPath) p.photo = newPath;
            p.photoPosition = position;
            p.photoZoom = zoom;
            return putFile("content/products.json", JSON.stringify(data, null, 2) + "\n", sha, "Update photo for " + p.id).then(() => {
              if (newPath) {
                product.photo = newPath;
                imgEl.src = newPath;
              }
              product.photoPosition = position;
              product.photoZoom = zoom;
              imgEl.style.objectPosition = position;
              imgEl.style.transform = zoom !== 1 ? "scale(" + zoom + ")" : "";
            });
          })
        );
      },
    });
  }

  // ---------------------------------------------------------------------
  // Editing content/media.json (homepage teaser + about-page photography)
  // ---------------------------------------------------------------------
  function editMediaImage(key, imgEl) {
    const entry = (window.POETIQ_MEDIA && window.POETIQ_MEDIA[key]) || {};
    const rect = imgEl.getBoundingClientRect();
    openMediaEditor({
      title: "Edit photo",
      currentSrc: imgEl.currentSrc || imgEl.src,
      currentPosition: entry.position || "center center",
      showZoom: false,
      aspectRatio: rect.width && rect.height ? rect.width + "/" + rect.height : "4/5",
      onSave: ({ file, position }) => {
        const uploaded = file
          ? readFileAsDataUrl(file).then((dataUrl) => {
              const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
              const path = "assets/uploads/" + Date.now() + "-" + key + "." + ext;
              return putImage(path, dataUrl).then(() => "/" + path);
            })
          : Promise.resolve(null);

        return uploaded.then((newPath) =>
          getFile("content/media.json").then(({ content, sha }) => {
            const data = JSON.parse(base64ToUtf8(content));
            data[key] = { src: newPath || (data[key] && data[key].src) || imgEl.src, position };
            return putFile("content/media.json", JSON.stringify(data, null, 2) + "\n", sha, "Update photo " + key).then(() => {
              window.POETIQ_MEDIA[key] = data[key];
              if (newPath) imgEl.src = newPath;
              imgEl.style.objectPosition = position;
            });
          })
        );
      },
    });
  }

  // ---------------------------------------------------------------------
  // Site design (font pairing)
  // ---------------------------------------------------------------------
  function openDesignEditor() {
    const overlay = document.createElement("div");
    overlay.className = "poetiq-editor-overlay";
    overlay.innerHTML = `
      <div class="poetiq-editor-modal">
        <h4>Site fonts</h4>
        <div class="poetiq-editor-radios">
          <label><input type="radio" name="poetiq-font" value="classic"> Classic — Cormorant + Maitree (current)</label>
          <label><input type="radio" name="poetiq-font" value="warm"> Warm — Fraunces + Noto Serif Thai</label>
          <label><input type="radio" name="poetiq-font" value="modern"> Modern — Playfair Display + Noto Sans Thai</label>
        </div>
        <div class="poetiq-editor-actions">
          <button type="button" class="btn btn--ghost poetiq-editor-cancel">Cancel</button>
          <button type="button" class="btn poetiq-editor-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    fetch("/content/design.json").then((r) => r.json()).then((data) => {
      const radio = overlay.querySelector(`input[value="${data.fontPairing || "classic"}"]`);
      if (radio) radio.checked = true;
    });
    overlay.querySelector(".poetiq-editor-cancel").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector(".poetiq-editor-save").addEventListener("click", () => {
      const chosen = overlay.querySelector('input[name="poetiq-font"]:checked');
      if (!chosen) return;
      const saveBtn = overlay.querySelector(".poetiq-editor-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
      getFile("content/design.json")
        .then(({ content, sha }) => {
          const data = JSON.parse(base64ToUtf8(content));
          data.fontPairing = chosen.value;
          return putFile("content/design.json", JSON.stringify(data, null, 2) + "\n", sha, "Change font pairing to " + chosen.value);
        })
        .then(() => {
          overlay.remove();
          toast("Saved — reloading to preview…");
          setTimeout(() => location.reload(), 1200);
        })
        .catch((err) => {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
          console.error("Poetiq editor save failed:", err);
          toast(err.message || "Something went wrong saving that.", true);
        });
    });
  }

  // ---------------------------------------------------------------------
  // Pencil injection
  // ---------------------------------------------------------------------
  function makePencil(onClick, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "poetiq-pencil";
    btn.setAttribute("aria-label", label || "Edit");
    btn.textContent = "✏️";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function attachTextPencils() {
    document.querySelectorAll("[data-c]").forEach((el) => {
      if (el.closest(EXCLUDE_SELECTOR)) return;
      if (el.querySelector(":scope > .poetiq-pencil")) return;
      el.classList.add("poetiq-editable");
      el.appendChild(makePencil(() => editSiteField(el.getAttribute("data-c"), el), "Edit this text"));
    });
  }

  function attachProductPencils() {
    // Only the shop page renders .product-card in the same order as
    // POETIQ_PRODUCTS — the homepage shows a curated subset/order, so index
    // lookups there would edit the wrong product. Skip it there.
    if (!document.querySelector("[data-shop-grid]")) return;
    document.querySelectorAll(".product-card").forEach((card, index) => {
      if (!POETIQ_PRODUCTS[index]) return;
      const nameEl = card.querySelector(".product-card__name");
      const nameTextEl = nameEl && nameEl.querySelector(".product-card__name-text");
      const descEl = card.querySelector(".product-card__desc");
      const priceEl = card.querySelector(".product-card__price");
      const img = card.querySelector(".product-card__media img");
      if (nameEl && nameTextEl && !nameEl.querySelector(".poetiq-pencil")) {
        nameEl.classList.add("poetiq-editable");
        nameEl.appendChild(makePencil(() => editProductField(index, "name", nameTextEl), "Edit name"));
      }
      if (descEl && !descEl.querySelector(".poetiq-pencil")) {
        descEl.classList.add("poetiq-editable");
        descEl.appendChild(makePencil(() => editProductField(index, "desc", descEl), "Edit description"));
      }
      if (priceEl && !POETIQ_PRODUCTS[index].sizes && !priceEl.querySelector(".poetiq-pencil")) {
        priceEl.classList.add("poetiq-editable");
        priceEl.appendChild(makePencil(() => editProductField(index, "price", priceEl, true), "Edit price"));
      }
      if (img) {
        const media = card.querySelector(".product-card__media");
        if (media && !media.querySelector(".poetiq-pencil")) {
          media.classList.add("poetiq-editable");
          media.appendChild(makePencil(() => editProductPhoto(index, img), "Change photo"));
        }
      }
    });
  }

  function attachMediaPencils() {
    document.querySelectorAll("[data-media]").forEach((img) => {
      const frame = img.closest(".media-frame") || img.parentElement;
      if (!frame || frame.querySelector(".poetiq-pencil")) return;
      frame.style.position = frame.style.position || "relative";
      frame.appendChild(makePencil(() => editMediaImage(img.getAttribute("data-media"), img), "Edit photo"));
    });
  }

  function removeAllPencils() {
    document.querySelectorAll(".poetiq-pencil").forEach((p) => p.remove());
    document.querySelectorAll(".poetiq-editable").forEach((el) => el.classList.remove("poetiq-editable"));
  }

  function attachAllPencils() {
    attachTextPencils();
    attachProductPencils();
    attachMediaPencils();
  }

  // ---------------------------------------------------------------------
  // Floating toggle
  // ---------------------------------------------------------------------
  function setupToggle() {
    if (document.querySelector(".poetiq-edit-fab")) return;
    const wrap = document.createElement("div");
    wrap.className = "poetiq-edit-fab-wrap";
    wrap.innerHTML = `
      <button type="button" class="poetiq-edit-fab">✏️ Edit Page</button>
      <button type="button" class="poetiq-design-fab" aria-label="Site fonts">🎨</button>
      <button type="button" class="poetiq-logout-fab" aria-label="Log out">Log Out</button>
    `;
    document.body.appendChild(wrap);
    const editBtn = wrap.querySelector(".poetiq-edit-fab");
    editBtn.addEventListener("click", () => {
      editMode = !editMode;
      document.body.classList.toggle("poetiq-edit-mode", editMode);
      editBtn.textContent = editMode ? "✓ Done Editing" : "✏️ Edit Page";
      if (editMode) attachAllPencils();
      else removeAllPencils();
    });
    wrap.querySelector(".poetiq-design-fab").addEventListener("click", openDesignEditor);
    wrap.querySelector(".poetiq-logout-fab").addEventListener("click", () => identity.logout());
  }

  function teardownToggle() {
    const wrap = document.querySelector(".poetiq-edit-fab-wrap");
    if (wrap) wrap.remove();
    document.body.classList.remove("poetiq-edit-mode");
    removeAllPencils();
    editMode = false;
  }

  // Quiet footer link so she can get back in on a normal visit, without
  // needing to remember a /admin URL. Only shown when logged out.
  function setupLoginLink() {
    if (document.querySelector(".poetiq-login-link")) return;
    const footer = document.querySelector(".footer-legal");
    if (!footer) return;
    const link = document.createElement("a");
    link.href = "#";
    link.className = "poetiq-login-link";
    link.textContent = "Editor Login";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      identity.open();
    });
    footer.appendChild(document.createElement("br"));
    footer.appendChild(link);
  }

  function removeLoginLink() {
    const link = document.querySelector(".poetiq-login-link");
    if (link) {
      if (link.previousSibling && link.previousSibling.tagName === "BR") link.previousSibling.remove();
      link.remove();
    }
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  function boot() {
    loadIdentityWidget().then((widget) => {
      if (!widget) return;
      identity = widget;
      identity.on("init", (user) => {
        currentUser = user;
        if (user) setupToggle();
        else setupLoginLink();
      });
      identity.on("login", (user) => {
        currentUser = user;
        removeLoginLink();
        setupToggle();
        identity.close();
      });
      identity.on("logout", () => {
        currentUser = null;
        teardownToggle();
        setupLoginLink();
      });
      identity.init();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  // Re-attach product pencils whenever the shop grid re-renders after data loads
  document.addEventListener("poetiq:ready", () => {
    if (editMode) attachAllPencils();
  });
})();
