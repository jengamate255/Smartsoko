package com.smartsoko.customer.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.customer.domain.model.User
import com.smartsoko.customer.presentation.components.ErrorState
import com.smartsoko.customer.presentation.components.LoadingState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigateToOrders: () -> Unit,
    onNavigateToAddresses: () -> Unit,
    onNavigateToPaymentMethods: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.logoutComplete) {
        if (uiState.logoutComplete) {
            onNavigateToLogin()
            viewModel.clearNavigation()
        }
    }

    LaunchedEffect(uiState.navigateToOrders) {
        if (uiState.navigateToOrders) {
            onNavigateToOrders()
            viewModel.clearNavigation()
        }
    }

    LaunchedEffect(uiState.navigateToAddresses) {
        if (uiState.navigateToAddresses) {
            onNavigateToAddresses()
            viewModel.clearNavigation()
        }
    }

    LaunchedEffect(uiState.navigateToPaymentMethods) {
        if (uiState.navigateToPaymentMethods) {
            onNavigateToPaymentMethods()
            viewModel.clearNavigation()
        }
    }

    LaunchedEffect(uiState.navigateToSettings) {
        if (uiState.navigateToSettings) {
            onNavigateToSettings()
            viewModel.clearNavigation()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when {
                uiState.isLoading -> LoadingState()
                uiState.error != null -> ErrorState(
                    message = uiState.error,
                    onRetry = { viewModel.clearNavigation() }
                )
                else -> ProfileContent(
                    uiState = uiState,
                    onMenuItemClick = { item ->
                        when (item) {
                            ProfileMenuItemType.ORDERS -> viewModel.navigateToOrders()
                            ProfileMenuItemType.ADDRESSES -> viewModel.navigateToAddresses()
                            ProfileMenuItemType.PAYMENT_METHODS -> viewModel.navigateToPaymentMethods()
                            ProfileMenuItemType.SETTINGS -> viewModel.navigateToSettings()
                            ProfileMenuItemType.LOGOUT -> viewModel.logout()
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun ProfileContent(
    uiState: ProfileUiState,
    onMenuItemClick: (ProfileMenuItemType) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { UserProfileCard(user = uiState.user) }
        item { StatsSection(uiState = uiState) }
        item {
            ProfileMenuSection { item ->
                when (item) {
                    ProfileMenuItemType.ORDERS -> Unit
                    ProfileMenuItemType.ADDRESSES -> Unit
                    ProfileMenuItemType.PAYMENT_METHODS -> Unit
                    ProfileMenuItemType.SETTINGS -> Unit
                    ProfileMenuItemType.LOGOUT -> Unit
                }
                onMenuItemClick(item)
            }
        }
        item {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Version 1.0.0",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
private fun UserProfileCard(user: User?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = (user?.name?.firstOrNull()?.toString() ?: "U"),
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(
                text = user?.name ?: "User",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = user?.email ?: "",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(16.dp))
            OutlinedButton(
                onClick = { },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Edit Profile")
            }
        }
    }
}

@Composable
private fun StatsSection(uiState: ProfileUiState) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                label = "Orders",
                value = uiState.orderCount.toString(),
                icon = Icons.Default.ShoppingBag
            )
            StatItem(
                label = "Addresses",
                value = uiState.addressCount.toString(),
                icon = Icons.Default.LocationOn
            )
            StatItem(
                label = "Payments",
                value = uiState.paymentMethodCount.toString(),
                icon = Icons.Default.CreditCard
            )
        }
    }
}

@Composable
private fun StatItem(label: String, value: String, icon: ImageVector) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, contentDescription = label, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
        Spacer(Modifier.height(4.dp))
        Text(text = value, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(2.dp))
        Text(text = label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
    }
}

enum class ProfileMenuItemType {
    ORDERS, ADDRESSES, PAYMENT_METHODS, SETTINGS, LOGOUT
}

data class ProfileMenuItem(
    val type: ProfileMenuItemType,
    val label: String,
    val icon: ImageVector
)

@Composable
private fun ProfileMenuSection(onItemClick: (ProfileMenuItemType) -> Unit) {
    val menuItems = listOf(
        ProfileMenuItem(ProfileMenuItemType.ORDERS, "My Orders", Icons.Default.ShoppingBag),
        ProfileMenuItem(ProfileMenuItemType.ADDRESSES, "Addresses", Icons.Default.LocationOn),
        ProfileMenuItem(ProfileMenuItemType.PAYMENT_METHODS, "Payment Methods", Icons.Default.CreditCard),
        ProfileMenuItem(ProfileMenuItemType.SETTINGS, "Settings", Icons.Default.Settings)
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column {
            menuItems.forEach { item ->
                ProfileMenuItemRow(item = item, onClick = { onItemClick(item.type) })
                if (item != menuItems.last()) {
                    HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                }
            }
        }
    }

    Spacer(Modifier.height(8.dp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        ProfileMenuItemRow(
            item = ProfileMenuItem(ProfileMenuItemType.LOGOUT, "Logout", Icons.Default.Logout),
            onClick = { onItemClick(ProfileMenuItemType.LOGOUT) },
            isDestructive = true
        )
    }
}

@Composable
private fun ProfileMenuItemRow(
    item: ProfileMenuItem,
    onClick: () -> Unit,
    isDestructive: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            item.icon,
            contentDescription = item.label,
            tint = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.width(16.dp))
        Text(
            text = item.label,
            color = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.weight(1f)
        )
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
