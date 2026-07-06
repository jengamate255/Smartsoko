package com.smartsoko.merchant.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartsoko.merchant.data.model.Order
import com.smartsoko.merchant.data.model.OrderStatus

@Composable
fun AnalyticsScreen(
    orders: List<Order>
) {
    val stats = remember(orders) {
        calculateStats(orders)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            "Dashboard",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Stats Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            StatCard(
                title = "Total Revenue",
                value = "KSh %.2f".format(stats.totalRevenue),
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "Total Orders",
                value = stats.totalOrders.toString(),
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            StatCard(
                title = "Pending",
                value = stats.pendingOrders.toString(),
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.tertiary
            )
            StatCard(
                title = "Completed",
                value = stats.completedOrders.toString(),
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.primary
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Recent Activity
        Text(
            "Recent Activity",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        if (orders.isEmpty()) {
            Text(
                "No orders yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            orders.take(5).forEach { order ->
                ActivityItem(order = order)
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    color: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.primary
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                color = color
            )
        }
    }
}

@Composable
fun ActivityItem(order: Order) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text(
                text = "Order #${order.id.take(8)}",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = order.customerName,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Text(
            text = order.formattedTotal,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

private data class OrderStats(
    val totalRevenue: Double,
    val totalOrders: Int,
    val pendingOrders: Int,
    val completedOrders: Int
)

private fun calculateStats(orders: List<Order>): OrderStats {
    val totalRevenue = orders.sumOf { it.totalAmount }
    val pending = orders.count { it.status in listOf(OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.READY) }
    val completed = orders.count { it.status in listOf(OrderStatus.DELIVERED, OrderStatus.COMPLETED) }

    return OrderStats(
        totalRevenue = totalRevenue,
        totalOrders = orders.size,
        pendingOrders = pending,
        completedOrders = completed
    )
}
