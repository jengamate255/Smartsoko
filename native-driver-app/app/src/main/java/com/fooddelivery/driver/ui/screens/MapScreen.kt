package com.fooddelivery.driver.ui.screens

import android.graphics.Color
import android.location.Location
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.fooddelivery.driver.R
import com.fooddelivery.driver.data.model.Order
import com.fooddelivery.driver.network.RouteData
import com.fooddelivery.driver.network.RouteProvider
import com.fooddelivery.driver.util.AppConfig
import com.mapbox.geojson.Feature
import com.mapbox.geojson.FeatureCollection
import com.mapbox.geojson.LineString
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.EdgeInsets
import com.mapbox.maps.MapView
import com.mapbox.maps.MapboxMap
import com.mapbox.maps.Style
import com.mapbox.maps.extension.style.layers.addLayer
import com.mapbox.maps.extension.style.layers.generated.lineLayer
import com.mapbox.maps.extension.style.sources.addSource
import com.mapbox.maps.extension.style.sources.generated.GeoJsonSource
import com.mapbox.maps.extension.style.sources.generated.geoJsonSource
import com.mapbox.maps.plugin.annotation.annotations
import com.mapbox.maps.plugin.annotation.generated.PointAnnotation
import com.mapbox.maps.plugin.annotation.generated.PointAnnotationManager
import com.mapbox.maps.plugin.annotation.generated.PointAnnotationOptions
import com.mapbox.maps.plugin.annotation.generated.createPointAnnotationManager

private const val ROUTE_SOURCE_ID = "delivery-route-source"
private const val ROUTE_LAYER_ID = "delivery-route-layer"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    activeOrder: Order? = null,
    driverLocation: Location? = null,
    onOrderStatusUpdated: (String, String) -> Unit = { _, _ -> },
    onNavigateToDestination: (Double, Double, String) -> Unit = { _, _, _ -> }
) {
    val context = LocalContext.current
    var mapView by remember { mutableStateOf<MapView?>(null) }
    var mapboxMap by remember { mutableStateOf<MapboxMap?>(null) }
    val routeProvider = remember { RouteProvider(AppConfig.MAPBOX_ACCESS_TOKEN) }
    var routeData by remember { mutableStateOf<RouteData?>(null) }
    var routeSource by remember { mutableStateOf<GeoJsonSource?>(null) }

    // Fetch the driving route (driver -> restaurant -> customer) once locations are known
    LaunchedEffect(activeOrder, driverLocation) {
        val order = activeOrder ?: return@LaunchedEffect
        val driver = driverLocation ?: return@LaunchedEffect
        routeData = null
        routeData = routeProvider.fetchRoute(
            listOf(
                driver.latitude to driver.longitude,
                order.restaurantLocation.lat to order.restaurantLocation.lng,
                order.customerLocation.lat to order.customerLocation.lng
            )
        )
    }

    // Update the route source geometry and fit camera when route data arrives
    LaunchedEffect(routeData, routeSource) {
        val data = routeData ?: return@LaunchedEffect
        val src = routeSource ?: return@LaunchedEffect
        if (data.points.size < 2) return@LaunchedEffect

        val points = data.points.map { Point.fromLngLat(it.second, it.first) }
        val lineString = LineString.fromLngLats(points)

        // Update the source with the new geometry
        src.data(lineString.toJson(), "route")

        // Fit camera to the route
        mapboxMap?.getStyle { style ->
            mapboxMap?.setCamera(
                mapboxMap!!.cameraForCoordinates(
                    points,
                    EdgeInsets(80.0, 80.0, 80.0, 80.0),
                    null,
                    null
                )
            )
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(text = "Navigation") },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
        )

        if (driverLocation == null) {
            Box(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Getting your location...", style = MaterialTheme.typography.titleMedium)
                }
            }
        } else {
            Box(modifier = Modifier.fillMaxSize()) {
                AndroidView(
                    factory = { ctx ->
                        MapView(ctx).also { mv ->
                            mv.getMapboxMap().loadStyleUri(Style.MAPBOX_STREETS) { style ->
                                val map: MapboxMap = mv.getMapboxMap()
                                val annotationApi = mv.annotations
                                val pointManager = annotationApi.createPointAnnotationManager()

                                pointManager.create(
                                    PointAnnotationOptions()
                                        .withPoint(Point.fromLngLat(driverLocation.longitude, driverLocation.latitude))
                                        .withTextField("Your Location")
                                )

                                activeOrder?.let { order ->
                                    pointManager.create(
                                        PointAnnotationOptions()
                                            .withPoint(Point.fromLngLat(order.restaurantLocation.lng, order.restaurantLocation.lat))
                                            .withTextField(order.restaurantName)
                                    )
                                    pointManager.create(
                                        PointAnnotationOptions()
                                            .withPoint(Point.fromLngLat(order.customerLocation.lng, order.customerLocation.lat))
                                            .withTextField(order.customerName ?: "Customer")
                                    )
                                }

                                // Create empty route source + layer - capture the source reference
                                val source = geoJsonSource(ROUTE_SOURCE_ID) {
                                    featureCollection(FeatureCollection.fromFeatures(emptyList()))
                                }
                                routeSource = source
                                style.addSource(source)

                                style.addLayer(
                                    lineLayer(ROUTE_LAYER_ID, ROUTE_SOURCE_ID) {
                                        lineWidth(4.0)
                                        lineColor(Color.parseColor("#1a73e8"))
                                    }
                                )

                                map.setCamera(
                                    CameraOptions.Builder()
                                        .center(Point.fromLngLat(driverLocation.longitude, driverLocation.latitude))
                                        .zoom(13.0)
                                        .build()
                                )
                            }
                            mapView = mv
                            mapboxMap = mv.getMapboxMap()
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                DeliveryInfoContent(
                    activeOrder = activeOrder,
                    driverLocation = driverLocation,
                    routeData = routeData,
                    onNavigateToDestination = onNavigateToDestination
                )
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            mapView?.onDestroy()
        }
    }
}

@Composable
private fun DeliveryInfoContent(
    activeOrder: Order?,
    driverLocation: Location,
    routeData: RouteData?,
    onNavigateToDestination: ((Double, Double, String) -> Unit)
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Location Tracking", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Latitude: %.4f".format(driverLocation.latitude), style = MaterialTheme.typography.bodyLarge)
        Text("Longitude: %.4f".format(driverLocation.longitude), style = MaterialTheme.typography.bodyLarge)
        Spacer(modifier = Modifier.height(16.dp))

        if (activeOrder != null) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Active Order", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Restaurant: ${activeOrder.restaurantName}", style = MaterialTheme.typography.bodyMedium)
                    Text("Customer: ${activeOrder.customerName ?: "N/A"}", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (routeData != null) {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.small,
                            color = MaterialTheme.colorScheme.primaryContainer
                        ) {
                            Text(
                                text = "Delivery route: %.1f km • about %d min".format(
                                    routeData.distanceKm,
                                    routeData.durationMinutes
                                ),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    Button(
                        onClick = {
                            onNavigateToDestination(
                                activeOrder.restaurantLocation.lat,
                                activeOrder.restaurantLocation.lng,
                                activeOrder.restaurantAddress
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Navigate to Restaurant")
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            onNavigateToDestination(
                                activeOrder.customerLocation.lat,
                                activeOrder.customerLocation.lng,
                                activeOrder.customerAddress
                            )
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Navigate to Customer")
                    }
                }
            }
        }
    }
}