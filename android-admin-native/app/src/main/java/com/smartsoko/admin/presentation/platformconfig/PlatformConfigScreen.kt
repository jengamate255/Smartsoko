package com.smartsoko.admin.presentation.platformconfig

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsoko.admin.presentation.notifications.StatusChip
import com.smartsoko.admin.presentation.theme.*
import com.smartsoko.admin.presentation.viewmodel.AdminViewModel

@Composable
fun PlatformConfigContent(viewModel: AdminViewModel, onBack: () -> Unit) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val webhooks by viewModel.webhooks.collectAsStateWithLifecycle()
    val apiKeys by viewModel.apiKeys.collectAsStateWithLifecycle()
    val auditLogs by viewModel.auditLogs.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.loadWebhooks(); viewModel.loadApiKeys(); viewModel.loadAuditLogs() }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            FilterTab("Webhooks", selectedTab == 0) { selectedTab = 0 }
            FilterTab("API Keys", selectedTab == 1) { selectedTab = 1 }
            FilterTab("Audit Log", selectedTab == 2) { selectedTab = 2 }
        }

        LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
            when (selectedTab) {
                0 -> {
                    item {
                        Spacer(Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("Webhook Endpoints", fontSize = 18.sp, fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.onBackground)
                            FilledTonalButton(onClick = { /* TODO: show create dialog */ },
                                shape = RoundedCornerShape(12.dp)) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Create", fontSize = 13.sp)
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                    }
                    items(webhooks) { w ->
                        Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Webhook, contentDescription = null, tint = AdminPrimary)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(w.name, fontWeight = FontWeight.W600, fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onBackground)
                                    Text(w.url, fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                                }
                                Text(w.events, fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                    modifier = Modifier.widthIn(max = 80.dp))
                                Spacer(Modifier.width(8.dp))
                                StatusChip(w.status)
                                Spacer(Modifier.width(4.dp))
                                IconButton(onClick = { viewModel.deleteWebhook(w.id) },
                                    enabled = !isLoading, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete",
                                        modifier = Modifier.size(18.dp), tint = AdminError)
                                }
                            }
                        }
                    }
                }
                1 -> {
                    item {
                        Spacer(Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("API Keys", fontSize = 18.sp, fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.onBackground)
                            FilledTonalButton(onClick = { /* TODO: show generate dialog */ },
                                shape = RoundedCornerShape(12.dp)) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Generate", fontSize = 13.sp)
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                    }
                    items(apiKeys) { k ->
                        Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.VpnKey, contentDescription = null, tint = AdminPrimary)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(k.name, fontWeight = FontWeight.W600, fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onBackground)
                                    Text(k.key, fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                                }
                                Text(k.permissions, fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                                Spacer(Modifier.width(8.dp))
                                StatusChip(k.status)
                                Spacer(Modifier.width(4.dp))
                                if (k.status == "active") {
                                    IconButton(onClick = { viewModel.revokeApiKey(k.id) },
                                        enabled = !isLoading, modifier = Modifier.size(32.dp)) {
                                        Icon(Icons.Default.Block, contentDescription = "Revoke",
                                            modifier = Modifier.size(18.dp), tint = AdminError)
                                    }
                                }
                            }
                        }
                    }
                }
                2 -> {
                    item {
                        Spacer(Modifier.height(8.dp))
                        Text("Audit Log", fontSize = 18.sp, fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground)
                        Spacer(Modifier.height(16.dp))
                    }
                    items(auditLogs) { log ->
                        Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Surface(shape = RoundedCornerShape(50), color = AdminPrimary.copy(alpha = 0.15f)) {
                                    Icon(Icons.Default.Person, contentDescription = null,
                                        modifier = Modifier.padding(8.dp).size(16.dp), tint = AdminPrimary)
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Row {
                                        Text(log.userName, fontWeight = FontWeight.W600, fontSize = 13.sp,
                                            color = MaterialTheme.colorScheme.onBackground)
                                        Spacer(Modifier.width(8.dp))
                                        Surface(shape = RoundedCornerShape(8.dp), color = AdminPrimary.copy(alpha = 0.08f)) {
                                            Text(log.action, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                fontSize = 10.sp, color = AdminPrimary.copy(alpha = 0.7f))
                                        }
                                    }
                                    Text("${log.details} • ${log.target}", fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                                }
                                Text(log.timestamp, fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterTab(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
        color = if (selected) AdminPrimary else MaterialTheme.colorScheme.surface,
        onClick = onClick
    ) {
        Text(label, modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            fontSize = 13.sp, fontWeight = if (selected) FontWeight.W600 else FontWeight.Normal,
            color = if (selected) Color.White else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
    }
}
