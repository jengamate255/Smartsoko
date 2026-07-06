package com.fooddelivery.merchant1.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fooddelivery.merchant1.data.model.Merchant

@Composable
fun SettingsScreen(
    merchant: Merchant?,
    onEditProfile: () -> Unit,
    onToggleStoreOpen: (Boolean) -> Unit,
    onSignOut: () -> Unit
) {
    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign Out") },
            text = { Text("Are you sure you want to sign out?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    onSignOut()
                }) {
                    Text("Sign Out", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            "Settings",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Store Status Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = if (merchant?.isOpen == true) {
                CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
            } else {
                CardDefaults.cardColors()
            }
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Place,
                        contentDescription = null,
                        tint = if (merchant?.isOpen == true) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Store Status", style = MaterialTheme.typography.titleMedium)
                        Text(
                            if (merchant?.isOpen == true) "Open - accepting orders" else "Closed - not accepting orders",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Switch(
                    checked = merchant?.isOpen == true,
                    onCheckedChange = { onToggleStoreOpen(it) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Store Info Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Store Information",
                        style = MaterialTheme.typography.titleMedium
                    )
                    TextButton(onClick = onEditProfile) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Edit")
                    }
                }

                Spacer(Modifier.height(8.dp))

                merchant?.let {
                    InfoRow(label = "Store Name", value = it.name)
                    InfoRow(label = "Category", value = it.category)
                    InfoRow(label = "Phone", value = it.phone)
                    InfoRow(label = "Email", value = it.email)
                    InfoRow(label = "Address", value = it.address)
                    if (it.description.isNotEmpty()) {
                        InfoRow(label = "Description", value = it.description)
                    }
                    InfoRow(label = "Delivery Fee", value = "KSh %.2f".format(it.deliveryFee))
                    InfoRow(label = "Min Order", value = "KSh %.2f".format(it.minOrderAmount))
                    InfoRow(label = "Delivery Time", value = it.deliveryTime)
                } ?: run {
                    Text(
                        "Loading store information...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Account Actions
        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "Account",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                OutlinedButton(
                    onClick = { showLogoutDialog = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Sign Out")
                }
            }
        }
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value.ifEmpty { "—" },
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
