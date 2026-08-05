package com.smartsoko.admin.presentation.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsoko.admin.presentation.theme.*
import com.smartsoko.admin.presentation.viewmodel.AdminViewModel

@Composable
fun DashboardContent(viewModel: AdminViewModel) {
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val stats by viewModel.dashboardStats.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.loadDashboardStats() }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        item {
            Text("Welcome back!", fontSize = 22.sp, fontWeight = FontWeight.W800, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(4.dp))
            Text("Here's what's happening on your platform today.",
                fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            Spacer(Modifier.height(24.dp))
        }

        item {
            if (isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(16.dp))
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth()) {
                StatCard(
                    title = "Active Sessions",
                    value = formatNumber(stats.activeSessions),
                    subtitle = "+12.5% from yesterday",
                    icon = Icons.Default.People,
                    modifier = Modifier.weight(1f)
                )
                Spacer(Modifier.width(12.dp))
                StatCard(
                    title = "Pending Tasks",
                    value = stats.pendingTasks.toString(),
                    subtitle = "${(18..30).random()} urgent",
                    icon = Icons.Default.TaskAlt,
                    modifier = Modifier.weight(1f)
                )
                Spacer(Modifier.width(12.dp))
                StatCard(
                    title = "Notifications Sent",
                    value = formatNumber(stats.notificationsSent),
                    subtitle = "${stats.deliveryRate} delivery rate",
                    icon = Icons.Default.Campaign,
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(Modifier.height(32.dp))
        }

        item {
            Text("Quick Access", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(16.dp))
        }

        item {
            Row(modifier = Modifier.fillMaxWidth()) {
                QuickAccessCard(Icons.Default.Campaign, "Broadcast", Modifier.weight(1f))
                Spacer(Modifier.width(12.dp))
                QuickAccessCard(Icons.Default.Shield, "RBAC", Modifier.weight(1f))
                Spacer(Modifier.width(12.dp))
                QuickAccessCard(Icons.Default.Payments, "Finance Ops", Modifier.weight(1f))
                Spacer(Modifier.width(12.dp))
                QuickAccessCard(Icons.Default.Settings, "Config", Modifier.weight(1f))
            }
            Spacer(Modifier.height(32.dp))
        }

        item {
            Text("Recent Activity", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(16.dp))
        }

        val activities = stats.recentActivity.ifEmpty {
            listOf("No recent activity")
        }
        items(activities) { activity ->
            Surface(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surface
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Circle, contentDescription = null,
                        modifier = Modifier.size(8.dp), tint = AdminAccent)
                    Spacer(Modifier.width(12.dp))
                    Text(activity, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    }
}

@Composable
fun StatCard(title: String, value: String, subtitle: String, icon: ImageVector, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 4.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp),
                    tint = AdminPrimaryLight)
                Spacer(Modifier.width(8.dp))
                Text(title, fontSize = 11.sp, fontWeight = FontWeight.W500,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
            Spacer(Modifier.height(8.dp))
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.W800,
                color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(4.dp))
            Text(subtitle, fontSize = 11.sp, fontWeight = FontWeight.W600, color = AdminAccent)
        }
    }
}

@Composable
fun QuickAccessCard(icon: ImageVector, label: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier.padding(20.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(28.dp),
                tint = AdminPrimaryLight)
            Spacer(Modifier.height(8.dp))
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.W600,
                color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

private fun formatNumber(n: Int): String = when {
    n >= 1000 -> "${n / 1000}.${(n % 1000) / 100}k"
    else -> n.toString()
}
