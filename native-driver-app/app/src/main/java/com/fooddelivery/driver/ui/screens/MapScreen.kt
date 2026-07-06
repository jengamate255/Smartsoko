package com.fooddelivery.driver.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import androidx.activity.result.ActivityResultCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fooddelivery.driver.R
import com.fooddelivery.driver.data.model.Order
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.CompassView
import com.mapbox.maps.MapView
import com.mapbox.maps.ResourceOptions
import com.mapbox.maps.Style
import com.mapbox.maps.extension.compose.CameraState
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.createMarkerManager
import com.mapbox.maps.extension.compose.marker
import com.mapbox.maps.plugin.animation.CameraAnimationsPluginKt
import com.mapbox.maps.plugin.animation.gesture.AnimateToOptions
import com.mapbox.maps.plugin.animation.gesture.AnimationListener
import com.mapbox.maps.plugin.annotationgateway.PointAnnotationManager
import com.mapbox.maps.plugin.annotationgateway.PointAnnotationManagerKt
import com.mapbox.maps.plugin.annotationgateway.PointAnnotationOptions
import com.mapbox.maps.plugin.locationcomponent.LocationComponentPluginKt
import com.mapbox.maps.plugin.locationcomponent.RenderMode
import com.mapbox.maps.plugin.locationcomponent.callback.NewLocationData
import com.mapbox.maps.plugin.locationcomponent.callback.OnMyLocationChangeListener
import com.mapbox.maps.plugin.locationcomponent.location.Lost
import com.mapbox.maps.plugin.locationcomponent.location.Venue
import com.mapbox.maps.plugin.locationcomponent.locationEngine.AndroidLocationEngineProvider
import com.mapbox.maps.plugin.locationcomponent.locationEngine.LocationEngine
import com.mapbox.maps.plugin.locationcomponent.locationEngine.LocationEngineCallback
import com.mapbox.maps.plugin.locationcomponent.locationEngine.LocationEngineProvider
import com.mapbox.maps.plugin.locationcomponent.locationEngine.LocationEngineRequest
import com.mapbox.maps.plugin.locationcomponent.locationEngine.LocationEngineResult
import com.mapbox.maps.plugin.locationcomponent.settings.LocationComponentOptions
import com.mapbox.maps.plugin.locationcomponent.settings.LocationComponentVisibility
import com.mapbox.maps.plugin.locationcomponent.viewstate.CameraUpdateMode
import com.mapbox.maps.plugin.locationcomponent.viewstate.InputStatus
import com.mapbox.maps.plugin.locationcomponent.viewstate.Puck2DViewState
import com.mapbox.maps.plugin.locationcomponent.viewstate.PuckBearing
import com.mapbox.maps.plugin.locationcomponent.viewstate.PuckType
import com.mapbox.maps.plugin.locationcomponent.viewstate.PuckVisibility
import com.mapbox.maps.plugin.locationcomponent.viewstate.VehicleState
import com.mapbox.maps.plugin.locationcomponent.viewstate.VehicleStateBuilder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

import java.util.List

/**
 * MapScreen showing real-time location tracking and navigation to destinations.
 * Uses Mapbox SDK for mapping and location services.
 */
