function poetiqLoadMedia() {
  return fetch("/content/media.json")
    .then((r) => r.json())
    .catch(() => ({}));
}
