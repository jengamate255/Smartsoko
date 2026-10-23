'use strict';
const fs = require('fs'),
    path = require('path');
function publicToken() {
    const configured = process.env.MAPBOX_PUBLIC_TOKEN || process.env.MAPBOX_TOKEN;
    if (configured) return configured.startsWith('pk.') ? configured : '';
    try {
        return (
            fs
                .readFileSync(
                    path.join(__dirname, '../../../public/config/mapbox-config.js'),
                    'utf8'
                )
                .match(/accessToken:\s*'(pk\.[^']+)'/)?.[1] || ''
        );
    } catch (_) {
        return '';
    }
}
let cache = null,
    expires = 0;
async function check(signal) {
    const token = publicToken();
    if (!token) return 'not_configured';
    if (cache && Date.now() < expires) return cache;
    try {
        const response = await fetch(
            'https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=' +
                encodeURIComponent(token),
            { signal: signal || AbortSignal.timeout(4000) }
        );
        await response.body?.cancel();
        cache = response.ok
            ? 'connected'
            : [401, 403].includes(response.status)
              ? 'unauthorized'
              : 'degraded';
        expires = Date.now() + 60000;
        return cache;
    } catch (_) {
        return signal?.aborted ? 'timeout' : 'disconnected';
    }
}
module.exports = { publicToken, check };