@Composable
fun MapScreen(
    // We will pass in the viewModel or state later
    activeOrder: Order? = null,
    driverLocation: Location? = null,
    onOrderStatusUpdated: ((String, String) -> Unit) = {},
    onNavigateToDestination: ((Double, Double, String) -> Unit) = {}
) {
    SmartSokoDriverTheme {
        // Request location permission
        val context = LocalContext.current
        val locationPermissionResult = rememberLauncherForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { isGranted: Boolean ->
            if (isGranted) {
                // Permission granted, start location updates
            } else {
                // Permission denied
            }
        }

        // Request location permission if not already granted
        LaunchedEffect(Unit) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                locationPermissionResult.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            }
        }

        Column(modifier = Modifier.fillMaxSize()) {
            // App Bar
            TopAppBar(
                title = { Text(text = "Navigation") },
                backgroundColor = MaterialTheme.colorScheme.primary
            )

            if (driverLocation == null) {
                // Loading state - waiting for location
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp)
                ) {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_location_searching),
                            contentDescription = "Finding location",
                            modifier = Modifier.size(80.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Getting your location...",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                // Map view with location tracking and navigation
                Box(modifier = Modifier.fillMaxSize()) {
                    MapViewWithLocationTracking(
                        initialLocation = driverLocation,
                        activeOrder = activeOrder,
                        onOrderStatusUpdated = onOrderStatusUpdated,
                        onNavigateToDestination = onNavigateToDestination
                    )

                    // UI controls overlay
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(16.dp)
                    ) {
                        if (activeOrder != null && activeOrder.delivery != null) {
                            Button(
                                onClick = {
                                    onNavigateToDestination(
                                        activeOrder.delivery.lat!!,
                                        activeOrder.delivery.lng!!,
                                        activeOrder.delivery.address
                                    )
                                },
                                modifier = Modifier.width(56.dp).height(56.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                ),
                                shape = MaterialTheme.shapes.small
                            ) {
                                Icon(
                                    imageVector = Icons.Default.MyLocation,
                                    contentDescription = "Navigate to destination",
                                    tint = MaterialTheme.colorScheme.onPrimary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MapViewWithLocationTracking(
    initialLocation: Location?,
    activeOrder: Order?,
    onOrderStatusUpdated: ((String, String) -> Unit),
    onNavigateToDestination: ((Double, Double, String) -> Unit)
) {
    // Mapbox Map implementation with location tracking
    var mapboxMap by remember { mutableStateOf<MapboxMap?>(null) }
    var cameraState by remember { mutableStateOf<CameraState?>(null) }
    
    // Location tracking state
    var lastKnownLocation by remember { mutableStateOf<Location?>(initialLocation) }
    var isTrackingLocation by remember { mutableStateOf<Boolean>(false) }
    
    // Markers and annotations
    val pointAnnotationManager = remember {
        pointAnnotationManagerFactory { mapboxMap ->
            mapboxMap?.let { map ->
                PointAnnotationManager(
                    map,
                    PointAnnotationManagerOptions()
                        .withClickListener { pointAnnotation ->
                            // Handle annotation click if needed
                            false
                        }
                )
            } ?: PointAnnotationManagerFactory().create(null)!!
        }
    }
    
    // Location component for showing user location
    val locationComponentPlugin = remember {
        locationComponentPluginFactory { mapboxMap ->
            mapboxMap?.let { map ->
                LocationComponentPluginKt.getLocationComponentPlugin(map)
            } ?: LocationComponentPluginKt.getLocationComponentPlugin(null!!) // This is unsafe but necessary for the factory
        }
    } ?: LocationComponentPluginKt.getLocationComponentPlugin(null!!)
    
    // Set up initial camera position if we have a location
    LaunchedEffect(initialLocation) {
        if (initialLocation != null) {
            cameraState = CameraState.Builder()
                .fromLatLngZoom(
                    android.location.LocationCompat.getLatitude(initialLocation),
                    android.location.LocationCompat.getLongitude(initialLocation),
                    15.0
                )
                .build()
        }
    }
    
    // Handle location updates from ViewModel (in real app, this would come from location service)
    // For now, we'll simulate location updates
    LaunchedEffect(Unit) {
        isTrackingLocation = true
        // Simulate location updates every 5 seconds
        val job = launch {
            while (isTrackingLocation) {
                delay(5000)
                // In a real app, this would come from FusedLocationProviderClient
                // For simulation, we'll just slightly perturb the current location
                val newLocation = if (lastKnownLocation != null) {
                    Location("").apply {
                        latitude = lastKnownLocation!!.latitude + (Math.random() - 0.5) * 0.001
                        longitude = lastKnownLocation!!.longitude + (Math.random() - 0.5) * 0.001
                        time = System.currentTimeMillis()
                        accuracy = 10.0f
                    }
                } else {
                    initialLocation
                }
                lastKnownLocation = newLocation
                
                // Update Mapbox location component
                if (newLocation != null && mapboxMap != null) {
                    val locationComponent = mapboxMap!!.getLocationComponent()
                    if (locationComponent != null) {
                        locationComponent.forceLocationUpdate(
                            NewLocationData.Builder()
                                .withLatitude(android.location.LocationCompat.getLatitude(newLocation))
                                .withLongitude(android.location.LocationCompat.getLongitude(newLocation))
                                .withTimestamp(System.currentTimeMillis())
                                .withAccuracy(10.0)
                                .build()
                        )
                    }
                }
            }
        }
        
        // Clean up when composable disposes
        onDispose {
            isTrackingLocation = false
            job.cancel()
        }
    }
    
    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        MapboxMap(
            cameraState = cameraState,
            style = Style.STREETS,
            onMapReady = { mapboxMap_ ->
                mapboxMap = mapboxMap_
                // Initialize location component when map is ready
                if (mapboxMap_ != null) {
                    val locationComponent = mapboxMap_.getLocationComponent()
                    locationComponent.activateLocationComponent(
                        LocationComponentOptions.builder()
                            .withRenderMode(RenderMode.COMPASS)
                            .withPuck2DViewState(
                                Puck2DViewState.builder()
                                    .withPuckType(PuckType.DEFAULT)
                                    .build()
                            )
                            .build()
                    )
                    locationComponent.isLocationComponentEnabled = true
                }
            }
        )
        
        // Add user location indicator (handled by location component above)
        
        // Add destination marker if we have an active order
        if (activeOrder != null) {
            // Pickup marker
            PointAnnotationManagerKt.createPointAnnotation(
                pointAnnotationManager,
                PointAnnotationOptions()
                    .withPoint(Point.fromLngLat(
                        activeOrder.restaurantLng,
                        activeOrder.restaurantLat
                    ))
                    .withIconImage("pickup-marker") // We'd need to add this to resources
                    .withTextField("Pickup")
                    .withTextOffset(arrayOf(0f, -10f))
            )
            
            // Delivery marker
            PointAnnotationManagerKt.createPointAnnotation(
                pointAnnotationManager,
                PointAnnotationOptions()
                    .withPoint(Point.fromLngLat(
                        activeOrder.customerLng,
                        activeOrder.customerLat
                    ))
                    .withIconImage("delivery-marker") // We'd need to add this to resources
                    .withTextField("Delivery")
                    .withTextOffset(arrayOf(0f, -10f))
            )
            
            // Draw route between pickup and delivery (simplified)
            // In a real app, you'd use Mapbox Directions API
            // For now, we'll just show a line between the two points
        }
        
        // UI controls overlay
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
        ) {
            if (activeOrder != null) {
                Button(
                    onClick = {
                        // Navigate to pickup location first, then delivery
                        onNavigateToDestination(
                            activeOrder.restaurantLat,
                            activeOrder.restaurantLng,
                            activeOrder.restaurantAddress
                        )
                    },
                    modifier = Modifier.width(56.dp).height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    shape = MaterialTheme.shapes.small
                ) {
                    Icon(
                        imageVector = Icons.Default.MyLocation,
                        contentDescription = "Navigate to pickup",
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        onNavigateToDestination(
                            activeOrder.customerLat,
                            activeOrder.customerLng,
                            activeOrder.customerAddress
                        )
                    },
                    modifier = Modifier.width(56.dp).height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    shape = MaterialTheme.shapes.small
                ) {
                    Icon(
                        imageVector = Icons.Default.Map,
                        contentDescription = "Navigate to delivery",
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
        }
    }
}

// TODO: Implement LocationTrackingService as a foreground service
// TODO: Implement OrderStatusUpdate use case
// TODO: Implement NavigationHelper for route calculation