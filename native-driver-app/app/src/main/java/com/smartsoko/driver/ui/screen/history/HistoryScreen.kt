package com.smartsoko.driver.ui.screen.history

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.ui.components.EmptyState
import com.smartsoko.driver.ui.components.LoadingOverlay
import com.smartsoko.driver.ui.components.StatusBadge
import com.smartsoko.driver.util.formatTimestamp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("History", fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        if (state.isLoading) {
            LoadingOverlay(modifier = Modifier.padding(padding))
        } else if (state.orders.isEmpty()) {
            EmptyState(
                icon = { Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary) },
                title = "No deliveries yet",
                subtitle = "Your completed deliveries will appear here",
                modifier = Modifier.padding(padding)
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.orders) { order ->
                    OrderHistoryCard(order = order)
                }
            }
        }
    }
}

@Composable
private fun OrderHistoryCard(order: Order) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = when (order.status.name.lowercase()) {
                    "delivered" -> Icons.Default.CheckCircle
                    "cancelled" -> Icons.Default.Cancel
                    else -> Icons.Default.Receipt
                },
                contentDescription = null,
                tint = if (order.status.name == "DELIVERED") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                modifier = Modifier.size(40.dp)
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(order.pickupName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(order.dropoffAddress, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                Text(order.createdAt.formatTimestamp(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("TZS ${order.deliveryFee.toInt()}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(4.dp))
                StatusBadge(text = order.status.displayName, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
