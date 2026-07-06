import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { merchantService } from '@/services/merchant';

const { width } = Dimensions.get('window');

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGQzOTY1MTUiLCJhIjoiY2xzN3g4d3ZsMGF5bjJscDh1b3B3eHh3MiJ9.example';

interface Delivery {
  id: string;
  orderId: string;
  customer: string;
  driver?: string;
  status: string;
  lng: number;
  lat: number;
  customerLng: number;
  customerLat: number;
}

export function MapTrackingScreen() {
  const webViewRef = useRef<WebView>(null);
  const [location, setLocation] = useState({ lng: 39.2795, lat: -6.7924 });
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const loadActiveOrders = useCallback(async () => {
    try {
      const orders = await merchantService.getOrders();
      const active = orders.filter(o =>
        ['preparing', 'ready', 'dispatched', 'delivered'].includes(o.status)
      );

      const activeDeliveries: Delivery[] = active.map(order => ({
        id: order.id,
        orderId: order.id.substring(0, 12),
        customer: order.customer_name,
        driver: order.driver_name,
        status: order.status,
        lng: order.delivery_lng || 39.2795 + (Math.random() - 0.5) * 0.02,
        lat: order.delivery_lat || -6.7924 + (Math.random() - 0.5) * 0.02,
        customerLng: order.delivery_lng || 39.2795 + (Math.random() - 0.5) * 0.02,
        customerLat: order.delivery_lat || -6.7924 + (Math.random() - 0.5) * 0.02,
      }));

      setDeliveries(activeDeliveries);

      if (mapReady && webViewRef.current) {
        const js = `
          if (window.updateDeliveries) {
            window.updateDeliveries(${JSON.stringify(activeDeliveries)});
          }
        `;
        webViewRef.current.injectJavaScript(js);
      }
    } catch (e) {
      console.error('Failed to load active orders:', e);
    } finally {
      setLoading(false);
    }
  }, [mapReady]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lng: loc.coords.longitude, lat: loc.coords.latitude });
      }
    })();
  }, []);

  useEffect(() => {
    loadActiveOrders();
    const interval = setInterval(loadActiveOrders, 10000);

    const sub = merchantService.subscribeToOrders(() => {
      loadActiveOrders();
    });

    return () => {
      clearInterval(interval);
      sub?.unsubscribe();
    };
  }, [loadActiveOrders]);

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'deliverySelected') {
        setSelectedDelivery(data.delivery);
      }
      if (data.type === 'mapReady') {
        setMapReady(true);
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  const focusOnLocation = () => {
    if (webViewRef.current && mapReady) {
      webViewRef.current.injectJavaScript(`
        if (window.flyToLocation) window.flyToLocation(${location.lng}, ${location.lat});
      `);
    }
  };

  const focusOnDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    if (webViewRef.current && mapReady) {
      webViewRef.current.injectJavaScript(`
        if (window.flyToLocation) window.flyToLocation(${delivery.lng}, ${delivery.lat});
      `);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#f59e0b';
      case 'dispatched': return '#22c55e';
      case 'delivered': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .marker {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; border: 3px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .restaurant-marker { background: #012d1d; }
    .driver-marker { background: #22c55e; }
    .driver-marker.ready { background: #f59e0b; }
    .driver-marker.preparing { background: #8b5cf6; }
    .driver-marker.delivered { background: #6b7280; }
    .mapboxgl-ctrl-attrib { font-size: 8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    mapboxgl.accessToken = '${MAPBOX_TOKEN}';

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [${location.lng}, ${location.lat}],
      zoom: 13,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', function() {
      window.parent.postMessage(JSON.stringify({ type: 'mapReady' }), '*');
    });

    new mapboxgl.Marker({ element: createMarker('store', 'restaurant-marker') })
      .setLngLat([${location.lng}, ${location.lat}])
      .addTo(map);

    function createMarker(icon, className) {
      const el = document.createElement('div');
      el.className = 'marker ' + className;
      el.innerHTML = getIconSVG(icon);
      return el;
    }

    function getIconSVG(name) {
      const icons = {
        store: '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>',
        delivery: '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
      };
      return icons[name] || '';
    }

    let markers = {};

    window.updateDeliveries = function(deliveries) {
      deliveries.forEach(function(d) {
        if (!markers[d.id]) {
          const el = createMarker('delivery', 'driver-marker ' + d.status);
          el.id = 'driver-' + d.id;
          el.onclick = function() {
            window.parent.postMessage(JSON.stringify({
              type: 'deliverySelected',
              delivery: d
            }), '*');
            map.flyTo({ center: [d.lng, d.lat], zoom: 14, duration: 1000 });
          };
          markers[d.id] = new mapboxgl.Marker({ element: el })
            .setLngLat([d.lng, d.lat])
            .addTo(map);
        } else {
          markers[d.id].setLngLat([d.lng, d.lat]);
          markers[d.id].getElement().className = 'marker driver-marker ' + d.status;
        }
      });
    };

    window.flyToLocation = function(lng, lat) {
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 500 });
    };
  </script>
</body>
</html>
  `;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#012d1d" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        onMessage={handleMapMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />

      {deliveries.length > 0 && (
        <View style={styles.cardContainer}>
          <View style={styles.deliveryCount}>
            <MaterialIcons name="delivery-dining" size={18} color="#fff" />
            <Text style={styles.deliveryCountText}>{deliveries.length} active deliveries</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {deliveries.map((delivery) => (
              <TouchableOpacity
                key={delivery.id}
                style={[
                  styles.deliveryCard,
                  selectedDelivery?.id === delivery.id && styles.deliveryCardSelected,
                ]}
                onPress={() => focusOnDelivery(delivery)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>{delivery.orderId}</Text>
                  <Text style={[styles.statusBadge, { color: getStatusColor(delivery.status) }]}>
                    {delivery.status}
                  </Text>
                </View>
                <Text style={styles.customerName}>{delivery.customer}</Text>
                {delivery.driver && (
                  <View style={styles.driverInfo}>
                    <MaterialIcons name="person" size={14} color="#6b7280" />
                    <Text style={styles.driverName}>{delivery.driver}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={styles.locateBtn} onPress={focusOnLocation}>
        <MaterialIcons name="my-location" size={24} color="#012d1d" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 12 },
  map: { flex: 1 },
  cardContainer: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  deliveryCount: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#012d1d', borderRadius: 12, padding: 10, marginBottom: 8,
  },
  deliveryCountText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  deliveryCard: {
    width: width * 0.7, marginLeft: 0, backgroundColor: '#fff', borderRadius: 16,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  deliveryCardSelected: { borderWidth: 2, borderColor: '#012d1d' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statusBadge: { fontSize: 10, fontWeight: 'bold' },
  customerName: { fontSize: 14, color: '#374151', marginBottom: 8 },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverName: { fontSize: 12, color: '#6b7280' },
  locateBtn: {
    position: 'absolute', right: 16, top: 80, width: 44, height: 44,
    borderRadius: 22, backgroundColor: '#fff', alignItems: 'center',
    justifyContent: 'center', elevation: 3,
  },
});