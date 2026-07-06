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

@Composable
fun HistoryScreen(
    viewModel: AppViewModel = viewModel()
) {
    SmartSokoDriverTheme {
        // Collect state from ViewModel
        val pastOrders by viewModel.pastOrders.collectAsStateWithLifecycle(emptyList())
        val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
        val error by viewModel.error.collectAsStateWithLifecycle()
        val user by viewModel.user.collectAsStateWithLifecycle()

        Column(modifier = Modifier.fillMaxSize()) {
            // App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "Order History",
                        style = MaterialTheme.typography.titleMedium
                    )
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
                pastOrders.isEmpty() -> {
                    // Show empty state
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(24.dp)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.ic_history),
                                contentDescription = "Order History",
                                modifier = Modifier.size(80.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "No past orders yet",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Your completed orders will appear here",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
                else -> {
                    // Orders list
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        items(pastOrders) { order ->
                            OrderHistoryItem(
                                order = order,
                                onOrderClick = { /* TODO: Navigate to order detail */ }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderHistoryItem(
    order: Order,
    onOrderClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable { onOrderClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            // Order icon/status
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
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "₦${order.totalAmount}",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(
                        imageVector = Icons.Default.ArrowForward,
                        contentDescription = "View details",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
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
        else -> Icons.Default.Receipt
    }
}

private fun getOrderColor(status: String): androidx.compose.ui.graphics.Color {
    return when (status.toLowerCase()) {
        "completed" -> MaterialTheme.colorScheme.success
        "cancelled" -> MaterialTheme.colorScheme.error
        "delivered" -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.primary
    }
}

private fun formatTimestamp(timestampString: String): String {
    // Simple timestamp formatting - in production, use proper date parsing
    try {
        // Assuming ISO timestamp format
        val time = java.time.Instant.parse(timestampString)
        val dayOfWeek = time.atZone(java.time.ZoneId.systemDefault()).dayOfWeek.displayName(java.time.format.TextStyle.SHORT, java.util.Locale.getDefault())
        val month = time.atZone(java.time.ZoneId.systemDefault()).monthValue
        val dayOfMonth = time.atZone(java.time.ZoneId.systemDefault()).dayOfMonth
        return "$dayOfWeek, $month/$dayOfMonth"
    } catch (e: Exception) {
        return timestampString.take(10) // Fallback to first 10 chars
    }
}