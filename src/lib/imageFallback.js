// Any <img> that fails to load (expired CDN link, missing file) is swapped for
// a neutral placeholder instead of the browser's broken-image icon + alt text.
// Components with their own fallback chain get a moment to switch src first.
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#F1F5F9"/>' +
      '<g fill="none" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="14" y="15" width="20" height="18" rx="2.5"/><circle cx="20.5" cy="21.5" r="1.8"/>' +
      '<path d="M34 28l-5-5-9 9"/></g></svg>'
  )

export function installImageFallback() {
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target
      if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return
      const failedSrc = img.src
      window.setTimeout(() => {
        if (!img.isConnected || img.src !== failedSrc) return
        img.dataset.fallbackApplied = 'true'
        img.alt = ''
        img.src = PLACEHOLDER
        img.style.objectFit = 'cover'
      }, 60)
    },
    true
  )
}
