/** Shared transport for merchant requests. Mutations are never automatically replayed. */
export async function merchantRequest(path, options = {}) {
  const user = window.auth?.currentUser;
  if (!user) throw Object.assign(new Error('Your session has ended. Sign in to continue.'), { status: 401 });
  const { timeoutMs = 20000, ...requestOptions } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let rejectOnAbort;
  try {
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const interrupted = new Promise((_, reject) => {
      rejectOnAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
    });
    const token = await Promise.race([user.getIdToken(), interrupted]);
    const headers = new Headers(options.headers);
    headers.set('Authorization', 'Bearer ' + token);
    headers.set('Accept', 'application/json');
    if (options.body != null && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch('/api/merchant' + path, {
      ...requestOptions, headers, signal: controller.signal, cache: 'no-store',
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success === false) {
      const fallback = response.status === 401 ? 'Your session has expired. Sign in again.'
        : response.status === 403 ? 'You do not have permission to perform this action.'
        : `Request failed (${response.status}). Please try again.`;
      throw Object.assign(new Error(typeof body?.error === 'string' ? body.error : fallback), {
        status: response.status, code: body?.code,
      });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('The server returned an invalid response. Please try again.');
    return body;
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new Error('The request timed out. Refresh to check the latest state before trying again.');
    }
    if (error instanceof TypeError) throw new Error('Cannot reach the server. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    if (rejectOnAbort) controller.signal.removeEventListener('abort', rejectOnAbort);
    options.signal?.removeEventListener('abort', abort);
  }
}
