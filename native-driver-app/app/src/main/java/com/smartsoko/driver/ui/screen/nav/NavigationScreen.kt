package com.smartsoko.driver.ui.screen.nav

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import com.mapbox.maps.MapView
import com.mapbox.maps.Style
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.domain.model.OrderStatus
import com.smartsoko.driver.navigation.NavigationManager
import com.smartsoko.driver.navigation.NavigationState
import com.smartsoko.driver.navigation.Maneuver
import dagger.hilt.android.EntryPointAccessors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationScreen(
    orderId: String,
    onBack: () -> Unit,
    viewModel: NavigationViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var navManager by remember { mutableStateOf<NavigationManager?>(null) }
    var navigationState by remember { mutableStateOf<NavigationState>(NavigationState.Idle) }
    var showGoogleFallback by remember { mutableStateOf(false) }

    // Initialize NavigationManager from Hilt
    LaunchedEffect(Unit) {
        val entryPoint = EntryPointAccessors.fromApplication(context.applicationContext, NavigationManagerEntryPoint::class.java)
        navManager = entryPoint.navigationManager()
        navManager?.navigationState?.collect { navState ->
            navigationState = navState
        }
    }

    // Start navigation when order loads
    LaunchedEffect(state.order) {
        val order = state.order ?: return@LaunchedEffect
        val driverLoc = state.driverLocation ?: return@LaunchedEffect

        val accessToken = context.getString(com.fooddelivery.driver.R.string.mapbox_access_token)
        navManager?.initialize(accessToken)

        val targetLat = if (state.phase == NavPhase.NAVIGATE_TO_PICKUP) order.pickupLat else order.dropoffLat
        val targetLng = if (state.phase == NavPhase.NAVIGATE_TO_PICKUP) order.pickupLng else order.dropoffLng

        val waypoints = listOf(
            driverLoc.latitude to driverLoc.longitude,
            targetLat to targetLng
        )

        navManager?.startNavigation(waypoints)
    }

    // Handle navigation state changes
    LaunchedEffect(navigationState) {
        when (navigationState) {
            is NavigationState.Error -> {
                showGoogleFallback = true
            }
            is NavigationState.Idle, is NavigationState.Loading -> {
            }
            is NavigationState.Arrived -> {
            }
            else -> {
                showGoogleFallback = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Navigation") },
                navigationIcon = {
                    IconButton(onClick = {
                        navManager?.stopNavigation()
                        onBack()
                    }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (!showGoogleFallback && state.order != null) {
                TurnByTurnNavigationScreen(
                    context = context,
                    order = state.order!!,
                    phase = state.phase,
                    navManager = navManager,
                    navigationState = navigationState,
                    onGoogleMapsFallback = { showGoogleFallback = true },
                    onBack = onBack
                )
            } else if (showGoogleFallback && state.order != null) {
                GoogleMapsFallbackScreen(
                    order = state.order!!,
                    phase = state.phase,
                    onRetryMapbox = { showGoogleFallback = false },
                    onBack = { navManager?.stopNavigation(); onBack() }
                )
            } else {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}

@dagger.hilt.EntryPoint
@dagger.hilt.InstallIn(dagger.hilt.components.SingletonComponent::class)
interface NavigationManagerEntryPoint {
    fun navigationManager(): NavigationManager
}

@Composable
fun TurnByTurnNavigationScreen(
    context: Context,
    order: Order,
    phase: NavPhase,
    navManager: NavigationManager?,
    navigationState: NavigationState,
    onGoogleMapsFallback: () -> Unit,
    onBack: () -> Unit
) {
    val mapView = remember { MapView(context) }
    LaunchedEffect(order) {
        mapView.mapboxMap.loadStyleUri(Style.MAPBOX_STREETS)
    }
    val currentManeuver = (navigationState as? NavigationState.Navigating)?.nextManeuver
    val currentRoute = (navigationState as? NavigationState.Navigating)?.route

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(factory = { mapView }, modifier = Modifier.fillMaxSize())

        // Turn-by-turn overlay
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Current maneuver banner
            if (currentManeuver != null) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primary,
                    shadowElevation = 8.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Icon(
                                imageVector = when (currentManeuver.maneuverType) {
                                    "left" -> Icons.Default.TurnLeft
                                    "right" -> Icons.Default.TurnRight
                                    "uturn" -> Icons.Default.RotateRight
                                    else -> Icons.Default.Straight
                                },
                                contentDescription = currentManeuver.instruction,
                                modifier = Modifier.size(28.dp),
                                tint = MaterialTheme.colorScheme.onPrimary
                            )
                            Column(
                                modifier = Modifier.weight(1f).padding(start = 12.dp),
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    currentManeuver.instruction,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                                if (currentManeuver.distanceMeters > 0) {
                                    Text(
                                        formatDistance(currentManeuver.distanceMeters),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                                    )
                                }
                            }
                            Text(
                                formatDistance(currentManeuver.distanceMeters),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.padding(end = 8.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Bottom info panel
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shadowElevation = 16.dp,
                color = MaterialTheme.colorScheme.surfaceContainerHigh
            ) {
                Column(modifier = Modifier.padding(16.dp).navigationBarsPadding()) {
                    // Progress info
                    currentRoute?.let { route ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            InfoColumn("Distance", formatDistance(route.distanceMeters))
                            InfoColumn("Duration", formatDuration(route.durationSeconds))
                            InfoColumn("Phase", phase.name.replace("_", " "))
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Action buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onGoogleMapsFallback,
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Map, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Google Maps")
                        }

                        Button(
                            onClick = {
                                navManager?.stopNavigation()
                                onBack()
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Exit Navigation")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoogleMapsFallbackScreen(
    order: Order,
    phase: NavPhase,
    onRetryMapbox: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val targetLat = if (phase == NavPhase.NAVIGATE_TO_PICKUP) order.pickupLat else order.dropoffLat
    val targetLng = if (phase == NavPhase.NAVIGATE_TO_PICKUP) order.pickupLng else order.dropoffLng
    val targetAddress = if (phase == NavPhase.NAVIGATE_TO_PICKUP) order.pickupAddress else order.dropoffAddress

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Navigation - Google Maps Fallback") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = "Warning",
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Mapbox Navigation Unavailable",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Using Google Maps as fallback. Tap below to open navigation.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(24.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Destination", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(targetAddress, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Latitude", style = MaterialTheme.typography.labelSmall)
                            Text("%.6f".format(targetLat), style = MaterialTheme.typography.bodyMedium, fontFamily = FontFamily.Monospace)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Longitude", style = MaterialTheme.typography.labelSmall)
                            Text("%.6f".format(targetLng), style = MaterialTheme.typography.bodyMedium, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    val uri = "google.navigation:q=$targetLat,$targetLng"
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)))
                },
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Open in Google Maps", fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = onRetryMapbox,
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Retry Mapbox Navigation", fontSize = 18.sp)
            }
        }
    }
}

@Composable
private fun InfoColumn(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    }
}

private fun formatDistance(meters: Double): String {
    return if (meters < 1000) "${meters.toInt()} m" else "%.1f km".format(meters / 1000)
}

private fun formatDuration(seconds: Double): String {
    val minutes = (seconds / 60).toInt()
    return if (minutes < 60) "$minutes min" else "${minutes / 60}h ${minutes % 60}min"
}