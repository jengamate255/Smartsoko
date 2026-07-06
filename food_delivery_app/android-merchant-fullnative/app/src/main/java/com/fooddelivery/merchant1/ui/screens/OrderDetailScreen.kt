package com.fooddelivery.merchant1.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.fooddelivery.merchant1.data.model.Order
import com.fooddelivery.merchant1.data.model.OrderItem
import com.fooddelivery.merchant1.data.model.OrderStatus
import com.fooddelivery.merchant1.ui.viewmodel.OrderFilter
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    order: Order,
    onBack: () -> Unit,
    onAcceptOrder: (String) -> Unit,
    onRejectOrder: (String) -> Unit,
    onMarkReady: (String) -> Unit,
    onMarkDelivered: (String) -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Order #${order.id.take(8)}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Status header
            item {
                StatusHeader(order = order, dateFormat = dateFormat)
            }

            // Customer info
            item {
                CustomerInfoCard(order = order)
            }

            // Order items
            item {
                Text(
                    "Order Items",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            if (order.items.isEmpty()) {
                item {
                    Text(
                        "No item details available",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(order.items) { item ->
                    OrderItemCard(item = item)
                }
            }

            // Delivery info
            item {
                DeliveryInfoCard(order = order)
            }

            // Action buttons
            item {
                OrderActions(
                    status = order.status,
                    onAccept = { onAcceptOrder(order.id) },
                    onReject = { onRejectOrder(order.id) },
                    onReady = { onMarkReady(order.id) },
                    onDelivered = { onMarkDelivered(order.id) }
                )
            }
        }
    }
}

@Composable
private fun StatusHeader(order: Order, dateFormat: SimpleDateFormat) {
    val statusColor = when (order.status) {
        OrderStatus.PENDING -> MaterialTheme.colorScheme.tertiary
        OrderStatus.ACCEPTED -> MaterialTheme.colorScheme.primary
        OrderStatus.READY -> MaterialTheme.colorScheme.secondary
        OrderStatus.DELIVERED -> Color(0xFF10B981)
        OrderStatus.COMPLETED -> Color(0xFF059669)
        OrderStatus.CANCELLED -> MaterialTheme.colorScheme.error
        OrderStatus.REJECTED -> MaterialTheme.colorScheme.error
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = statusColor.copy(alpha = 0.1f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = statusColor,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = order.statusDisplayName,
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
                Text(
                    text = order.formattedTotal,
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Placed on ${dateFormat.format(order.createdAt)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (order.updatedAt != order.createdAt) {
                Text(
                    text = "Updated on ${dateFormat.format(order.updatedAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun CustomerInfoCard(order: Order) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Customer Details",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(order.customerName, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("Payment: ${order.paymentMethod} (${order.paymentStatus})", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun OrderItemCard(item: OrderItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, style = MaterialTheme.typography.bodyMedium)
                Text(
                    "Qty: ${item.quantity}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                "KSh %.2f".format(item.price * item.quantity),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun DeliveryInfoCard(order: Order) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Delivery Info",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(order.deliveryAddress, style = MaterialTheme.typography.bodyMedium)
            }

            if (order.deliveryNotes.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Text(
                    "Notes: ${order.deliveryNotes}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (order.driverName.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Driver: ${order.driverName}", style = MaterialTheme.typography.bodySmall)
                }
            }

            Spacer(Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Delivery Fee", style = MaterialTheme.typography.bodySmall)
                Text("KSh %.2f".format(order.deliveryFee), style = MaterialTheme.typography.bodySmall)
            }

            Spacer(Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Total", style = MaterialTheme.typography.titleMedium)
                Text(order.formattedTotal, style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

@Composable
private fun OrderActions(
    status: OrderStatus,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    onReady: () -> Unit,
    onDelivered: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        when (status) {
            OrderStatus.PENDING -> {
                OutlinedButton(
                    onClick = onReject,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Reject Order")
                }
                Button(
                    onClick = onAccept,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Accept Order")
                }
            }
            OrderStatus.ACCEPTED -> {
                Button(
                    onClick = onReady,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Mark as Ready")
                }
            }
            OrderStatus.READY -> {
                Button(
                    onClick = onDelivered,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Mark as Delivered")
                }
            }
            else -> {}
        }
    }
}
