package com.smartsoko.admin.presentation.finance

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
import com.smartsoko.admin.presentation.notifications.StatCardSummary
import com.smartsoko.admin.presentation.notifications.StatusChip
import com.smartsoko.admin.presentation.theme.*
import com.smartsoko.admin.presentation.viewmodel.AdminViewModel

@Composable
fun FinanceContent(viewModel: AdminViewModel, onBack: () -> Unit) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val payouts by viewModel.payouts.collectAsStateWithLifecycle()
    val refunds by viewModel.refunds.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.loadPayouts(); viewModel.loadRefunds() }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            FilterTab("Payouts", selectedTab == 0) { selectedTab = 0 }
            FilterTab("Refunds", selectedTab == 1) { selectedTab = 1 }
        }

        LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
            if (selectedTab == 0) {
                item {
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCardSummary("Pending", "TSh 4.2M", Modifier.weight(1f))
                        StatCardSummary("Today", "TSh 8.1M", Modifier.weight(1f))
                        StatCardSummary("Failed", "TSh 2.1M", Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(24.dp))
                    Text("Payout Batches", fontSize = 18.sp, fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground)
                    Spacer(Modifier.height(12.dp))
                }
                items(payouts) { p ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = AdminPrimary)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(p.id, fontWeight = FontWeight.W600, fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onBackground)
                                Text("${p.driverName} • ${p.createdAt}",
                                    fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                            }
                            Text("TSh ${"%.0f".format(p.amount)}", fontWeight = FontWeight.Bold, fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onBackground)
                            Spacer(Modifier.width(8.dp))
                            StatusChip(p.status)
                            Spacer(Modifier.width(4.dp))
                            IconButton(onClick = { viewModel.processPayout(p.id) },
                                enabled = !isLoading && p.status != "completed",
                                modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Process",
                                    modifier = Modifier.size(18.dp), tint = AdminSuccess)
                            }
                        }
                    }
                }
            } else {
                item {
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCardSummary("Pending", "${refunds.count { it.status == "pending" }}", Modifier.weight(1f))
                        StatCardSummary("Approved", "TSh 67,500", Modifier.weight(1f))
                        StatCardSummary("Rejected", "TSh 22,500", Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(24.dp))
                    Text("Refund Requests", fontSize = 18.sp, fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground)
                    Spacer(Modifier.height(12.dp))
                }
                items(refunds) { r ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Receipt, contentDescription = null, tint = AdminPrimary)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text("${r.id} • ${r.orderId}", fontWeight = FontWeight.W600, fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onBackground)
                                Text(r.reason, fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                            }
                            Text("TSh ${"%.0f".format(r.amount)}", fontWeight = FontWeight.Bold, fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onBackground)
                            Spacer(Modifier.width(8.dp))
                            if (r.status == "pending") {
                                IconButton(onClick = { viewModel.approveRefund(r.id) },
                                    enabled = !isLoading, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = "Approve",
                                        modifier = Modifier.size(18.dp), tint = AdminSuccess)
                                }
                                IconButton(onClick = { viewModel.resolveDispute(r.id, "rejected") },
                                    enabled = !isLoading, modifier = Modifier.size(32.dp)) {
                                    Icon(Icons.Default.Cancel, contentDescription = "Reject",
                                        modifier = Modifier.size(18.dp), tint = AdminError)
                                }
                            } else {
                                StatusChip(r.status)
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
