package com.fooddelivery.driver.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsStateWithLifecycle
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.aspectRatio
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.fooddelivery.driver.R
import com.fooddelivery.driver.ui.state.AppViewModel
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    viewModel: AppViewModel = viewModel()
) {
    SmartSokoDriverTheme {
        // Collect state from ViewModel
        val user by viewModel.user.collectAsStateWithLifecycle()
        val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
        val error by viewModel.error.collectAsStateWithLifecycle()
        val earnings by viewModel.earnings.collectAsStateWithLifecycle(0.0)
        val isOnline by viewModel.isOnline.collectAsStateWithLifecycle()

        Column(modifier = Modifier.fillMaxSize()) {
            // App Bar
            TopAppBar(
                title = {
                    Text(
                        text = "Profile",
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
                else -> {
                    // Profile content
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(vertical = 8.dp)
                    ) {
                        // User info section
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                // Profile picture
                                Image(
                                    painter = painterResource(id = R.drawable.ic_person),
                                    contentDescription = "Profile picture",
                                    modifier = Modifier
                                        .size(80.dp)
                                        .aspectRatio(1f)
                                        .clip(CircleShape)
                                        .border(
                                            width = 2.dp,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "${user.firstName} ${user.lastName}",
                                    style = MaterialTheme.typography.titleLarge,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = user.email,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(24.dp))
                                // Status indicator (online/offline)
                                Row(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = if (isOnline) Icons.Default.Circle else Icons.Default.CircleOutlined,
                                        contentDescription = "Status",
                                        tint = if (isOnline) MaterialTheme.colorScheme.success else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (isOnline) "Online" else "Offline",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = if (isOnline) MaterialTheme.colorScheme.success else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        // Earnings section
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Text(
                                    text = "Today's Earnings",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "₦${"%.2f".format(earnings)}",
                                    style = MaterialTheme.typography.displaySmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { /* TODO: Show earnings details */ },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.primary,
                                        contentColor = MaterialTheme.colorScheme.onPrimary
                                    )
                                ) {
                                    Text(
                                        text = "View Details",
                                        style = MaterialTheme.typography.labelLarge
                                    )
                                }
                            }
                        }

                        // Stats section
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Text(
                                    text = "Statistics",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    StatsItem(
                                        label = "Orders Today",
                                        value = "12",
                                        icon = Icons.Default.ShoppingCart
                                    )
                                    StatsItem(
                                        label = "Rating",
                                        value = "4.8",
                                        icon = Icons.Default.Star
                                    )
                                    StatsItem(
                                        label = "Distance",
                                        value = "85 km",
                                        icon = Icons.Default.DirectionsBike
                                    )
                                }
                            }
                        }

                        // Settings section
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp)
                            ) {
                                Text(
                                    text = "Settings",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                SettingsItem(
                                    label = "Notification Settings",
                                    icon = Icons.Default.Notifications,
                                    onClick = { /* TODO: Navigate to notification settings */ }
                                )
                                SettingsItem(
                                    label = "Payment Methods",
                                    icon = Icons.Default.CreditCard,
                                    onClick = { /* TODO: Navigate to payment methods */ }
                                )
                                SettingsItem(
                                    label = "Help & Support",
                                    icon = Icons.Default.Help,
                                    onClick = { /* TODO: Navigate to help & support */ }
                                )
                                SettingsItem(
                                    label = "Logout",
                                    icon = Icons.Default.Logout,
                                    onClick = {
                                        viewModel.signOut()
                                    },
                                    isDestructive = true
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
private fun StatsItem(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun SettingsItem(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    isDestructive: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
            .clickable { onClick() },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.weight(1f))
        Icon(
            imageVector = Icons.Default.ArrowForward,
            contentDescription = "Next",
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
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