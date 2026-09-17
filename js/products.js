/* Poetiq — loads products/scents from content/products.json, which is what
   the CMS at /admin edits. Don't edit product data here — edit
   content/products.json (directly, or through /admin) instead. */
function poetiqLoadProducts() {
  return fetch("/content/products.json")
    .then((r) => r.json())
    .catch(() => ({ products: [], scents: [] }));
}

function poetiqFormatBaht(amount) {
  return "฿" + amount.toLocaleString("en-US");
}
