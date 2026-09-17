/* Poetiq — applies the font pairing chosen in content/design.json (editable
   via the CMS at /admin). Only vetted pairings are selectable — this never
   accepts arbitrary CSS, just a named choice. */
(function () {
  var PAIRINGS = {
    classic: {
      heading: '"Cormorant", "Maitree", serif',
      thaiHeading: '"Maitree", serif',
      body: '"Noto Sans Thai", "Noto Sans", sans-serif',
    },
    warm: {
      heading: '"Fraunces", "Noto Serif Thai", serif',
      thaiHeading: '"Noto Serif Thai", serif',
      body: '"Noto Sans Thai", "Noto Sans", sans-serif',
    },
    modern: {
      heading: '"Playfair Display", "Noto Sans Thai", serif',
      thaiHeading: '"Noto Sans Thai", sans-serif',
      body: '"Noto Sans Thai", "Noto Sans", sans-serif',
    },
  };

  fetch("/content/design.json")
    .then((r) => r.json())
    .catch(() => ({}))
    .then((data) => {
      var chosen = PAIRINGS[data && data.fontPairing] || PAIRINGS.classic;
      var style = document.createElement("style");
      style.textContent =
        ":root{--font-heading:" + chosen.heading +
        ";--font-thai-heading:" + chosen.thaiHeading +
        ";--font-body:" + chosen.body + ";}";
      document.head.appendChild(style);
    });
})();
