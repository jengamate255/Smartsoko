package com.smartsoko.merchant.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartsoko.merchant.data.model.Order
import com.smartsoko.merchant.ui.components.*
import com.smartsoko.merchant.data.model.OrderStatus
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.max

@Composable
fun AnalyticsScreen(
    orders: List<Order>
) {
    val stats = remember(orders) {
        calculateStats(orders)
    }

    val dailyRevenue = remember(orders) {
        calculateDailyRevenue(orders, 7)
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
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            StatCard(
                title = "Total Revenue",
                value = "tsh %.2f".format(stats.totalRevenue),
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

        Text(
            "Revenue (Last 7 Days)",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        SmartCard {
            if (dailyRevenue.isEmpty() || dailyRevenue.all { it.revenue == 0.0 }) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No revenue data yet",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    RevenueChart(
                        data = dailyRevenue,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                    )
                }
            }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            "Recent Activity",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        if (orders.isEmpty()) {
            Text(
                "No orders yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            SmartCard {
                orders.take(5).forEachIndexed { index, order ->
                        ActivityItem(order = order)
                        if (index < minOf(orders.size, 5) - 1) {
                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 16.dp),
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
        }
    }
}

@Composable
fun RevenueChart(
    data: List<DailyRevenue>,
    modifier: Modifier = Modifier
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val primaryContainerColor = MaterialTheme.colorScheme.primaryContainer
    val onSurfaceVariantColor = MaterialTheme.colorScheme.onSurfaceVariant

    val maxRevenue = data.maxOf { it.revenue }.coerceAtLeast(1.0)
    val dayLabelFormat = remember { SimpleDateFormat("EEE", Locale.getDefault()) }

    Column(modifier = modifier) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            if (data.isEmpty()) return@Canvas

            val barWidth = size.width / (data.size * 1.5f)
            val gap = barWidth / 2
            val chartHeight = size.height

            data.forEachIndexed { index, day ->
                val barHeight = (day.revenue / maxRevenue * chartHeight * 0.85f).toFloat()
                val x = index * (barWidth + gap) + gap
                val y = chartHeight - barHeight

                drawRoundRect(
                    color = primaryColor,
                    topLeft = Offset(x, y),
                    size = Size(barWidth, barHeight),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
                )

                // Background bar
                drawRect(
                    color = primaryContainerColor.copy(alpha = 0.2f),
                    topLeft = Offset(x, 0f),
                    size = Size(barWidth, chartHeight)
                )
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            data.forEach { day ->
                Text(
                    text = dayLabelFormat.format(day.date),
                    style = MaterialTheme.typography.labelSmall,
                    color = onSurfaceVariantColor,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary
) {
    Card(
        modifier = modifier,
        shape = SmartRadius,
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
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                color = color,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun ActivityItem(order: Order) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "Order #${order.id.take(8)}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
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
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.SemiBold
        )
    }
}

private data class OrderStats(
    val totalRevenue: Double,
    val totalOrders: Int,
    val pendingOrders: Int,
    val completedOrders: Int
)

data class DailyRevenue(
    val date: Date,
    val revenue: Double
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

private fun calculateDailyRevenue(orders: List<Order>, days: Int): List<DailyRevenue> {
    val calendar = Calendar.getInstance()
    val today = calendar.time
    val dayFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    val result = mutableListOf<DailyRevenue>()
    for (i in (days - 1) downTo 0) {
        calendar.time = today
        calendar.add(Calendar.DAY_OF_YEAR, -i)
        val day = calendar.time
        val dayString = dayFormat.format(day)

        val revenue = orders
            .filter { dayFormat.format(it.createdAt) == dayString }
            .sumOf { it.totalAmount }

        result.add(DailyRevenue(date = day, revenue = revenue))
    }
    return result
}
