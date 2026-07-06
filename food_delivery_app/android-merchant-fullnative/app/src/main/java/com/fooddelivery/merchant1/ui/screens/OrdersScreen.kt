package com.fooddelivery.merchant1.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fooddelivery.merchant1.data.model.Order
import com.fooddelivery.merchant1.data.model.OrderStatus
import com.fooddelivery.merchant1.ui.viewmodel.OrderFilter
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    orders: List<Order>,
    currentFilter: OrderFilter,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onOrderClick: (Order) -> Unit,
    onFilterChange: (OrderFilter) -> Unit,
    onAcceptOrder: (String) -> Unit,
    onRejectOrder: (String) -> Unit,
    onMarkReady: (String) -> Unit,
    onMarkDelivered: (String) -> Unit,
    onRefresh: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Search bar with refresh button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { onSearchQueryChange(it) },
                placeholder = { Text("Search orders") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { onSearchQueryChange("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(onClick = onRefresh) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh")
            }
        }

        // Filter tabs
        ScrollableTabRow(selectedTabIndex = currentFilter.ordinal) {
            OrderFilter.values().forEach { filter ->
                Tab(
                    selected = currentFilter == filter,
                    onClick = { onFilterChange(filter) },
                    text = { Text(filter.name) }
                )
            }
        }

        if (orders.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    if (searchQuery.isNotEmpty()) "No orders match your search" else "No orders found",
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(orders) { order ->
                    OrderCard(
                        order = order,
                        onClick = { onOrderClick(order) },
                        onAccept = { onAcceptOrder(order.id) },
                        onReject = { onRejectOrder(order.id) },
                        onReady = { onMarkReady(order.id) },
                        onDelivered = { onMarkDelivered(order.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun OrderCard(
    order: Order,
    onClick: () -> Unit,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    onReady: () -> Unit,
    onDelivered: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Order #${order.id.take(8)}",
                    style = MaterialTheme.typography.titleMedium
                )
                StatusChip(status = order.status)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = order.customerName,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = order.customerPhone,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = order.formattedItems,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = dateFormat.format(order.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = order.formattedTotal,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // Action buttons
            when (order.status) {
                OrderStatus.PENDING -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onReject,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Reject")
                        }
                        Button(
                            onClick = onAccept,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Accept")
                        }
                    }
                }
                OrderStatus.ACCEPTED -> {
                    Button(
                        onClick = onReady,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                    ) {
                        Text("Mark as Ready")
                    }
                }
                OrderStatus.READY -> {
                    Button(
                        onClick = onDelivered,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                    ) {
                        Text("Mark as Delivered")
                    }
                }
                else -> {}
            }
        }
    }
}

@Composable
fun StatusChip(status: OrderStatus) {
    val (color, text) = when (status) {
        OrderStatus.PENDING -> MaterialTheme.colorScheme.tertiary to "Pending"
        OrderStatus.ACCEPTED -> MaterialTheme.colorScheme.primary to "Accepted"
        OrderStatus.READY -> MaterialTheme.colorScheme.secondary to "Ready"
        OrderStatus.DELIVERED -> MaterialTheme.colorScheme.primary to "Delivered"
        OrderStatus.COMPLETED -> MaterialTheme.colorScheme.primary to "Completed"
        OrderStatus.CANCELLED -> MaterialTheme.colorScheme.error to "Cancelled"
        OrderStatus.REJECTED -> MaterialTheme.colorScheme.error to "Rejected"
    }

    Surface(
        color = color.copy(alpha = 0.2f),
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = text,
            color = color,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
