package com.smartsoko.driver.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartsoko.driver.R
import com.smartsoko.driver.data.model.Driver
import com.smartsoko.driver.ui.components.*

@Composable
fun ProfileScreen(
    driver: Driver?,
    isLoading: Boolean = false,
    onToggleOnline: (Boolean) -> Unit,
    onUpdateProfile: (String, String, String, String, (Boolean) -> Unit) -> Unit,
    onSignOut: () -> Unit
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text(stringResource(R.string.sign_out)) },
            text = { Text(stringResource(R.string.sign_out_confirm)) },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    onSignOut()
                }) {
                    Text(stringResource(R.string.sign_out), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    if (showEditDialog && driver != null) {
        EditProfileDialog(
            driver = driver,
            isLoading = isLoading,
            onDismiss = { showEditDialog = false },
            onSave = { name, phone, vehicleType, vehiclePlate, onDone ->
                onUpdateProfile(name, phone, vehicleType, vehiclePlate, onDone)
                showEditDialog = false
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            stringResource(R.string.profile),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = SmartRadius,
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = if (driver?.isOnline == true) {
                CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f)
                )
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
                    Surface(
                        modifier = Modifier.size(44.dp),
                        shape = SmartRadiusSmall,
                        color = if (driver?.isOnline == true) {
                            MaterialTheme.colorScheme.secondaryContainer
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = if (driver?.isOnline == true) {
                                    MaterialTheme.colorScheme.onSecondaryContainer
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(stringResource(R.string.online_status), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            if (driver?.isOnline == true) stringResource(R.string.online_accepting) else stringResource(R.string.offline_not_accepting),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Switch(
                    checked = driver?.isOnline == true,
                    onCheckedChange = { onToggleOnline(it) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        SmartCard {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(36.dp),
                        shape = SmartRadiusSmall,
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.AccountCircle,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.driver_information),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                IconButton(onClick = { showEditDialog = true }, enabled = driver != null) {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = stringResource(R.string.edit_profile_description),
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Spacer(Modifier.height(8.dp))

            driver?.let {
                DriverInfoRow(label = stringResource(R.string.name), value = it.name)
                DriverInfoRow(label = stringResource(R.string.phone), value = it.phone)
                DriverInfoRow(label = stringResource(R.string.email), value = it.email)
                DriverInfoRow(label = stringResource(R.string.vehicle_type), value = it.vehicleType)
                DriverInfoRow(label = stringResource(R.string.vehicle_plate), value = it.vehiclePlate)
                if (it.rating > 0.0) {
                    DriverInfoRow(label = stringResource(R.string.rating), value = stringResource(R.string.rating_format, it.rating, it.reviewCount))
                }
            } ?: run {
                Text(
                    stringResource(R.string.loading_driver_info),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        SmartCard {
            Text(
                stringResource(R.string.account),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            SecondaryButton(
                text = stringResource(R.string.sign_out),
                onClick = { showLogoutDialog = true },
                leadingIcon = {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, modifier = Modifier.size(18.dp))
                }
            )
        }
    }
}

@Composable
private fun EditProfileDialog(
    driver: Driver,
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, (Boolean) -> Unit) -> Unit
) {
    var name by remember { mutableStateOf(driver.name) }
    var phone by remember { mutableStateOf(driver.phone) }
    var vehicleType by remember { mutableStateOf(driver.vehicleType) }
    var vehiclePlate by remember { mutableStateOf(driver.vehiclePlate) }
    var nameError by remember { mutableStateOf<String?>(null) }
    val nameRequired = stringResource(R.string.name_required)

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        title = { Text(stringResource(R.string.edit_profile)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        nameError = if (it.isBlank()) nameRequired else null
                    },
                    label = { Text(stringResource(R.string.name)) },
                    isError = nameError != null,
                    supportingText = nameError?.let { { Text(it) } },
                    singleLine = true
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text(stringResource(R.string.phone)) },
                    singleLine = true
                )
                OutlinedTextField(
                    value = vehicleType,
                    onValueChange = { vehicleType = it },
                    label = { Text(stringResource(R.string.vehicle_type_example)) },
                    singleLine = true
                )
                OutlinedTextField(
                    value = vehiclePlate,
                    onValueChange = { vehiclePlate = it },
                    label = { Text(stringResource(R.string.vehicle_plate)) },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (name.isBlank()) {
                        nameError = nameRequired
                    } else {
                        onSave(name.trim(), phone.trim(), vehicleType.trim(), vehiclePlate.trim()) { }
                    }
                },
                enabled = !isLoading && name.isNotBlank()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text(stringResource(R.string.save))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isLoading) { Text(stringResource(R.string.cancel)) }
        }
    )
}

@Composable
fun DriverInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value.ifEmpty { "\u2014" },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}
