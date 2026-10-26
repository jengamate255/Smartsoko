package com.smartsoko.admin.ui.screens.orders

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.admin.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    orderId: String,
    viewModel: OrdersViewModel = hiltViewModel()
) {
    val detailState by viewModel.detailState.collectAsState()

    LaunchedEffect(orderId) { viewModel.loadOrderDetail(orderId) }

    var showNoteDialog by remember { mutableStateOf(false) }
    var noteText by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_number, orderId.takeLast(8)), fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary, titleContentColor = MaterialTheme.colorScheme.onPrimary),
                navigationIcon = {
                    IconButton(onClick = { /* navController.popBackStack() */ }) { Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.cd_back), tint = MaterialTheme.colorScheme.onPrimary) }
                },
                actions = {
                    IconButton(onClick = { showNoteDialog = true }) { Icon(Icons.Default.NoteAdd, contentDescription = stringResource(R.string.cd_add_note), tint = MaterialTheme.colorScheme.onPrimary) }
                }
            )
        }
    ) { padding ->
        if (detailState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { LoadingIndicator() }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Order info
                item {
                    Card(shape = MaterialTheme.shapes.large) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(stringResource(R.string.order_details), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                val statusColor = when (detailState.order?.status) {
                                    "delivered" -> MaterialTheme.colorScheme.primary; "cancelled" -> MaterialTheme.colorScheme.error; else -> MaterialTheme.colorScheme.secondary
                                }
                                Surface(shape = MaterialTheme.shapes.small, color = statusColor.copy(alpha = 0.15f)) {
                                    Text(detailState.order?.status ?: "pending", modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp), style = MaterialTheme.typography.labelMedium, color = statusColor)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Row { Text(stringResource(R.string.label_customer), style = MaterialTheme.typography.bodySmall); Text(detailState.order?.customerName ?: "—", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium) }
                            Row { Text(stringResource(R.string.label_amount), style = MaterialTheme.typography.bodySmall); Text("TSh ${String.format("%.0f", detailState.order?.totalAmount ?: 0.0)}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold) }
                            Row { Text(stringResource(R.string.label_delivery), style = MaterialTheme.typography.bodySmall); Text(detailState.order?.deliveryAddress ?: "—", style = MaterialTheme.typography.bodySmall) }
                            Row { Text(stringResource(R.string.label_created), style = MaterialTheme.typography.bodySmall); Text(detailState.order?.createdAt ?: "—", style = MaterialTheme.typography.bodySmall) }
                        }
                    }
                }

                // Items
                item {
                    Card(shape = MaterialTheme.shapes.large) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(stringResource(R.string.items_count, detailState.order?.items?.size ?: 0), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(8.dp))
                            detailState.order?.items?.forEach { item ->
                                Row(modifier = Modifier.padding(vertical = 4.dp)) {
                                    Column(modifier = Modifier.weight(1f)) { Text(item.name ?: stringResource(R.string.fallback_item), style = MaterialTheme.typography.bodySmall); Text("x${item.quantity ?: 1}", style = MaterialTheme.typography.labelSmall) }
                                    Text("TSh ${String.format("%.0f", (item.price ?: 0.0) * (item.quantity ?: 1))}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                    }
                }

                // Timeline
                item {
                    Card(shape = MaterialTheme.shapes.large) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(stringResource(R.string.timeline), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(8.dp))
                            if (detailState.timeline.isEmpty()) {
                                Text(stringResource(R.string.no_events_yet), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } else {
                                detailState.timeline.forEach { event ->
                                    Row(modifier = Modifier.padding(vertical = 4.dp)) {
                                        Icon(Icons.Default.Circle, contentDescription = null, modifier = Modifier.size(8.dp), tint = MaterialTheme.colorScheme.primary)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(event.detail ?: event.type ?: "", style = MaterialTheme.typography.bodySmall)
                                            Text("${event.actor ?: ""} • ${event.timestamp ?: ""}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Internal notes
                item {
                    Card(shape = MaterialTheme.shapes.large) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(stringResource(R.string.internal_notes), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(8.dp))
                            val notes = detailState.order?.internalNotes ?: emptyList()
                            if (notes.isEmpty()) { Text(stringResource(R.string.no_notes), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            else { notes.forEach { n -> Text("• ${n.note ?: ""}", style = MaterialTheme.typography.bodySmall) } }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }

        // Add Note Dialog
        if (showNoteDialog) {
            AlertDialog(
                onDismissRequest = { showNoteDialog = false; noteText = "" },
                title = { Text(stringResource(R.string.add_internal_note)) },
                text = { OutlinedTextField(value = noteText, onValueChange = { noteText = it }, placeholder = { Text(stringResource(R.string.note_placeholder)) }, modifier = Modifier.fillMaxWidth()) },
                confirmButton = {
                    TextButton(onClick = {
                        if (noteText.isNotBlank()) { viewModel.addNote(orderId, noteText); showNoteDialog = false; noteText = "" }
                    }) { Text(stringResource(R.string.save)) }
                },
                dismissButton = { TextButton(onClick = { showNoteDialog = false; noteText = "" }) { Text(stringResource(R.string.cancel)) } }
            )
        }
    }
}

@Composable
private fun LoadingIndicator(modifier: Modifier = Modifier) {
    androidx.compose.ui.viewinterop.AndroidView(
        factory = { ctx: android.content.Context ->
            android.widget.ProgressBar(ctx)
        },
        modifier = modifier
    )
}
