package com.smartsoko.customer.presentation.payment

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.clickable
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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import com.smartsoko.customer.domain.model.PaymentMethod
import com.smartsoko.customer.domain.model.PaymentType
import com.smartsoko.customer.presentation.components.EmptyState
import com.smartsoko.customer.presentation.components.ErrorState
import com.smartsoko.customer.presentation.components.LoadingState

/**
 * Payment Methods management screen (Profile > Payment Methods).
 * Lists saved methods from the server (Cash on Delivery always present),
 * allows adding a mobile-money/card method and deleting saved ones.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentMethodsScreen(
    onNavigateBack: () -> Unit,
    viewModel: PaymentMethodsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showDeleteDialog by remember { mutableStateOf<PaymentMethod?>(null) }
    var showAddDialog by remember { mutableStateOf(false) }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.reload()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    showDeleteDialog?.let { method ->
        AlertDialog(
            onDismissRequest = { showDeleteDialog = null },
            title = { Text("Remove Payment Method") },
            text = { Text("Remove \"${method.displayName}\"?") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deletePaymentMethod(method.id)
                    showDeleteDialog = null
                }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = null }) { Text("Cancel") }
            }
        )
    }

    if (showAddDialog) {
        AddPaymentMethodDialog(
            onDismiss = { showAddDialog = false },
            onAdd = { type, name, lastFour, provider ->
                viewModel.addPaymentMethod(type, name, lastFour, provider)
                showAddDialog = false
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment Methods") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddDialog = true },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Add Method") }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                uiState.isLoading -> LoadingState()
                uiState.error != null -> ErrorState(
                    message = uiState.error ?: "Failed to load payment methods",
                    onRetry = { viewModel.reload() }
                )
                uiState.methods.isEmpty() -> EmptyState(
                    icon = Icons.Default.CreditCard,
                    title = "No Payment Methods",
                    subtitle = "Add a payment method to speed up checkout."
                )
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.methods, key = { it.id }) { method ->
                        PaymentMethodCard(
                            method = method,
                            onDelete = if (method.type == PaymentType.CASH_ON_DELIVERY) null else {
                                { showDeleteDialog = method }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentMethodCard(
    method: PaymentMethod,
    onDelete: (() -> Unit)?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = when (method.type) {
                    PaymentType.CASH_ON_DELIVERY, PaymentType.PESAPAL -> Icons.Default.Payments
                    PaymentType.MPESA -> Icons.Default.PhoneAndroid
                    PaymentType.CARD -> Icons.Default.CreditCard
                    else -> Icons.Default.AccountBalance
                },
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(method.displayName, fontWeight = FontWeight.SemiBold)
                Text(
                    text = method.type.name.lowercase().replace('_', ' ')
                        .replaceFirstChar { it.uppercase() }
                        + (method.lastFourDigits?.let { " •••• $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (method.isDefault) {
                Text(
                    "Default",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(Modifier.width(8.dp))
            }
            if (onDelete != null) {
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Remove",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
private fun AddPaymentMethodDialog(
    onDismiss: () -> Unit,
    onAdd: (type: PaymentType, displayName: String, lastFour: String?, provider: String?) -> Unit
) {
    var selectedType by remember { mutableStateOf(PaymentType.MPESA) }
    var displayName by remember { mutableStateOf("") }
    var lastFour by remember { mutableStateOf("") }
    var provider by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Payment Method") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(PaymentType.PESAPAL, PaymentType.CARD).forEach { t ->
                        FilterChip(
                            selected = selectedType == t,
                            onClick = { selectedType = t },
                            label = { Text(if (t == PaymentType.PESAPAL) "Mobile Money / Card (PesaPal)" else "Card") }
                        )
                    }
                }
                OutlinedTextField(
                    value = displayName,
                    onValueChange = { displayName = it },
                    label = { Text(if (selectedType == PaymentType.PESAPAL) "Label (e.g. My M-Pesa)" else "Display name (e.g. Visa 1234)") },
                    singleLine = true
                )
                if (selectedType == PaymentType.CARD) {
                    OutlinedTextField(
                        value = lastFour,
                        onValueChange = { if (it.length <= 4) lastFour = it.filter { c -> c.isDigit() } },
                        label = { Text("Last 4 digits") },
                        singleLine = true
                    )
                } else {
                    OutlinedTextField(
                        value = provider,
                        onValueChange = { provider = it },
                        label = { Text("Provider (e.g. Vodacom / Airtel)") },
                        singleLine = true
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val name = displayName.trim()
                    if (name.isNotEmpty()) {
                        onAdd(
                            selectedType,
                            name,
                            lastFour.takeIf { it.length == 4 },
                            provider.trim().takeIf { it.isNotEmpty() }
                        )
                    }
                },
                enabled = displayName.isNotBlank()
            ) { Text("Add") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
