package com.fooddelivery.driver.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.livedata.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.fooddelivery.driver.R
import com.fooddelivery.driver.data.model.Order
import com.fooddelivery.driver.ui.state.AppViewModel
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme
import androidx.lifecycle.viewmodel.compose.viewModel
import java.util.Locale
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: AppViewModel = viewModel(),
    navController: NavHostController
) {
    SmartSokoDriverTheme {
        // Collect state from ViewModel with lifecycle awareness
        val orders by viewModel.orders.observeAsState(emptyList())
        val isLoading by viewModel.isLoading.observeAsState(false)
        val user by viewModel.user.observeAsState()
        val error by viewModel.error.observeAsState()
        val isOnline by viewModel.isOnline.observeAsState(false)

        // Fetch available orders from the backend when the screen appears
        LaunchedEffect(user) {
            if (user != null) {
                viewModel.loadAvailableOrders()
            }
        }

        Column(modifier = Modifier.fillMaxSize()) {
            // App Bar
            TopAppBar(
                title = { 
                    Text(
                        text = if (user != null) "Welcome, ${user?.fullName?.split(' ')?.firstOrNull() ?: "Driver"}" else "Driver App",
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary),
                actions = {
                    IconButton(
                        onClick = { /* TODO: Open notifications */ }
                    ) {
                        Icon(
                            imageVector = Icons.Default.NotificationsNone,
                            contentDescription = "Notifications",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            )

            // Show error if any
            error?.let { errorMessage ->
                Snackbar(
                    modifier = Modifier.fillMaxWidth(),
                    action = { 
                        TextButton(onClick = { viewModel.clearError() }) {
                            Text("Dismiss")
                        }
                    },
                    content = { Text(text = errorMessage) },
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError
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
                orders.isEmpty() -> {
                    // Show empty state or call to action
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(24.dp)
                    ) {
                        Column(
                            modifier = Modifier.align(Alignment.Center),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(80.dp)
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Inbox,
                                    contentDescription = "No orders",
                                    modifier = Modifier.size(40.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "No orders available",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Go online to start receiving orders",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = { 
                                    viewModel.toggleOnlineStatus(!isOnline)
                                },
                                modifier = Modifier.width(200.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary
                                )
                            ) {
                                Text(
                                    text = if (isOnline) "Go Offline" else "Go Online",
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                        }
                    }
                }
                else -> {
                    // Show list of orders
                    Column(
                        modifier = Modifier.weight(1f, fill = false)
                    ) {
                        // Orders count and filter
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val orderText = "${orders.size} ${if (orders.size == 1) "order" else "orders"} available"
                            Text(
                                text = orderText,
                                style = MaterialTheme.typography.titleMedium
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            // TODO: Add filter/icon buttons here
                        }
                        
                        Divider(color = MaterialTheme.colorScheme.outline, thickness = 1.dp)
                        
                        // Orders list
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp)
                        ) {
                            items(orders) { order ->
                                OrderCard(
                                    order = order,
                                    onAcceptClicked = { 
                                        viewModel.acceptOrder(order.id)
                                    },
                                    onOrderClicked = { 
                                        navController.navigate("order-detail/${order.id}")
                                    }
                                )
                                Divider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 1.dp)
                            }
                        }
                    }
                }
            }
            
            // Bottom action bar - online status toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = if (isOnline) Icons.Default.RadioButtonChecked else Icons.Default.RadioButtonUnchecked,
                        contentDescription = if (isOnline) "Online" else "Offline",
                        tint = if (isOnline) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = if (isOnline) "Online and ready to receive orders" else "Offline - you won't receive new orders",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                Button(
                    onClick = { 
                        viewModel.toggleOnlineStatus(!isOnline)
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isOnline) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(
                        text = if (isOnline) "Go Offline" else "Go Online",
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderCard(
    order: Order,
    onAcceptClicked: () -> Unit,
    onOrderClicked: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp)
            .clickable { onOrderClicked() },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 8.dp)
                ) {
                    Text(
                        text = "${order.restaurantName}",
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1
                    )
                    Text(
                        text = "TZS ${order.totalAmount.toInt()}",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "${order.customerName ?: "Anonymous"} • ${calculateDistance(order)} km",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                // Accept button
                Button(
                    onClick = onAcceptClicked,
                    modifier = Modifier.padding(start = 8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(text = "Accept")
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 1.dp)
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Items: ${order.items.size}",
                    style = MaterialTheme.typography.bodyLarge
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = order.status.uppercase(Locale.getDefault()),
                    style = MaterialTheme.typography.bodyLarge,
                    color = when (order.status) {
                        "assigned" -> MaterialTheme.colorScheme.tertiary
                        "accepted" -> MaterialTheme.colorScheme.primary
                        "picked_up" -> MaterialTheme.colorScheme.primary
                        "in_transit" -> MaterialTheme.colorScheme.secondary
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }
        }
    }
}

@Composable
private fun calculateDistance(order: Order): Int {
    // Simple distance calculation (would be replaced with Haversine formula in production)
    val driverLat = -1.2921  // Simulated driver location (Nairobi)
    val driverLng = 36.8219
    
    val restaurantLat = order.restaurantLocation.lat
    val restaurantLng = order.restaurantLocation.lng
    
    // Haversine formula
    val R = 6371.0 // Earth radius in km
    val dLat = Math.toRadians(restaurantLat - driverLat)
    val dLng = Math.toRadians(restaurantLng - driverLng)
    val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(driverLat)) * Math.cos(Math.toRadians(restaurantLat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
    val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    val distance = R * c
    
    return distance.toInt()
}