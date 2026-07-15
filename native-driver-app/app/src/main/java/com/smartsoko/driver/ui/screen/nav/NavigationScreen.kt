package com.smartsoko.driver.ui.screen.nav

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import com.mapbox.maps.MapView
import com.mapbox.maps.Style.Companion.MAPBOX_STREETS
import com.smartsoko.driver.domain.model.OrderStatus
import com.smartsoko.driver.ui.components.ActionButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationScreen(
    orderId: String,
    onBack: () -> Unit,
    viewModel: NavigationViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Navigation") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            state.order?.let { order ->
                // Map section
                val navMapView = remember { MapView(context) }
                LaunchedEffect(order) {
                    navMapView.mapboxMap.loadStyleUri(MAPBOX_STREETS)
                }

                Box(modifier = Modifier.weight(1f)) {
                    AndroidView(factory = { navMapView }, modifier = Modifier.fillMaxSize())

                    // Navigation info overlay
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .fillMaxWidth()
                            .padding(12.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = if (state.phase == NavPhase.NAVIGATE_TO_PICKUP) "HEADING TO PICKUP"
                                else if (state.phase == NavPhase.NAVIGATE_TO_DROPOFF) "HEADING TO DROPOFF"
                                else "DELIVERY COMPLETE",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = if (state.phase == NavPhase.NAVIGATE_TO_PICKUP) order.pickupAddress
                                else order.dropoffAddress,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Bottom controls
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shadowElevation = 16.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp).navigationBarsPadding()) {
                        // Location info
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("ETA", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("-- min", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Distance", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(
                                    order.estimatedDistance.toString() + " km",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Status", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(order.status.displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        // Action buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    val uri = if (state.phase == NavPhase.NAVIGATE_TO_PICKUP)
                                        "google.navigation:q=${order.pickupLat},${order.pickupLng}"
                                    else
                                        "google.navigation:q=${order.dropoffLat},${order.dropoffLng}"
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)))
                                },
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Navigate")
                            }

                            if (state.phase == NavPhase.NAVIGATE_TO_PICKUP) {
                                Button(
                                    onClick = { viewModel.updateStatus(order.id, OrderStatus.ARRIVED_AT_PICKUP) },
                                    modifier = Modifier.weight(1f).height(48.dp),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Arrived")
                                }
                            }

                            if (state.phase == NavPhase.NAVIGATE_TO_PICKUP && order.status == OrderStatus.ARRIVED_AT_PICKUP) {
                                Button(
                                    onClick = { viewModel.updateStatus(order.id, OrderStatus.PICKED_UP) },
                                    modifier = Modifier.weight(1f).height(48.dp),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Picked Up")
                                }
                            }

                            if (state.phase == NavPhase.NAVIGATE_TO_DROPOFF && order.status == OrderStatus.IN_TRANSIT) {
                                Button(
                                    onClick = { viewModel.updateStatus(order.id, OrderStatus.DELIVERED) },
                                    modifier = Modifier.weight(1f).height(48.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                ) {
                                    Text("Delivered")
                                }
                            }
                        }

                        Spacer(Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    order.customerPhone?.let {
                                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$it")))
                                    }
                                },
                                modifier = Modifier.weight(1f).height(44.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Call")
                            }
                            OutlinedButton(
                                onClick = {
                                    order.customerPhone?.let {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("sms:$it")))
                                    }
                                },
                                modifier = Modifier.weight(1f).height(44.dp),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.Sms, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Message")
                            }
                        }
                    }
                }
            }
        }
    }
}
