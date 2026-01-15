/**
 * Initialize back link navigation that remembers the original source page
 * @param linkId - ID of the back link element
 * @param storageKey - sessionStorage key for storing the source URL
 * @param fallbackUrl - URL to navigate to if no source is stored
 */
export function initBackNavigation(
  linkId: string = 'back-link',
  storageKey: string = 'postListSource',
  fallbackUrl: string = '/blog'
): void {
  const backLink = document.getElementById(linkId);

  // Check if we came from a list page (not another post)
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      const isFromSameSite = referrerUrl.origin === window.location.origin;
      const isFromPost = referrerUrl.pathname.startsWith('/blog/') && referrerUrl.pathname !== '/blog/';

      // Only store if coming from a list page, not from another post
      if (isFromSameSite && !isFromPost) {
        sessionStorage.setItem(storageKey, document.referrer);
      }
    } catch {
      // Invalid referrer URL, ignore
    }
  }

  backLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const source = sessionStorage.getItem(storageKey);
    if (source) {
      window.location.href = source;
    } else {
      window.location.href = fallbackUrl;
    }
  });
}
