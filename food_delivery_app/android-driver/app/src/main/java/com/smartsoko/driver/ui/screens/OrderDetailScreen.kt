package com.smartsoko.driver.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import android.content.Intent
import android.net.Uri
import com.smartsoko.driver.R
import com.smartsoko.driver.data.model.Order
import com.smartsoko.driver.data.model.OrderItem
import com.smartsoko.driver.data.model.OrderStatus
import com.smartsoko.driver.ui.components.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    order: Order,
    onBack: () -> Unit,
    onAcceptOrder: (String) -> Unit,
    onDeclineOrder: (String) -> Unit,
    onMarkPickedUp: (String) -> Unit,
    onMarkDelivered: (String) -> Unit,
    onOpenMap: (Order) -> Unit = {}
) {
    val dateFormat = remember { SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_number, order.id.take(8))) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                DriverStatusHeader(order = order, dateFormat = dateFormat)
            }

            item {
                DriverCustomerInfoCard(order = order)
            }

            item {
                Text(
                    stringResource(R.string.order_items),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }

            if (order.items.isEmpty()) {
                item {
                    Text(
                        stringResource(R.string.no_item_details),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(order.items) { item ->
                    DriverOrderItemCard(item = item)
                }
            }

            item {
                DriverDeliveryInfoCard(order = order)
            }

            item {
                DriverOrderActions(
                    status = order.status,
                    onAccept = { onAcceptOrder(order.id) },
                    onDecline = { onDeclineOrder(order.id) },
                    onPickedUp = { onMarkPickedUp(order.id) },
                    onDelivered = { onMarkDelivered(order.id) },
                    onNavigate = { onOpenMap(order) }
                )
            }
        }
    }
}

@Composable
private fun DriverStatusHeader(order: Order, dateFormat: SimpleDateFormat) {
    val (statusColor, statusContainerColor) = when (order.status) {
        OrderStatus.PENDING -> MaterialTheme.colorScheme.tertiary to MaterialTheme.colorScheme.tertiaryContainer
        OrderStatus.ACCEPTED -> MaterialTheme.colorScheme.primary to MaterialTheme.colorScheme.primaryContainer
        OrderStatus.READY -> MaterialTheme.colorScheme.secondary to MaterialTheme.colorScheme.secondaryContainer
        OrderStatus.PICKEDUP -> MaterialTheme.colorScheme.secondary to MaterialTheme.colorScheme.secondaryContainer
        OrderStatus.DELIVERED -> MaterialTheme.colorScheme.primary to MaterialTheme.colorScheme.primaryContainer
        OrderStatus.COMPLETED -> MaterialTheme.colorScheme.secondary to MaterialTheme.colorScheme.secondaryContainer
        OrderStatus.CANCELLED -> MaterialTheme.colorScheme.error to MaterialTheme.colorScheme.errorContainer
        OrderStatus.REJECTED -> MaterialTheme.colorScheme.error to MaterialTheme.colorScheme.errorContainer
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = SmartRadius,
        colors = CardDefaults.cardColors(
            containerColor = statusContainerColor.copy(alpha = 0.3f)
        )
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                DriverStatusChip(status = order.status)
                Text(
                    text = order.formattedTotal,
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = stringResource(R.string.placed_on, dateFormat.format(order.createdAt)),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (order.updatedAt != order.createdAt) {
                Text(
                    text = stringResource(R.string.updated_on, dateFormat.format(order.updatedAt)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun DriverCustomerInfoCard(order: Order) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = SmartRadius,
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                stringResource(R.string.customer_details),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = SmartRadiusSmall,
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            order.customerName.take(1).uppercase(),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(order.customerName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    Text(
                        stringResource(R.string.phone_prefix, order.customerPhone),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Spacer(Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.ShoppingCart,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "${order.paymentMethod} \u00B7 ${order.paymentStatus}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun DriverOrderItemCard(item: OrderItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = SmartRadiusSmall,
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                Text(
                    stringResource(R.string.qty_prefix, item.quantity),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                "tsh %.2f".format(item.price * item.quantity),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun DriverDeliveryInfoCard(order: Order) {
    val context = LocalContext.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = SmartRadius,
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                stringResource(R.string.delivery_info),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(Modifier.width(8.dp))
                Text(order.deliveryAddress, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                // Call customer
                OutlinedButton(
                    onClick = {
                        if (order.customerPhone.isNotEmpty()) {
                            context.startActivity(
                                Intent(Intent.ACTION_DIAL, Uri.parse("tel:${order.customerPhone}"))
                            )
                        }
                    },
                    enabled = order.customerPhone.isNotEmpty(),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.call))
                }
                // Navigate to dropoff address
                Button(
                    onClick = {
                        val address = Uri.encode(order.deliveryAddress.ifEmpty { "Tanzania" })
                        context.startActivity(
                            Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("geo:0,0?q=$address")
                            )
                        )
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.navigate))
                }
            }

            if (order.deliveryNotes.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Surface(
                    shape = SmartRadiusSmall,
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ) {
                    Text(
                        stringResource(R.string.notes_prefix, order.deliveryNotes),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(stringResource(R.string.delivery_fee), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("tsh %.2f".format(order.deliveryFee), style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(stringResource(R.string.total), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(order.formattedTotal, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Composable
private fun DriverOrderActions(
    status: OrderStatus,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    onPickedUp: () -> Unit,
    onDelivered: () -> Unit,
    onNavigate: () -> Unit = {}
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        when (status) {
            OrderStatus.PENDING, OrderStatus.READY -> {
                PrimaryButton(
                    text = stringResource(R.string.accept_order),
                    onClick = onAccept,
                    leadingIcon = {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                    }
                )
                OutlinedButton(
                    onClick = onDecline,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(stringResource(R.string.decline))
                }
            }
            OrderStatus.ACCEPTED, OrderStatus.PICKEDUP -> {
                PrimaryButton(
                    text = stringResource(R.string.navigate_to_customer),
                    onClick = onNavigate,
                    leadingIcon = {
                        Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(20.dp))
                    }
                )
                if (status == OrderStatus.ACCEPTED) {
                    PrimaryButton(
                        text = stringResource(R.string.mark_as_picked_up),
                        onClick = onPickedUp,
                        leadingIcon = {
                            Icon(Icons.Default.LocalShipping, contentDescription = null, modifier = Modifier.size(20.dp))
                        }
                    )
                    OutlinedButton(
                        onClick = onDecline,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(stringResource(R.string.release_order))
                    }
                } else {
                    PrimaryButton(
                        text = stringResource(R.string.mark_as_delivered),
                        onClick = onDelivered,
                        leadingIcon = {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                        }
                    )
                }
            }
            else -> {}
        }
    }
}
