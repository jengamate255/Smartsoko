package com.smartsoko.merchant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsoko.merchant.ui.screens.AddProductScreen
import com.smartsoko.merchant.ui.screens.AnalyticsScreen
import com.smartsoko.merchant.ui.screens.LoginScreen
import com.smartsoko.merchant.ui.screens.OrdersScreen
import com.smartsoko.merchant.ui.screens.ProductsScreen
import com.smartsoko.merchant.ui.screens.SettingsScreen
import com.smartsoko.merchant.ui.theme.SmartSokoTheme
import com.smartsoko.merchant.ui.viewmodel.MerchantViewModel
import com.smartsoko.merchant.ui.viewmodel.OrderFilter

class MainActivity : ComponentActivity() {
    private val viewModel: MerchantViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartSokoTheme {
                val uiState by viewModel.uiState.collectAsStateWithLifecycle()

                var isAddingProduct by remember { mutableStateOf(false) }

                if (!uiState.isAuthenticated) {
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
                        onClearError = { viewModel.clearError() }
                    )
                } else if (isAddingProduct) {
                    AddProductScreen(
                        isLoading = uiState.isLoading,
                        onBack = { isAddingProduct = false },
                        onSave = { name, desc, price, cat, unit, imageUri ->
                            viewModel.addProduct(name, desc, price, cat, unit, imageUri) {
                                isAddingProduct = false
                                viewModel.loadProducts()
                            }
                        }
                    )
                } else {
                    MerchantApp(
                        uiState = uiState,
                        onFilterChange = { viewModel.setFilter(it) },
                        onAcceptOrder = { viewModel.acceptOrder(it) },
                        onRejectOrder = { viewModel.rejectOrder(it) },
                        onMarkReady = { viewModel.markOrderReady(it) },
                        onMarkDelivered = { viewModel.markOrderDelivered(it) },
                        onToggleAvailability = { id, available ->
                            viewModel.updateProductAvailability(id, available)
                        },
                        onDeleteProduct = { viewModel.deleteProduct(it) },
                        onAddProduct = { isAddingProduct = true },
                        onSignOut = { viewModel.signOut() }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MerchantApp(
    uiState: com.smartsoko.merchant.ui.viewmodel.MerchantUiState,
    onFilterChange: (OrderFilter) -> Unit,
    onAcceptOrder: (String) -> Unit,
    onRejectOrder: (String) -> Unit,
    onMarkReady: (String) -> Unit,
    onMarkDelivered: (String) -> Unit,
    onToggleAvailability: (String, Boolean) -> Unit,
    onDeleteProduct: (String) -> Unit,
    onAddProduct: () -> Unit,
    onSignOut: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(uiState.merchant?.name ?: "SmartSoko Merchant")
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.ShoppingCart, contentDescription = "Orders") },
                    label = { Text("Orders") },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.List, contentDescription = "Products") },
                    label = { Text("Products") },
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Analytics, contentDescription = "Analytics") },
                    label = { Text("Analytics") },
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") },
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 }
                )
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            when (selectedTab) {
                0 -> OrdersScreen(
                    orders = uiState.filteredOrders,
                    currentFilter = uiState.currentFilter,
                    onFilterChange = onFilterChange,
                    onAcceptOrder = onAcceptOrder,
                    onRejectOrder = onRejectOrder,
                    onMarkReady = onMarkReady,
                    onMarkDelivered = onMarkDelivered
                )
                1 -> ProductsScreen(
                    products = uiState.products,
                    onToggleAvailability = onToggleAvailability,
                    onDeleteProduct = onDeleteProduct,
                    onAddProduct = onAddProduct
                )
                2 -> AnalyticsScreen(orders = uiState.orders)
                3 -> SettingsScreen(
                    merchant = uiState.merchant,
                    onSignOut = onSignOut
                )
            }
        }
    }
}
