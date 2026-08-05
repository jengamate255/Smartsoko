package com.fooddelivery.driver.ui.screens

import android.content.Intent
import android.net.Uri
import android.location.Location
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.livedata.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.fooddelivery.driver.R
import com.fooddelivery.driver.data.model.Order
import com.fooddelivery.driver.data.model.OrderItem
import com.fooddelivery.driver.ui.state.AppViewModel
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.MapView
import com.mapbox.maps.Style
import kotlinx.coroutines.delay
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    viewModel: AppViewModel = viewModel(),
    orderId: String = "sample_order_123",
    onNavigateToMap: (Double, Double, String) -> Unit = { _, _, _ -> },
    onCallCustomer: (String) -> Unit = { _ -> }
) {
    SmartSokoDriverTheme {
        // Collect state from ViewModel
        val order by viewModel.activeOrder.observeAsState()
        val isLoading by viewModel.isLoading.observeAsState(false)
        val error by viewModel.error.observeAsState()
        val user by viewModel.user.observeAsState()
        val isOnline by viewModel.isOnline.observeAsState(false)
        val driverLocation by viewModel.driverLocation.observeAsState()

        // Timer state for pending orders
        var countdownSeconds by remember { mutableStateOf(0L) }
        val formattedCountdown = remember(countdownSeconds) {
            val minutes = TimeUnit.SECONDS.toMinutes(countdownSeconds)
            val seconds = countdownSeconds - TimeUnit.MINUTES.toSeconds(minutes)
            "%02d:%02d".format(minutes, seconds)
        }

        // Load the requested order fresh (deep links, notifications, stale coords after data fixes)
        LaunchedEffect(orderId, user) {
            if (user != null && orderId.isNotBlank() && orderId != "sample_order_123") {
                viewModel.fetchOrderById(orderId)
            }
        }

        // Start countdown for pending orders (10 min SLA)
        LaunchedEffect(order) {
            val o = order
            if (o?.status == "pending" && o.createdAt.isNotEmpty()) {
                val created = try {
                    java.time.Instant.parse(o.createdAt).toEpochMilli()
                } catch (_: Exception) { 0L }
                if (created > 0) {
                    while (true) {
                        val now = System.currentTimeMillis()
                        val elapsed = now - created
                        val remaining = (10 * 60 * 1000) - elapsed
                        if (remaining <= 0) {
                            countdownSeconds = 0
                            break
                        }
                        countdownSeconds = remaining / 1000
                        delay(1000)
                    }
                }
            } else {
                countdownSeconds = 0
            }
        }

        Column(modifier = Modifier.fillMaxSize()) {
            // App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "Order Details",
                        style = MaterialTheme.typography.titleMedium
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { /* TODO: Navigate back */ }) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )

            // Show error if any
            error?.let { errorMessage ->
                Snackbar(
                    modifier = Modifier.fillMaxWidth(),
                    action = {
                        TextButton(onClick = { }) {
                            Text("Dismiss")
                        }
                    },
                    content = { Text(text = errorMessage) }
                )
            }

            // Main content
            when {
                isLoading -> {
                    // Show loading indicator
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(24.dp)
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.Center),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                user == null -> {
                    // Show login screen
                    AuthScreen(
                        viewModel = viewModel,
                        onLoginSuccess = { email, password ->
                            viewModel.signIn(email, password)
                        }
                    )
                }
                order == null -> {
                    // Show placeholder while loading order details
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(24.dp)
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.Center),
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                else -> {
                    val orderData = order!!
                    // Order details content
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(vertical = 8.dp)
                    ) {
                        // Order header with countdown
                        item {
                            OrderHeader(order = orderData, countdown = formattedCountdown)
                        }

                        // Map preview for active orders
                        if (orderData.status in listOf("pending", "accepted", "assigned", "picked_up", "in_transit")) {
                            item {
                                MapPreviewSection(
                                    order = orderData,
                                    driverLocation = driverLocation,
                                    onNavigate = onNavigateToMap
                                )
                            }
                        }

                        // Customer info
                        item {
                            CustomerInfoSection(
                                customerName = orderData.customerName ?: "N/A",
                                customerPhone = orderData.deliveryInstructions ?: "",
                                onCallClick = { onCallCustomer(orderData.deliveryInstructions ?: "") }
                            )
                        }

                        // Pickup location
                        item {
                            LocationSection(
                                title = "Pickup Location",
                                address = orderData.restaurantAddress,
                                onNavigateClick = { onNavigateToMap(
                                    orderData.restaurantLocation.lat,
                                    orderData.restaurantLocation.lng,
                                    orderData.restaurantAddress
                                ) }
                            )
                        }

                        // Delivery location
                        item {
                            LocationSection(
                                title = "Delivery Location",
                                address = orderData.customerAddress,
                                onNavigateClick = { onNavigateToMap(
                                    orderData.customerLocation.lat,
                                    orderData.customerLocation.lng,
                                    orderData.customerAddress
                                ) }
                            )
                        }

                        // Order items
                        item {
                            OrderItemsSection(items = orderData.items)
                        }

                        // Order summary
                        item {
                            val subtotal = orderData.totalAmount * 0.8
                            val taxAmount = orderData.totalAmount * 0.1
                            val deliveryFeeAmount = orderData.totalAmount * 0.1
                            OrderSummarySection(
                                subtotal = subtotal,
                                tax = taxAmount,
                                deliveryFee = deliveryFeeAmount,
                                total = orderData.totalAmount
                            )
                        }

                        // Action buttons (if order is active)
                        if (orderData.status in listOf("pending", "accepted", "assigned", "picked_up")) {
                            item {
                                OrderActionsSection(
                                    order = orderData,
                                    viewModel = viewModel,
                                    isOnline = isOnline
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
private fun OrderHeader(order: Order, countdown: String = "") {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Status indicator
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = getOrderIcon(order.status),
                contentDescription = "Order status",
                tint = getOrderColor(order.status, MaterialTheme.colorScheme),
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))

        // Order details
        Column {
            Text(
                text = "Order #${order.id.takeLast(6)}",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = formatTimestamp(order.createdAt),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Spacer(modifier = Modifier.weight(1f))

        // Status text with countdown
        Column(
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = order.status.replace('_', ' ').titlecase(),
                style = MaterialTheme.typography.labelLarge,
                color = getOrderColor(order.status, MaterialTheme.colorScheme),
                modifier = Modifier
                    .padding(8.dp)
                    .background(getOrderColor(order.status, MaterialTheme.colorScheme).copy(alpha = 0.2f))
                    .wrapContentWidth(align = Alignment.CenterHorizontally)
            )
            if (countdown.isNotEmpty() && countdown != "00:00") {
                Text(
                    text = "Accept within: $countdown",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun MapPreviewSection(
    order: Order,
    driverLocation: Location?,
    onNavigate: (Double, Double, String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "Route Preview",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(MaterialTheme.shapes.medium)
        ) {
            AndroidView(
                factory = { ctx ->
                    MapView(ctx).also { mv ->
                        mv.getMapboxMap().loadStyleUri(Style.MAPBOX_STREETS) {
                            val centerLng = (order.restaurantLocation.lng + order.customerLocation.lng) / 2
                            val centerLat = (order.restaurantLocation.lat + order.customerLocation.lat) / 2
                            mv.getMapboxMap().setCamera(
                                CameraOptions.Builder()
                                    .center(Point.fromLngLat(centerLng, centerLat))
                                    .zoom(12.0)
                                    .build()
                            )
                        }
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            OutlinedButton(
                onClick = { onNavigate(order.restaurantLocation.lat, order.restaurantLocation.lng, order.restaurantAddress) },
                modifier = Modifier.weight(1f).padding(end = 4.dp)
            ) {
                Icon(imageVector = Icons.Default.DirectionsCar, contentDescription = "Navigate", modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Navigate to Pickup")
            }
            OutlinedButton(
                onClick = { onNavigate(order.customerLocation.lat, order.customerLocation.lng, order.customerAddress) },
                modifier = Modifier.weight(1f).padding(start = 4.dp)
            ) {
                Icon(imageVector = Icons.Default.LocalShipping, contentDescription = "Navigate", modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Navigate to Delivery")
            }
        }
    }
}

@Composable
private fun CustomerInfoSection(
    customerName: String,
    customerPhone: String,
    onCallClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "Customer Information",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = "Customer",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    text = customerName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = customerPhone,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            IconButton(
                onClick = onCallClick,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Call,
                    contentDescription = "Call customer",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
        Divider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun LocationSection(
    title: String,
    address: String,
    onNavigateClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = "Location",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = address,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = onNavigateClick,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.NavigateNext,
                    contentDescription = "Navigate",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
        Divider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun OrderItemsSection(    items: List<OrderItem>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "Order Items",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        items.forEach { item ->
            OrderItemRow(item = item)
            Divider(
                color = MaterialTheme.colorScheme.outlineVariant,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 56.dp)
            )
        }
    }
}

@Composable
private fun OrderItemRow(item: OrderItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Item image placeholder
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clip(shape = MaterialTheme.shapes.small)
        ) {
            Icon(
                imageVector = Icons.Default.Fastfood,
                contentDescription = "Item",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.Center)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))

        // Item details
        Column {
            Text(
                text = item.name,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "x${item.quantity}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "₦${"%.2f".format(item.price * item.quantity)}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary
            )
        }
        Spacer(modifier = Modifier.weight(1f))
    }
}

@Composable
private fun OrderSummarySection(
    subtotal: Double,
    tax: Double,
    deliveryFee: Double,
    total: Double
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "Order Summary",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Subtotal:",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "₦${"%.2f".format(subtotal)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Tax:",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "₦${"%.2f".format(tax)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Delivery Fee:",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "₦${"%.2f".format(deliveryFee)}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Divider(
            color = MaterialTheme.colorScheme.outline,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Total:",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "₦${"%.2f".format(total)}",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun OrderActionsSection(
    order: Order,
    viewModel: AppViewModel,
    isOnline: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        when (order.status) {
            "pending" -> {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Button(
                        onClick = { viewModel.updateOrderStatus(order.id, "rejected") },
                        enabled = isOnline,
                        modifier = Modifier.weight(0.45f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError
                        )
                    ) {
                        Text(
                            text = "Reject",
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                    Button(
                        onClick = { viewModel.acceptOrder(order.id) },
                        enabled = isOnline,
                        modifier = Modifier.weight(0.45f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        Text(
                            text = "Accept",
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            }
            "accepted" -> {
                Button(
                    onClick = { viewModel.updateOrderStatus(order.id, "picked_up") },
                    enabled = isOnline,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(
                        text = "Pick Up Order",
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
            "assigned" -> {
                Button(
                    onClick = { viewModel.updateOrderStatus(order.id, "picked_up") },
                    enabled = isOnline,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(
                        text = "Pick Up Order",
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
            "picked_up" -> {
                Button(
                    onClick = { viewModel.updateOrderStatus(order.id, "delivered") },
                    enabled = isOnline,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(
                        text = "Deliver Order",
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
        }
    }
}

private fun getOrderIcon(status: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (status.lowercase()) {
        "completed" -> Icons.Default.CheckCircle
        "cancelled" -> Icons.Default.Cancel
        "delivered" -> Icons.Default.LocalShipping
        "picked_up" -> Icons.Default.LocalShipping
        "accepted" -> Icons.Default.CheckCircleOutline
        "assigned" -> Icons.Default.CheckCircleOutline
        else -> Icons.Default.Receipt
    }
}

private fun getOrderColor(status: String, colorScheme: androidx.compose.material3.ColorScheme): Color {
    return when (status.lowercase()) {
        "completed" -> colorScheme.primary
        "cancelled" -> colorScheme.error
        "delivered" -> colorScheme.secondary
        "picked_up" -> colorScheme.tertiary
        "accepted" -> colorScheme.primary
        "assigned" -> colorScheme.primary
        else -> colorScheme.onSurfaceVariant
    }
}

private fun formatTimestamp(timestampString: String): String {
    // Simple timestamp formatting - in production, use proper date parsing
    try {
        // Assuming ISO timestamp format
        val time = java.time.Instant.parse(timestampString)
        val hour = time.atZone(java.time.ZoneId.systemDefault()).hour
        val minute = time.atZone(java.time.ZoneId.systemDefault()).minute
        return "%02d:%02d".format(hour, minute)
    } catch (e: Exception) {
        return timestampString.takeLast(5) // Fallback to last 5 chars
    }
}

// Extension function to titlecase a string
private fun String.titlecase(): String {
    if (this.isEmpty()) return this
    return this.substring(0, 1).uppercase() + this.substring(1).lowercase()
}