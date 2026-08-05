package com.smartsoko.admin.presentation.rbac

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
fun RBACContent(viewModel: AdminViewModel, onBack: () -> Unit) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val roles by viewModel.roles.collectAsStateWithLifecycle()
    val assignments by viewModel.assignments.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.loadRoles(); viewModel.loadAssignments() }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            FilterTab("Roles", selectedTab == 0) { selectedTab = 0 }
            FilterTab("Assignments", selectedTab == 1) { selectedTab = 1 }
        }

        LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
            if (selectedTab == 0) {
                item {
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("Role Definitions", fontSize = 20.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f),
                            color = MaterialTheme.colorScheme.onBackground)
                        FilledTonalButton(
                            onClick = { /* TODO: show create dialog */ },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Create", fontSize = 13.sp)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
                items(roles) { role ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Shield, contentDescription = null, tint = AdminPrimaryLight)
                                Spacer(Modifier.width(12.dp))
                                Text(role.name, fontWeight = FontWeight.W600, fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.onBackground)
                                Spacer(Modifier.weight(1f))
                                Text("${role.userCount} users", fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                                Spacer(Modifier.width(8.dp))
                                IconButton(onClick = { /* TODO: edit */ }, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.Default.Edit, contentDescription = "Edit", modifier = Modifier.size(16.dp),
                                        tint = AdminTextHint)
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            Text("${role.permissions.size} permissions", fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                        }
                    }
                }
            } else {
                item {
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("User-Role Assignments", fontSize = 20.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f),
                            color = MaterialTheme.colorScheme.onBackground)
                        FilledTonalButton(
                            onClick = { /* TODO: show assign dialog */ },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Assign", fontSize = 13.sp)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
                items(assignments) { a ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = RoundedCornerShape(50), color = AdminPrimary) {
                                Text(if (a.userName.isNotEmpty()) a.userName.first().toString() else "?",
                                    modifier = Modifier.padding(12.dp),
                                    color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(a.userName, fontWeight = FontWeight.W600, fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onBackground)
                                Text(a.userEmail, fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                            }
                            StatusChip(a.role)
                            Spacer(Modifier.width(8.dp))
                            StatusChip(a.status)
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
