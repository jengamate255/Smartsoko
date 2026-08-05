package com.smartsoko.admin.presentation.notifications

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsoko.admin.presentation.theme.*
import com.smartsoko.admin.presentation.viewmodel.AdminViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsContent(
    viewModel: AdminViewModel,
    onBack: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val notifications by viewModel.notifications.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val success by viewModel.successMessage.collectAsStateWithLifecycle()

    var composeTitle by remember { mutableStateOf("") }
    var composeBody by remember { mutableStateOf("") }
    var composeAudience by remember { mutableStateOf("all") }
    var composePriority by remember { mutableStateOf("normal") }
    var composeChannel by remember { mutableStateOf("push") }

    LaunchedEffect(Unit) { viewModel.loadNotifications() }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Notifications Broadcast", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AdminHeaderBg,
                    titleContentColor = Color.White),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                actions = {
                    TextButton(onClick = { selectedTab = 0 }) {
                        Text("Compose", color = if (selectedTab == 0) Color.White else Color.White.copy(alpha = 0.5f))
                    }
                    TextButton(onClick = { selectedTab = 1 }) {
                        Text("History", color = if (selectedTab == 1) Color.White else Color.White.copy(alpha = 0.5f))
                    }
                }
            )
        },
        content = { padding ->
            Column(modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp)) {
                error?.let {
                    Surface(shape = RoundedCornerShape(8.dp), color = AdminError.copy(alpha = 0.1f),
                        modifier = Modifier.fillMaxWidth()) {
                        Text(it, modifier = Modifier.padding(12.dp), fontSize = 13.sp,
                            color = AdminError, fontWeight = FontWeight.W500)
                    }
                    Spacer(Modifier.height(8.dp))
                }
                success?.let {
                    Surface(shape = RoundedCornerShape(8.dp), color = AdminSuccess.copy(alpha = 0.1f),
                        modifier = Modifier.fillMaxWidth()) {
                        Text(it, modifier = Modifier.padding(12.dp), fontSize = 13.sp,
                            color = AdminSuccess, fontWeight = FontWeight.W500)
                    }
                    Spacer(Modifier.height(8.dp))
                }

                if (selectedTab == 0) {
                    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = AdminSurface)) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text("New Notification", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = AdminPrimary)
                            Spacer(Modifier.height(16.dp))

                            OutlinedTextField(value = composeTitle, onValueChange = { composeTitle = it },
                                label = { Text("Title") }, modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp), singleLine = true)
                            Spacer(Modifier.height(12.dp))

                            OutlinedTextField(value = composeBody, onValueChange = { composeBody = it },
                                label = { Text("Body") }, modifier = Modifier.fillMaxWidth().height(100.dp),
                                shape = RoundedCornerShape(12.dp), maxLines = 4)
                            Spacer(Modifier.height(12.dp))

                            Row(modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.weight(1f)) {
                                    Text("Audience", fontSize = 12.sp, color = AdminTextSecondary)
                                    DropdownMenuOption(composeAudience, listOf("all", "drivers", "customers", "sellers")) {
                                        composeAudience = it
                                    }
                                }
                                Spacer(Modifier.width(8.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("Priority", fontSize = 12.sp, color = AdminTextSecondary)
                                    DropdownMenuOption(composePriority, listOf("low", "normal", "high", "urgent")) {
                                        composePriority = it
                                    }
                                }
                                Spacer(Modifier.width(8.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("Channel", fontSize = 12.sp, color = AdminTextSecondary)
                                    DropdownMenuOption(composeChannel, listOf("push", "sms", "email", "all")) {
                                        composeChannel = it
                                    }
                                }
                            }
                            Spacer(Modifier.height(20.dp))

                            Button(
                                onClick = {
                                    viewModel.broadcastNotification(composeTitle, composeBody, composeAudience, composePriority, composeChannel)
                                    composeTitle = ""; composeBody = ""
                                },
                                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(50.dp),
                                enabled = composeTitle.isNotBlank() && !isLoading,
                                colors = ButtonDefaults.buttonColors(containerColor = AdminAccent)
                            ) { Text("Send Broadcast") }
                        }
                    }
                } else {
                    if (isLoading) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else if (notifications.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Notifications, contentDescription = null, modifier = Modifier.size(48.dp), tint = AdminTextHint)
                                Spacer(Modifier.height(8.dp))
                                Text("No notifications yet", color = AdminTextHint)
                            }
                        }
                    } else {
                        LazyColumn {
                            items(notifications) { n ->
                                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = AdminSurface)) {
                                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Notifications, contentDescription = null, tint = AdminPrimary)
                                        Spacer(Modifier.width(12.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(n.title, fontWeight = FontWeight.W600, fontSize = 13.sp)
                                            Text("${n.audience} • ${n.channel}", fontSize = 11.sp, color = AdminTextSecondary)
                                        }
                                        StatusChip(n.status)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DropdownMenuOption(selected: String, options: List<String>, onSelected: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { expanded = true }, shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()) {
            Text(selected.replaceFirstChar { it.uppercase() }, fontSize = 13.sp)
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { opt ->
                DropdownMenuItem(text = { Text(opt.replaceFirstChar { it.uppercase() }) },
                    onClick = { onSelected(opt); expanded = false })
            }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val chipColor = when (status.lowercase()) {
        "sent", "active", "completed", "approved", "success" -> AdminSuccess
        "pending", "scheduled" -> AdminWarning
        "failed", "rejected", "revoked", "inactive" -> AdminError
        else -> AdminTextHint
    }
    Surface(shape = RoundedCornerShape(50.dp), color = chipColor.copy(alpha = 0.15f)) {
        Text(status.replaceFirstChar { it.uppercase() }, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            fontSize = 11.sp, fontWeight = FontWeight.W600, color = chipColor)
    }
}

@Composable
fun StatCardSummary(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, shape = RoundedCornerShape(12.dp), color = AdminSurface) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(label, fontSize = 12.sp, color = AdminTextSecondary)
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = AdminPrimary)
        }
    }
}
