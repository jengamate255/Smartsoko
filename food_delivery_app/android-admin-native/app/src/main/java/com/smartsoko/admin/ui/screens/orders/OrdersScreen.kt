package com.smartsoko.admin.ui.screens.orders

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(
    onOrderClick: (String) -> Unit,
    viewModel: OrdersViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadOrders() }

    var showFilterMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Orders", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary, titleContentColor = MaterialTheme.colorScheme.onPrimary),
                actions = {
                    Box {
                        IconButton(onClick = { showFilterMenu = true }) { Icon(Icons.Default.FilterList, contentDescription = "Filter", tint = MaterialTheme.colorScheme.onPrimary) }
                        DropdownMenu(expanded = showFilterMenu, onDismissRequest = { showFilterMenu = false }) {
                            listOf("all", "pending", "processing", "shipped", "delivered", "cancelled").forEach { s ->
                                DropdownMenuItem(text = { Text(s.replaceFirstChar { it.uppercase() }) }, onClick = { viewModel.setStatusFilter(s); showFilterMenu = false })
                            }
                        }
                    }
                    IconButton(onClick = { viewModel.loadOrders() }) { Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = MaterialTheme.colorScheme.onPrimary) }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { LoadingIndicator() }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
                item { Text("${uiState.orders.size} order(s)", modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                items(uiState.orders, key = { it.id ?: "" }) { order ->
                    Card(
                        onClick = { order.id?.let { onOrderClick(it) } },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        shape = MaterialTheme.shapes.medium,
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Order #${(order.id ?: "").takeLast(8)}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                Text(order.customerName ?: order.customerEmail ?: "Guest", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    val statusColor = when (order.status) {
                                        "delivered" -> MaterialTheme.colorScheme.primary
                                        "cancelled" -> MaterialTheme.colorScheme.error
                                        "pending" -> MaterialTheme.colorScheme.tertiary
                                        else -> MaterialTheme.colorScheme.secondary
                                    }
                                    Surface(shape = MaterialTheme.shapes.small, color = statusColor.copy(alpha = 0.15f)) {
                                        Text(order.status ?: "pending", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = statusColor)
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(order.createdAt?.take(10) ?: "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Text("TSh ${String.format("%.0f", order.totalAmount ?: 0.0)}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun LoadingIndicator(modifier: Modifier = Modifier) {
    androidx.compose.ui.viewinterop.AndroidView(
        factory = { ctx: android.content.Context ->
            android.widget.ProgressBar(ctx)
        },
        modifier = modifier
    )
}
