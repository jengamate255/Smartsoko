/**
 * Mapbox Configuration
 * IMPORTANT: Use a PUBLIC access token (pk.*) for client-side, not secret key (sk.*)
 * Get your public token from: https://account.mapbox.com/access-tokens/
 */

const MAPBOX_CONFIG = {
  // Mapbox PUBLIC access token (client-side safe)
  // Secret keys (sk.*) should ONLY be used server-side
  // Replace with your public token from: https://account.mapbox.com/access-tokens/
  accessToken: 'pk.eyJ1IjoiZGF2ZXkxMDEiLCJhIjoiY2p1ZWc3aWh1MDJ5cjQ0cXd1ZXh2cmd2eCJ9.iE0RngMfwyivH7OrYO_Bag',

  // Default map style
  style: 'mapbox://styles/mapbox/streets-v12',

  // Default location (Dar es Salaam, Tanzania)
  defaultCenter: [39.2083, -6.7924], // [lng, lat]
  defaultZoom: 12,

  // Navigation settings
  navigationStyle: 'mapbox://styles/mapbox/streets-v12',
  navigationZoom: 13,

  // Map options
  options: {
    attributionControl: true,
    logoPosition: 'bottom-right',
    failIfMajorPerformanceCaveat: false
  }
};

/**
 * Get the Mapbox access token
 */
function getMapboxToken() {
  return MAPBOX_CONFIG.accessToken;
}

/**
 * Update the access token
 * @param {string} token - Your Mapbox public access token (pk.*)
 */
function setMapboxToken(token) {
  MAPBOX_CONFIG.accessToken = token;
  if (typeof mapboxgl !== 'undefined') {
    mapboxgl.accessToken = token;
  }
}

/**
 * Initialize Mapbox GL JS
 * @param {string} containerId - HTML element ID for the map
 * @param {Object} options - Additional map options
 */
function initMapbox(containerId, options = {}) {
  if (typeof mapboxgl === 'undefined') {
    console.error('Mapbox GL JS not loaded');
    return null;
  }

  mapboxgl.accessToken = getMapboxToken();

  const map = new mapboxgl.Map({
    container: containerId,
    style: options.style || MAPBOX_CONFIG.style,
    center: options.center || MAPBOX_CONFIG.defaultCenter,
    zoom: options.zoom || MAPBOX_CONFIG.defaultZoom,
    ...MAPBOX_CONFIG.options,
    ...options
  });

  // Add navigation controls
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Add geolocate control
  map.addControl(
    new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    }),
    'top-right'
  );

  return map;
}

/**
 * Add a marker to the map
 * @param {Object} map - Mapbox map instance
 * @param {Array} coords - [lng, lat]
 * @param {Object} options - Marker options
 */
function addMarker(map, coords, options = {}) {
  const el = document.createElement('div');
  el.className = options.className || 'map-marker';
  el.style.width = options.width || '30px';
  el.style.height = options.height || '30px';
  el.style.backgroundSize = 'contain';
  el.style.backgroundImage = options.icon ? `url(${options.icon})` : '';
  el.style.backgroundColor = options.color || '#012d1d';
  el.style.borderRadius = '50%';
  el.style.border = '3px solid white';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.cursor = 'pointer';

  const marker = new mapboxgl.Marker(el)
    .setLngLat(coords)
    .setPopup(
      options.popup
        ? new mapboxgl.Popup({ offset: 25 }).setHTML(options.popup)
        : null
    )
    .addTo(map);

  return marker;
}

/**
 * Draw a route between two points
 * @param {Object} map - Mapbox map instance
 * @param {Array} start - [lng, lat] start point
 * @param {Array} end - [lng, lat] end point
 * @param {string} color - Route line color
 */
async function drawRoute(map, start, end, color = '#012d1d') {
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?` +
      `geometries=geojson&access_token=${getMapboxToken()}`
    );

    const data = await response.json();

    if (data.routes && data.routes[0]) {
      const route = data.routes[0].geometry;

      // Add route source if not exists
      if (map.getSource('route')) {
        map.getSource('route').setData({
          type: 'Feature',
          properties: {},
          geometry: route
        });
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route
          }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': color,
            'line-width': 5,
            'line-opacity': 0.8
          }
        });
      }

      // Fit bounds to show entire route
      const bounds = new mapboxgl.LngLatBounds();
      route.coordinates.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 50 });

      return data.routes[0];
    }
  } catch (error) {
    console.error('Error drawing route:', error);
  }
  return null;
}

/**
 * Get user's current location
 * @returns {Promise} - Resolves with [lng, lat]
 */
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.longitude, position.coords.latitude]);
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Watch user's location continuously
 * @param {Function} callback - Called with [lng, lat] on each update
 * @returns {number} - Watch ID for clearing
 */
function watchLocation(callback) {
  if (!navigator.geolocation) {
    console.error('Geolocation not supported');
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback([position.coords.longitude, position.coords.latitude]);
    },
    (error) => {
      console.error('Location watch error:', error);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  );
}

/**
 * Calculate distance between two points (Haversine formula)
 * @param {Array} point1 - [lng, lat]
 * @param {Array} point2 - [lng, lat]
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = (point2[1] - point1[1]) * Math.PI / 180;
  const dLon = (point2[0] - point1[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1[1] * Math.PI / 180) * Math.cos(point2[1] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Export for use in other files (browser-compatible)
window.MAPBOX_CONFIG = MAPBOX_CONFIG;
window.getMapboxToken = getMapboxToken;
window.setMapboxToken = setMapboxToken;
window.initMapbox = initMapbox;
window.addMarker = addMarker;
window.drawRoute = drawRoute;
window.getCurrentLocation = getCurrentLocation;
window.watchLocation = watchLocation;
window.calculateDistance = calculateDistance;