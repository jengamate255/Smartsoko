// Firebase serves the pages; the existing Vercel project runs the Node API.
// Local development and pages served by Vercel keep same-origin requests.
(() => {
  const hostedPages = new Set(['smartsoko.tz', 'www.smartsoko.tz', 'fooddelievry-dce15.web.app', 'fooddelievry-dce15.firebaseapp.com']);
  if (!hostedPages.has(location.hostname)) return;
  const apiOrigin = 'https://fooddeliveryapp-indol.vercel.app';
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin === location.origin && (url.pathname === '/api' || url.pathname.startsWith('/api/'))) {
      const target = apiOrigin + url.pathname + url.search;
      input = input instanceof Request ? new Request(target, input) : target;
    }
    return fetchOriginal(input, options);
  };
})();
