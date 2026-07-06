package com.fooddelivery.driver.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsStateWithLifecycle
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.fooddelivery.driver.R
import com.fooddelivery.driver.data.model.Order
import com.fooddelivery.driver.ui.state.AppViewModel
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    viewModel: AppViewModel = viewModel()
) {
    SmartSokoDriverTheme {
        // Collect state from ViewModel with lifecycle awareness
        val orders by viewModel.orders.collectAsStateWithLifecycle()
        val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
        val user by viewModel.user.collectAsStateWithLifecycle()
        val error by viewModel.error.collectAsStateWithLifecycle()
        val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()

        Column(modifier = Modifier.fillMaxSize()) {
            // App Bar
            TopAppBar(
                title = { 
                    Text(
                        text = if (user != null) "Welcome, ${user?.fullName?.split(' ').first() ?: "Driver"}" else "Driver App",
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                backgroundColor = MaterialTheme.colorScheme.primary,
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
                        TextButton(onClick = { /* TODO: Dismiss snackbar */ }) {
                            Text("Dismiss")
                        }
                    },
                    label = { Text(text = errorMessage) },
                    backgroundColor = MaterialTheme.colorScheme.error,
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
                    LoginScreen(
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
                            Image(
                                painter = painterResource(id = R.drawable.ic_empty_orders),
                                contentDescription = "No orders",
                                modifier = Modifier.size(80.dp)
                            )
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
                                    // TODO: Toggle online status
                                    // viewModel.toggleOnlineStatus(!isOnline)
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
                    Column {
                        // Orders count and filter
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${orders.size} ${if (orders.size == 1) \"order\" else \"orders\"} available",
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
                                        // TODO: Navigate to order details or map
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
                        tint = if (isOnline) MaterialTheme.colorScheme.success else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = if (isOnline) "Online and ready to receive orders" else "Offline - you won't receive new orders",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                Button(
                    onClick = { 
                        // TODO: Toggle online status
                        // viewModel.toggleOnlineStatus(!isOnline)
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
fun LoginScreen(
    onLoginSuccess: (String, String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    SmartSokoDriverTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_logo),
                    contentDescription = "SmartSoko Driver",
                    modifier = Modifier.size(80.dp)
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "Welcome to SmartSoko Driver",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(16.dp))
                TextField(
                    label = { Text("Email") },
                    value = email,
                    onValueChange = { email = it },
                    isError = email.isEmpty(),
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = "Email",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    label = { Text("Password") },
                    value = password,
                    onValueChange = { password = it },
                    isError = password.isEmpty(),
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Password",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    },
                    isPassword = true
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = {
                        if (email.isNotEmpty() && password.isNotEmpty()) {
                            loading = true
                            onLoginSuccess(email, password)
                            loading = false
                        }
                    },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text(
                            text = "Sign In",
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Don't have an account? Contact support to create one.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
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
        elevation = 2.dp,
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
                        "assigned" -> MaterialTheme.colorScheme.warning
                        "accepted" -> MaterialTheme.colorScheme.primary
                        "picked_up" -> MaterialTheme.colorScheme.success
                        "in_transit" -> MaterialTheme.colorScheme.info
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