/** Shared transport for merchant requests. Mutations are never automatically replayed. */
export async function merchantRequest(path, options = {}) {
    const user = window.auth?.currentUser;
    if (!user)
        throw Object.assign(new Error('Your session has ended. Sign in to continue.'), {
            status: 401,
        });
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'GET' && window.merchantConnectionReady === false) {
        throw new Error(
            'Reconnect and refresh your store before making changes. Nothing was sent.'
        );
    }
    if (method !== 'GET' && window.merchantFreshReads) {
        const required = path.startsWith('/inventory/')
            ? '/inventory'
            : path.startsWith('/staff')
              ? '/staff'
              : path === '/payout'
                ? '/balance'
                : path === '/payout-details'
                  ? '/balance'
                  : path.startsWith('/purchases')
                    ? '/purchases'
                    : path.startsWith('/suppliers')
                      ? '/suppliers'
                      : path === '/config/low-stock-threshold'
                        ? path
                        : null;
        if (required && !window.merchantFreshReads.has(required))
            throw new Error('Refresh this section before making changes. Nothing was sent.');
    }
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
        if (window.merchantSelectedId) headers.set('x-merchant-id', window.merchantSelectedId);
        if (options.body != null && !(options.body instanceof FormData))
            headers.set('Content-Type', 'application/json');
        const response = await fetch('/api/merchant' + path, {
            ...requestOptions,
            headers,
            signal: controller.signal,
            cache: 'no-store',
        });
        const body = await response.json().catch(() => null);
        if (response.status === 404 && !body) {
            throw Object.assign(
                new Error(
                    'The merchant service is not available at this website address. Please contact support to connect the backend.'
                ),
                {
                    status: 404,
                    code: 'MERCHANT_API_UNAVAILABLE',
                }
            );
        }
        if (!response.ok || body?.success === false) {
            const fallback =
                response.status === 401
                    ? 'Your session has expired. Sign in again.'
                    : response.status === 403
                      ? 'You do not have permission to perform this action.'
                      : `Request failed (${response.status}). Please try again.`;
            throw Object.assign(
                new Error(typeof body?.error === 'string' ? body.error : fallback),
                {
                    status: response.status,
                    code: body?.code,
                }
            );
        }
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new Error('The server returned an invalid response. Please try again.');
        if (window.dispatchEvent && typeof CustomEvent === 'function')
            window.dispatchEvent(
                new CustomEvent('merchant:response', { detail: { path, method, body } })
            );
        return body;
    } catch (error) {
        if (window.dispatchEvent && typeof CustomEvent === 'function')
            window.dispatchEvent(
                new CustomEvent('merchant:failure', {
                    detail: { path, method, status: error.status, message: error.message },
                })
            );
        if (
            method === 'GET' &&
            path !== '/profile' &&
            !options.signal?.aborted &&
            (!error.status || error.status >= 500) &&
            window.merchantReadSnapshot
        ) {
            const snapshot = window.merchantReadSnapshot(path);
            if (snapshot) return { ...snapshot, stale: true };
        }
        if (controller.signal.aborted && !options.signal?.aborted) {
            throw new Error(
                'The request timed out. Refresh to check the latest state before trying again.'
            );
        }
        if (error instanceof TypeError)
            throw new Error('Cannot reach the server. Check your connection and try again.');
        throw error;
    } finally {
        clearTimeout(timer);
        if (rejectOnAbort) controller.signal.removeEventListener('abort', rejectOnAbort);
        options.signal?.removeEventListener('abort', abort);
    }
}
