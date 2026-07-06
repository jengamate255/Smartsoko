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
fun OrderDetailScreen(
    viewModel: AppViewModel = viewModel(),
    orderId: String = "sample_order_123" // In real app, this would come from navigation arguments
) {
    SmartSokoDriverTheme {
        // Collect state from ViewModel
        val order by viewModel.orderDetails.collectAsStateWithLifecycle(null)
        val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
        val error by viewModel.error.collectAsStateWithLifecycle()
        val user by viewModel.user.collectAsStateWithLifecycle()
        val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()

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
                backgroundColor = MaterialTheme.colorScheme.primary
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
                    // Order details content
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(vertical = 8.dp)
                    ) {
                        // Order header
                        item {
                            OrderHeader(order = order)
                        }

                        // Customer info
                        item {
                            CustomerInfoSection(
                                customerName = order.customerName,
                                customerPhone = order.customerPhone,
                                onCallClick = { /* TODO: Implement call functionality */ }
                            )
                        }

                        // Pickup location
                        item {
                            LocationSection(
                                title = "Pickup Location",
                                address = order.pickupAddress,
                                onNavigateClick = { /* TODO: Navigate to pickup */ }
                            )
                        }

                        // Delivery location
                        item {
                            LocationSection(
                                title = "Delivery Location",
                                address = order.deliveryAddress,
                                onNavigateClick = { /* TODO: Navigate to delivery */ }
                            )
                        }

                        // Order items
                        item {
                            OrderItemsSection(items = order.items)
                        }

                        // Order summary
                        item {
                            OrderSummarySection(
                                subtotal = order.subtotal,
                                tax = order.tax,
                                deliveryFee = order.deliveryFee,
                                total = order.totalAmount
                            )
                        }

                        // Action buttons (if order is active)
                        if (order.status.in(listOf("pending", "accepted", "picked_up"))) {
                            item {
                                OrderActionsSection(
                                    order = order,
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
private fun OrderHeader(order: Order) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Status indicator
        Column(
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = getOrderIcon(order.status),
                contentDescription = "Order status",
                tint = getOrderColor(order.status),
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

        // Status text
        Text(
            text = order.status.replace('_', ' ').titlecase(),
            style = MaterialTheme.typography.labelLarge,
            color = getOrderColor(order.status),
            modifier = Modifier
                .padding(8.dp)
                .background(getOrderColor(order.status).copy(alpha = 0.2f))
                .wrapContentWidth(align = Alignment.Center)
        )
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
private fun OrderItemsSection(items: List<Order.OrderItem>) {
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
        LazyColumn(
            modifier = Modifier.fillMaxWidth()
        ) {
            items(items) { item ->
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
}

@Composable
private fun OrderItemRow(item: Order.OrderItem) {
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
                        onClick = { /* TODO: Reject order */ },
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
                        onClick = { /* TODO: Accept order */ },
                        enabled = isOnline,
                        modifier = Modifier.weight(0.45f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.success,
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
                    onClick = { /* TODO: Mark as picked up */ },
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
                    onClick = { /* TODO: Mark as delivered */ },
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

@Composable
private fun LoginScreen(
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

private fun getOrderIcon(status: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (status.toLowerCase()) {
        "completed" -> Icons.Default.CheckCircle
        "cancelled" -> Icons.Default.Cancel
        "delivered" -> Icons.Default.LocalShipping
        "picked_up" -> Icons.Default.LocalPickup
        "accepted" -> Icons.Default.CheckCircleOutline
        else -> Icons.Default.Receipt
    }
}

private fun getOrderColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.toLowerCase()) {
        "completed" -> MaterialTheme.colorScheme.success
        "cancelled" -> MaterialTheme.colorScheme.error
        "delivered" -> MaterialTheme.colorScheme.secondary
        "picked_up" -> MaterialTheme.colorScheme.tertiary
        "accepted" -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
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