/* Poetiq — loads all site copy from content/site.json, which is what the
   CMS at /admin edits. Don't edit wording here — edit content/site.json
   (directly, or through /admin) instead. */
function poetiqLoadContent() {
  return fetch("/content/site.json")
    .then((r) => r.json())
    .catch(() => ({}));
}
