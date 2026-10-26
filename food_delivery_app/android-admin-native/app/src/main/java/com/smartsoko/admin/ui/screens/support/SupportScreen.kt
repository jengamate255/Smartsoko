package com.smartsoko.admin.ui.screens.support

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.admin.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportScreen(
    viewModel: SupportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadData() }

    var showCreateDialog by remember { mutableStateOf(false) }
    var showFilterMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.support), fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary, titleContentColor = MaterialTheme.colorScheme.onPrimary),
                actions = {
                    Box {
                        IconButton(onClick = { showFilterMenu = true }) { Icon(Icons.Default.FilterList, contentDescription = stringResource(R.string.cd_filter), tint = MaterialTheme.colorScheme.onPrimary) }
                        DropdownMenu(expanded = showFilterMenu, onDismissRequest = { showFilterMenu = false }) {
                            listOf("all", "open", "in_progress", "resolved", "closed").forEach { s ->
                                DropdownMenuItem(text = { Text(s.replace("_", " ").replaceFirstChar { it.uppercase() }) }, onClick = { viewModel.setStatusFilter(s); showFilterMenu = false })
                            }
                        }
                    }
                    IconButton(onClick = { viewModel.loadData() }) { Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.cd_refresh), tint = MaterialTheme.colorScheme.onPrimary) }
                }
            )
        },
        floatingActionButton = { FloatingActionButton(onClick = { showCreateDialog = true }) { Icon(Icons.Default.Add, contentDescription = stringResource(R.string.cd_new_ticket)) } }
    ) { padding ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { LoadingIndicator() }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
                // SLA Metrics
                uiState.slaMetrics?.let { sla ->
                    item {
                        Card(modifier = Modifier.fillMaxWidth().padding(16.dp), shape = MaterialTheme.shapes.large) {
                            Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${sla.open ?: 0}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error); Text(stringResource(R.string.sla_open), style = MaterialTheme.typography.labelSmall) }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${sla.inProgress ?: 0}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary); Text(stringResource(R.string.sla_progress), style = MaterialTheme.typography.labelSmall) }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${sla.resolved ?: 0}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary); Text(stringResource(R.string.sla_resolved), style = MaterialTheme.typography.labelSmall) }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${sla.breached ?: 0}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error); Text(stringResource(R.string.sla_breached), style = MaterialTheme.typography.labelSmall) }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) { Text("${sla.avgResolutionHours?.toInt() ?: 0}h", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text(stringResource(R.string.sla_avg_time), style = MaterialTheme.typography.labelSmall) }
                            }
                        }
                    }
                }

                // Filtered tickets
                val filtered = if (uiState.statusFilter == "all") uiState.tickets
                else uiState.tickets.filter { it.status == uiState.statusFilter }

                item { Text(stringResource(R.string.tickets_count, filtered.size), modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }

                items(filtered, key = { it.id ?: "" }) { ticket ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        shape = MaterialTheme.shapes.medium,
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    if (ticket.priority == "high") Icons.Default.PriorityHigh else Icons.Default.Remove,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = when (ticket.priority) { "high" -> MaterialTheme.colorScheme.error; "low" -> MaterialTheme.colorScheme.onSurfaceVariant; else -> MaterialTheme.colorScheme.secondary }
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(ticket.subject ?: stringResource(R.string.no_subject), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                Surface(shape = MaterialTheme.shapes.small, color = when (ticket.status) { "open" -> MaterialTheme.colorScheme.errorContainer; "in_progress" -> MaterialTheme.colorScheme.secondaryContainer; else -> MaterialTheme.colorScheme.primaryContainer }) {
                                    Text(ticket.status?.replace("_", " ") ?: "open", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall)
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(ticket.description?.take(100) ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(ticket.customerName ?: "—", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (ticket.assignedTo?.isNotBlank() == true) {
                                    Text(stringResource(R.string.assigned_to, ticket.assignedTo), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }

        // Create Ticket Dialog
        if (showCreateDialog) {
            var subject by remember { mutableStateOf("") }
            var description by remember { mutableStateOf("") }
            var customerName by remember { mutableStateOf("") }
            var customerEmail by remember { mutableStateOf("") }
            var priority by remember { mutableStateOf("medium") }

            AlertDialog(
                onDismissRequest = { showCreateDialog = false },
                title = { Text(stringResource(R.string.new_support_ticket)) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = subject, onValueChange = { subject = it }, label = { Text(stringResource(R.string.field_subject_required)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text(stringResource(R.string.field_description_required)) }, modifier = Modifier.fillMaxWidth(), maxLines = 3)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = customerName, onValueChange = { customerName = it }, label = { Text(stringResource(R.string.customer_name)) }, singleLine = true, modifier = Modifier.weight(1f))
                            OutlinedTextField(value = customerEmail, onValueChange = { customerEmail = it }, label = { Text(stringResource(R.string.customer_email)) }, singleLine = true, modifier = Modifier.weight(1f))
                        }
                        var expanded by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                            OutlinedTextField(value = priority.replaceFirstChar { it.uppercase() }, onValueChange = {}, readOnly = true, label = { Text(stringResource(R.string.priority)) }, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) }, modifier = Modifier.menuAnchor().fillMaxWidth())
                            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                listOf("low", "medium", "high").forEach { p ->
                                    DropdownMenuItem(text = { Text(p.replaceFirstChar { it.uppercase() }) }, onClick = { priority = p; expanded = false })
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        if (subject.isNotBlank() && description.isNotBlank()) {
                            showCreateDialog = false
                        }
                    }) { Text(stringResource(R.string.create)) }
                },
                dismissButton = { TextButton(onClick = { showCreateDialog = false }) { Text(stringResource(R.string.cancel)) } }
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
