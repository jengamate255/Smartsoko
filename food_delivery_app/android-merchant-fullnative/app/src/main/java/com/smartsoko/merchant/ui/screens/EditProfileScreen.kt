package com.smartsoko.merchant.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.smartsoko.merchant.data.model.Merchant
import com.smartsoko.merchant.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    merchant: Merchant,
    isLoading: Boolean,
    onBack: () -> Unit,
    onSave: (
        name: String,
        phone: String,
        address: String,
        description: String,
        deliveryFee: Double,
        minOrderAmount: Double,
        deliveryTime: String
    ) -> Unit
) {
    var name by remember(merchant) { mutableStateOf(merchant.name) }
    var phone by remember(merchant) { mutableStateOf(merchant.phone) }
    var address by remember(merchant) { mutableStateOf(merchant.address) }
    var description by remember(merchant) { mutableStateOf(merchant.description) }
    var deliveryFee by remember(merchant) { mutableStateOf(merchant.deliveryFee.toString()) }
    var minOrderAmount by remember(merchant) { mutableStateOf(merchant.minOrderAmount.toString()) }
    var deliveryTime by remember(merchant) { mutableStateOf(merchant.deliveryTime) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Profile") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Store Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isLoading
            )

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 4,
                enabled = !isLoading
            )

            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                enabled = !isLoading
            )

            OutlinedTextField(
                value = address,
                onValueChange = { address = it },
                label = { Text("Address") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 3,
                enabled = !isLoading
            )

            HorizontalDivider()

            Text("Delivery Settings", style = MaterialTheme.typography.titleSmall)

            OutlinedTextField(
                value = deliveryFee,
                onValueChange = { deliveryFee = it },
                label = { Text("Delivery Fee (tsh)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                enabled = !isLoading
            )

            OutlinedTextField(
                value = minOrderAmount,
                onValueChange = { minOrderAmount = it },
                label = { Text("Minimum Order Amount (tsh)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                enabled = !isLoading
            )

            OutlinedTextField(
                value = deliveryTime,
                onValueChange = { deliveryTime = it },
                label = { Text("Delivery Time (e.g. 30-45 min)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isLoading
            )

            Spacer(Modifier.height(16.dp))

            PrimaryButton(
                text = "Save Changes",
                onClick = {
                    onSave(
                        name.trim(),
                        phone.trim(),
                        address.trim(),
                        description.trim(),
                        deliveryFee.toDoubleOrNull() ?: 0.0,
                        minOrderAmount.toDoubleOrNull() ?: 0.0,
                        deliveryTime.trim()
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                isLoading = isLoading
            )
        }
    }
}
