package com.smartsoko.customer.presentation.address

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.MapInitOptions
import com.mapbox.maps.MapView
import com.mapbox.maps.plugin.Plugin
import com.mapbox.maps.plugin.gestures.GesturesPlugin
import com.mapbox.maps.plugin.gestures.OnMapClickListener
import com.mapbox.maps.plugin.locationcomponent.LocationComponentPlugin
import com.mapbox.maps.plugin.locationcomponent.OnIndicatorPositionChangedListener
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressFormScreen(
    addressId: String? = null,
    onNavigateBack: () -> Unit,
    viewModel: AddressViewModel = hiltViewModel()
) {
    val formState by viewModel.formState.collectAsState()
    val context = LocalContext.current

    var mapView by remember { mutableStateOf<MapView?>(null) }
    var mapboxMap by remember { mutableStateOf<com.mapbox.maps.MapboxMap?>(null) }
    var lastKnownPoint by remember { mutableStateOf<Point?>(null) }
    var centeredOnce = false
    var locatePending = false
    var listenerAttached = false
    var lastCameraLat = 0.0
    var lastCameraLng = 0.0
    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasLocationPermission =
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    LaunchedEffect(Unit) {
        permissionLauncher.launch(
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        )
    }

    LaunchedEffect(addressId) {
        if (addressId != null) {
            viewModel.loadAddressForEdit(addressId)
        }
    }

    LaunchedEffect(formState.saveSuccess) {
        if (formState.saveSuccess) {
            onNavigateBack()
            viewModel.clearNavigation()
        }
    }

    fun centerOn(point: Point, zoom: Double = 16.0) {
        mapboxMap?.setCamera(
            CameraOptions.Builder().center(point).zoom(zoom).build()
        )
    }

    LaunchedEffect(mapboxMap) {
        while (true) {
            delay(600)
            val map = mapboxMap ?: continue
            val center = map.cameraState.center
            val lat = center.latitude()
            val lng = center.longitude()
            if (lat != 0.0 || lng != 0.0) {
                if (lat != lastCameraLat || lng != lastCameraLng) {
                    lastCameraLat = lat
                    lastCameraLng = lng
                    viewModel.updateLocation(lat, lng)
                }
            }
        }
    }

    val indicatorListener = remember {
        object : OnIndicatorPositionChangedListener {
            override fun onIndicatorPositionChanged(point: Point) {
                lastKnownPoint = point
                if (locatePending) {
                    locatePending = false
                    centeredOnce = true
                    viewModel.updateLocation(point.latitude(), point.longitude())
                } else if (!centeredOnce && addressId == null) {
                    centeredOnce = true
                    centerOn(point)
                    viewModel.updateLocation(point.latitude(), point.longitude())
                }
            }
        }
    }

    fun enableLocationComponent() {
        if (!hasLocationPermission) return
        val map = mapView ?: return
        val location = map.getPlugin(Plugin.MAPBOX_LOCATION_COMPONENT_PLUGIN_ID) as? LocationComponentPlugin
            ?: return
        location.enabled = true
        location.pulsingEnabled = true
        if (!listenerAttached) {
            listenerAttached = true
            location.addOnIndicatorPositionChangedListener(indicatorListener)
        }
    }

    fun useCurrentLocation() {
        val point = lastKnownPoint
        if (point != null) {
            centeredOnce = true
            centerOn(point)
            viewModel.updateLocation(point.latitude(), point.longitude())
        } else {
            locatePending = true
            enableLocationComponent()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            mapView?.onStop()
            mapView?.onDestroy()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (addressId != null) "Edit Address" else "Add Address") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
            ) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        MapView(ctx, MapInitOptions(ctx)).apply {
                            onStart()
                            val map = getMapboxMap()
                            mapboxMap = map
                            map.setCamera(CameraOptions.Builder().zoom(15.0).build())

                            val gestures = getPlugin(Plugin.MAPBOX_GESTURES_PLUGIN_ID) as? GesturesPlugin
                            gestures?.addOnMapClickListener(object : OnMapClickListener {
                                override fun onMapClick(point: Point): Boolean {
                                    viewModel.updateLocation(point.latitude(), point.longitude())
                                    return true
                                }
                            })

                            mapView = this
                            enableLocationComponent()
                        }
                    }
                )

                Icon(
                    imageVector = Icons.Default.Place,
                    contentDescription = "Selected delivery location",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .offset(y = (-28).dp)
                        .size(48.dp)
                )

                FilledTonalIconButton(
                    onClick = { useCurrentLocation() },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp)
                ) {
                    Icon(Icons.Default.MyLocation, contentDescription = "Use my current location")
                }
            }

            LaunchedEffect(hasLocationPermission) {
                enableLocationComponent()
            }

            LaunchedEffect(formState.latitude, formState.longitude) {
                if (addressId != null && !centeredOnce &&
                    formState.latitude != 0.0 && formState.longitude != 0.0
                ) {
                    centeredOnce = true
                    centerOn(
                        Point.fromLngLat(formState.longitude, formState.latitude),
                        16.0
                    )
                }
            }

            if (formState.isLocating) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Finding your location...", style = MaterialTheme.typography.bodySmall)
                }
            } else if (!hasLocationPermission) {
                Text(
                    text = "Location permission denied. Drag the map to set your delivery address.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            } else {
                Text(
                    text = "Your location updates in real time. Drag the map to adjust the pin.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            if (formState.latitude != 0.0 || formState.longitude != 0.0) {
                Text(
                    text = "%.6f, %.6f".format(formState.latitude, formState.longitude),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = formState.title,
                    onValueChange = { viewModel.updateFormField(title = it) },
                    label = { Text("Label (e.g., Home, Work)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = formState.fullName,
                    onValueChange = { viewModel.updateFormField(fullName = it) },
                    label = { Text("Full Name *") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = formState.phoneNumber,
                    onValueChange = { viewModel.updateFormField(phoneNumber = it) },
                    label = { Text("Phone Number *") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = formState.streetAddress,
                    onValueChange = { viewModel.updateFormField(streetAddress = it) },
                    label = { Text("Street Address *") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 2,
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = formState.apartment,
                    onValueChange = { viewModel.updateFormField(apartment = it) },
                    label = { Text("Apartment/Suite (Optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = formState.city,
                        onValueChange = { viewModel.updateFormField(city = it) },
                        label = { Text("City *") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = formState.postalCode,
                        onValueChange = { viewModel.updateFormField(postalCode = it) },
                        label = { Text("Postal Code") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Set as default address", style = MaterialTheme.typography.bodyLarge)
                    Switch(
                        checked = formState.isDefault,
                        onCheckedChange = { viewModel.updateFormField(isDefault = it) }
                    )
                }

                if (formState.error != null) {
                    Text(
                        text = formState.error!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Spacer(Modifier.height(16.dp))

                Button(
                    onClick = { viewModel.saveAddress() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !formState.isSaving
                ) {
                    if (formState.isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Save Address")
                    }
                }

                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
