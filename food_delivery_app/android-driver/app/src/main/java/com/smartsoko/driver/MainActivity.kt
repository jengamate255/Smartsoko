package com.smartsoko.driver

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsoko.driver.data.model.Order
import com.smartsoko.driver.ui.screens.EarningsScreen
import com.smartsoko.driver.ui.screens.ForgotPasswordScreen
import com.smartsoko.driver.ui.screens.LoginScreen
import com.smartsoko.driver.ui.screens.OrderDetailScreen
import com.smartsoko.driver.ui.screens.OrdersScreen
import com.smartsoko.driver.ui.screens.ProfileScreen
import com.smartsoko.driver.ui.screens.SignUpScreen
import com.smartsoko.driver.ui.theme.SmartSokoTheme
import com.smartsoko.driver.ui.viewmodel.DriverViewModel
import com.smartsoko.driver.ui.viewmodel.DriverUiState

class MainActivity : ComponentActivity() {
    private val viewModel: DriverViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (BuildConfig.DEBUG) {
            val email = intent.getStringExtra("debug_email")
            val password = intent.getStringExtra("debug_password")
            if (!email.isNullOrBlank() && !password.isNullOrBlank()) {
                viewModel.signIn(email, password, onSuccess = {}, onError = {})
            }
        }
        setContent {
            SmartSokoTheme {
                val uiState by viewModel.uiState.collectAsStateWithLifecycle()

                var isSigningUp by remember { mutableStateOf(false) }
                var isResettingPassword by remember { mutableStateOf(false) }
                var selectedOrder by remember { mutableStateOf<Order?>(null) }

                if (!uiState.isAuthenticated) {
                    if (isSigningUp) {
                        SignUpScreen(
                            isLoading = uiState.isLoading,
                            error = uiState.error,
                            onSignUp = { email, password, name, phone, vehicleType, vehiclePlate ->
                                viewModel.signUp(
                                    email = email,
                                    password = password,
                                    name = name,
                                    phone = phone,
                                    vehicleType = vehicleType,
                                    vehiclePlate = vehiclePlate,
                                    onSuccess = { isSigningUp = false },
                                    onError = {}
                                )
                            },
                            onBack = { isSigningUp = false },
                            onClearError = { viewModel.clearError() }
                        )
                    } else if (isResettingPassword) {
                        ForgotPasswordScreen(
                            isLoading = uiState.isLoading,
                            error = uiState.error,
                            onResetPassword = { email ->
                                viewModel.resetPassword(
                                    email = email,
                                    onSuccess = {},
                                    onError = {}
                                )
                            },
                            onBack = { isResettingPassword = false },
                            onClearError = { viewModel.clearError() }
                        )
                    } else {
                        LoginScreen(
                            isLoading = uiState.isLoading,
                            error = uiState.error,
                            onSignIn = { email, password ->
                                viewModel.signIn(
                                    email = email,
                                    password = password,
                                    onSuccess = {},
                                    onError = {}
                                )
                            },
                            onGoogleSignIn = { idToken -> viewModel.signInWithGoogle(idToken) },
                            onSignUp = { isSigningUp = true },
                            onForgotPassword = { isResettingPassword = true },
                            onClearError = { viewModel.clearError() }
                        )
                    }
                } else if (selectedOrder != null) {
                    OrderDetailScreen(
                        order = selectedOrder!!,
                        onBack = { selectedOrder = null },
                        onAcceptOrder = { viewModel.acceptOrder(it); selectedOrder = null },
                        onMarkPickedUp = { viewModel.markPickedUp(it); selectedOrder = null },
                        onMarkDelivered = { viewModel.markDelivered(it); selectedOrder = null }
                    )
                } else {
                    DriverApp(
                        uiState = uiState,
                        onOrderClick = { selectedOrder = it },
                        onAcceptOrder = { viewModel.acceptOrder(it) },
                        onRefreshOrders = { viewModel.refreshOrders() },
                        onToggleOnline = { viewModel.toggleOnline(it) },
                        onSignOut = { viewModel.signOut() }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriverApp(
    uiState: DriverUiState,
    onOrderClick: (Order) -> Unit,
    onAcceptOrder: (String) -> Unit,
    onRefreshOrders: () -> Unit,
    onToggleOnline: (Boolean) -> Unit,
    onSignOut: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        uiState.driver?.name ?: "SmartSoko",
                        fontWeight = FontWeight.Bold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 3.dp
            ) {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.List, contentDescription = "Orders") },
                    label = { Text("Orders") },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.LocalShipping, contentDescription = "Deliveries") },
                    label = { Text("Deliveries") },
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.BarChart, contentDescription = "Earnings") },
                    label = { Text("Earnings") },
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.AccountCircle, contentDescription = "Profile") },
                    label = { Text("Profile") },
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 }
                )
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            when (selectedTab) {
                0 -> OrdersScreen(
                    availableOrders = uiState.availableOrders,
                    assignedOrders = uiState.assignedOrders,
                    onOrderClick = onOrderClick,
                    onAcceptOrder = onAcceptOrder,
                    onRefresh = onRefreshOrders
                )
                1 -> OrdersScreen(
                    availableOrders = emptyList(),
                    assignedOrders = uiState.assignedOrders.filter {
                        it.status in listOf(
                            com.smartsoko.driver.data.model.OrderStatus.ACCEPTED,
                            com.smartsoko.driver.data.model.OrderStatus.PICKEDUP
                        )
                    },
                    onOrderClick = onOrderClick,
                    onAcceptOrder = onAcceptOrder,
                    onRefresh = onRefreshOrders
                )
                2 -> EarningsScreen(assignedOrders = uiState.assignedOrders)
                3 -> ProfileScreen(
                    driver = uiState.driver,
                    onToggleOnline = onToggleOnline,
                    onSignOut = onSignOut
                )
            }
        }
    }
}
