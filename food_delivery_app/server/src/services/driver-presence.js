'use strict';
function position(driver, now = Date.now()) {
    const rawLat = driver.currentLatitude ?? driver.current_latitude ?? driver.location?.latitude;
    const rawLng =
        driver.currentLongitude ?? driver.current_longitude ?? driver.location?.longitude;
    const lat = rawLat == null ? NaN : Number(rawLat),
        lng = rawLng == null ? NaN : Number(rawLng);
    const raw = driver.lastLocationUpdate ?? driver.last_location_update;
    const timestamp = raw && typeof raw === 'object' ? Number(raw.seconds) * 1000 : Date.parse(raw);
    const age = now - timestamp;
    const fresh = Number.isFinite(age) && age >= -30000 && age < 120000;
    const valid =
        Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180;
    const online =
        driver.isOnline ?? driver.is_online ?? ['online', 'busy'].includes(driver.status);
    return {
        ...driver,
        currentLatitude: valid ? lat : null,
        currentLongitude: valid ? lng : null,
        locationFresh: fresh && valid,
        locationUpdatedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
        status: !online
            ? 'offline'
            : !fresh || !valid
              ? 'stale'
              : driver.status === 'busy'
                ? 'busy'
                : 'online',
    };
}
module.exports = { position };
