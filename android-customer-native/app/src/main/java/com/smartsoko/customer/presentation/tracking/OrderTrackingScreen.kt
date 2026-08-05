package com.smartsoko.customer.presentation.tracking
import androidx.compose.material3.ExperimentalMaterial3Api

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.smartsoko.customer.R
import com.smartsoko.customer.presentation.theme.SmartsokoTheme
import com.smartsoko.customer.presentation.theme.Success
import com.smartsoko.customer.presentation.theme.Warning

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderTrackingScreen(
    navController: NavController,
    orderId: String,
    onNavigateBack: () -> Unit = { navController.popBackStack() }
) {
    SmartsokoTheme {
        Column(modifier = Modifier.fillMaxSize()) {
            TopAppBar(
                title = { Text(text = stringResource(R.string.tracking_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
            
            // Map placeholder
            MapPlaceholder()
            
            // Order status timeline
            OrderStatusTimeline(orderId = orderId)
            
            // Action buttons
            ActionButtons()
        }
    }
}

@Composable
private fun MapPlaceholder() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.LocalShipping,
                    contentDescription = "Map",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(48.dp)
                )
                androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 8.dp))
                Text(text = "Live Map View", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(text = "Driver is on the way", color = MaterialTheme.colorScheme.primary, fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun OrderStatusTimeline(orderId: String) {
    val steps = listOf(
        OrderStep(stringResource(R.string.orders_status_confirmed), true, true, "10:30 AM"),
        OrderStep(stringResource(R.string.orders_status_preparing), true, true, "10:35 AM"),
        OrderStep(stringResource(R.string.orders_status_ready), true, true, "11:00 AM"),
        OrderStep(stringResource(R.string.orders_status_on_the_way), true, false, "11:05 AM"),
        OrderStep(stringResource(R.string.orders_status_delivered), false, false, "--:--")
    )
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Order #$orderId",
                fontSize = 18.sp,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
            )
            
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 16.dp))
            
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                itemsIndexed(steps) { index, step ->
                    OrderStepRow(
                        step = step,
                        isFirst = index == 0,
                        isLast = index == steps.lastIndex
                    )
                }
            }
            
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 16.dp))
            
            Divider()
            
            // Delivery info
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 16.dp))
            
            DeliveryInfo()
        }
    }
}

@Composable
private fun OrderStepRow(
    step: OrderStep,
    isFirst: Boolean,
    isLast: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth()
    ) {
        // Timeline indicator
        Column(
            modifier = Modifier.padding(end = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Status icon
            Box(
                modifier = Modifier.size(24.dp)
            ) {
                if (step.isCompleted) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Completed",
                        tint = Success,
                        modifier = Modifier.align(Alignment.Center)
                    )
                } else if (step.isCurrent) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .background(MaterialTheme.colorScheme.primary)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .background(MaterialTheme.colorScheme.outlineVariant)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                    )
                }
            }
            
            // Connecting line
            if (!isLast) {
                androidx.compose.foundation.layout.Spacer(modifier = Modifier
                    .width(2.dp)
                    .fillMaxHeight()
                    .background(if (step.isCompleted) Success else MaterialTheme.colorScheme.outlineVariant)
                )
            }
        }
        
        // Step info
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(top = 4.dp)
        ) {
            Text(
                text = step.title,
                fontWeight = if (step.isCurrent) androidx.compose.ui.text.font.FontWeight.Bold else androidx.compose.ui.text.font.FontWeight.Normal,
                color = if (step.isCurrent) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
            )
            if (step.time != "--:--") {
                Text(
                    text = step.time,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun DeliveryInfo() {
    Column {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(text = "Driver", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(text = "James Mwangi", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { /* TODO: Call driver */ }) {
                    Icon(Icons.Default.Call, contentDescription = "Call", tint = MaterialTheme.colorScheme.primary)
                }
                IconButton(onClick = { /* TODO: Chat with driver */ }) {
                    Icon(Icons.Default.Chat, contentDescription = "Chat", tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
        
        androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 8.dp))
        
        Row {
            Column {
                Text(text = "Vehicle", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(text = "Toyota Vitz - KCA 123D", fontWeight = androidx.compose.ui.text.font.FontWeight.Medium)
            }
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
            Column {
                Text(text = "Rating", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    androidx.compose.material3.Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "Rating",
                        tint = Warning,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(text = "4.8", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ActionButtons() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Button(
                onClick = { /* TODO: Call driver */ },
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Call, contentDescription = "Call", modifier = Modifier.size(20.dp))
                    androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(end = 8.dp))
                    Text(text = "Call Driver", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                }
            }
            
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(top = 12.dp))
            
            androidx.compose.material3.OutlinedButton(
                onClick = { /* TODO: Chat with driver */ },
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Chat, contentDescription = "Chat", modifier = Modifier.size(20.dp))
                    androidx.compose.foundation.layout.Spacer(modifier = Modifier.padding(end = 8.dp))
                    Text(text = "Chat with Driver", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                }
            }
        }
    }
}

data class OrderStep(
    val title: String,
    val isCompleted: Boolean,
    val isCurrent: Boolean,
    val time: String
)