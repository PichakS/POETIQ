# Poetiq website

Public shop site for POETIQ HOUSE (Thai-Lanna home fragrance, made in Chiang Mai — candles, reed diffusers, room sprays, car perfume, sachets; "Forest Bathing Collection"). Owner/admin: Gammpetch (not a professional developer — explain things plainly, mechanism first).

## Stack
- Plain static HTML/CSS/JS. **No build step, no framework, no npm.**
- Pages: `index.html`, `shop.html`, `about.html`, `contact.html`, `checkout.html`, `order-received.html`.
- `css/style.css`, `js/` (`cart.js`, `content.js`, `design.js`, `editor.js`, `main.js`, `media.js`, `products.js`).
- Hosted on Netlify: https://poetiq-house.netlify.app (site id in `.netlify/state.json`, which is gitignored).
- GitHub repo: `github.com/PichakS/POETIQ`, branch `main`. Netlify deploys from `main` — pushing = going live.

## How content works
- All wording is in `content/site.json`; elements in the HTML carry `data-c="section.key"` and `js/content.js` fills them in.
- Products/scents are in `content/products.json` (id, name, size, price in THB, photo paths). **Edit data there, not in `js/products.js`.**
- Design tokens/fonts in `content/design.json`; media in `content/media.json`.
- `/admin` is a Netlify CMS (Decap) editor (`admin/config.yml`, backend `git-gateway`). Edits made there create commits on `main` — so always `git pull` before working locally, or you will conflict with CMS edits.
- If you add a new editable string, add both the `data-c` attribute and the field in `admin/config.yml`, or the CMS can't edit it.

## Checkout
- No payment gateway. Cart lives in the browser; `checkout.html` submits a **Netlify Form** with the order as one text block. Customer then pays by PromptPay QR / Krungsri bank transfer (`assets/payment/`) and is contacted on LINE.
- Don't swap in a payment provider without asking.

## Working rules
- Product photos: cutout on clean white with margins for product shots; lifestyle "scene" photos for the shop page (`photoStyle` / `shopPhotoStyle` in products.json).
- Mobile: one product card per row.
- Bilingual (English + Thai). Fonts: Cormorant, Maitree, Fraunces, Noto Serif/Sans Thai, Playfair Display.
- Footer legal line: Poetiq House Co., Ltd. (บริษัท โพเอทิค เฮ้าส์ จำกัด) — don't reword without asking.
- Commit small, descriptive messages (see `git log`). Don't push without the owner saying so — push publishes the live site.

## Setting up on a new computer
`git clone https://github.com/PichakS/POETIQ.git` then open the folder in Claude Code. To preview: open `index.html` or run `python3 -m http.server` in the folder (needed for `/content/*.json` fetches to work).
