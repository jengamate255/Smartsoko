package com.smartsoko.driver.ui.screen.home

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.mapbox.maps.MapView
import com.mapbox.maps.Style.Companion.MAPBOX_STREETS
import com.smartsoko.driver.ui.components.*

@Composable
fun HomeScreen(
    onNavigateToOrder: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        viewModel.checkLocationPermission(context)
    }

    LaunchedEffect(Unit) {
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        viewModel.checkLocationPermission(context)
        if (hasFine != PackageManager.PERMISSION_GRANTED) {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.POST_NOTIFICATIONS
                )
            )
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Map (full screen)
        val mapView = remember { MapView(context) }
        LaunchedEffect(state.location) {
            state.location?.let {
                mapView.mapboxMap.loadStyleUri(MAPBOX_STREETS)
            }
        }

        AndroidView(factory = { mapView }, modifier = Modifier.fillMaxSize())

        // Top bar overlay
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
            shape = RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .statusBarsPadding(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("SMARTSOKO", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                    if (state.isOnline) {
                        Text("You're online", style = MaterialTheme.typography.bodySmall, color = Color(0xFF4CAF50))
                    } else {
                        Text("You're offline", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                OnlineToggle(
                    isOnline = state.isOnline,
                    onToggle = { viewModel.toggleOnline(context) }
                )
            }
        }

        // Active order card (bottom)
        if (state.activeOrder != null && state.incomingOrder == null) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(16.dp)
                    .navigationBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OrderStatusCard(
                    order = state.activeOrder!!,
                    onNextAction = {
                        val nextStatus = state.activeOrder!!.status.nextStatus
                        if (nextStatus != null) {
                            viewModel.updateStatus(state.activeOrder!!.id, nextStatus)
                        }
                    }
                )

                Button(
                    onClick = { onNavigateToOrder(state.activeOrder!!.id) },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                ) {
                    Icon(Icons.Default.Map, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Open Navigation")
                }
            }
        }

        // Incoming order sheet (slides up from bottom)
        AnimatedVisibility(
            visible = state.incomingOrder != null,
            enter = slideInVertically(initialOffsetY = { it }),
            exit = slideOutVertically(targetOffsetY = { it }),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            state.incomingOrder?.let { order ->
                IncomingOrderSheet(
                    order = order,
                    timer = state.incomingTimer,
                    onAccept = viewModel::acceptOrder,
                    onReject = viewModel::rejectOrder
                )
            }
        }

        // Loading overlay
        if (state.isLoading) {
            LoadingOverlay()
        }

        // Error snackbar
        state.error?.let { error ->
            Snackbar(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp),
                action = {
                    TextButton(onClick = viewModel::clearError) { Text("Dismiss") }
                }
            ) { Text(error) }
        }
    }
}
