package com.smartsoko.merchant

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsoko.merchant.BuildConfig
import com.smartsoko.merchant.data.model.Order
import com.smartsoko.merchant.data.model.Product
import com.smartsoko.merchant.ui.screens.AddProductScreen
import com.smartsoko.merchant.ui.screens.AnalyticsScreen
import com.smartsoko.merchant.ui.screens.EditProductScreen
import com.smartsoko.merchant.ui.screens.EditProfileScreen
import com.smartsoko.merchant.ui.screens.LoginScreen
import com.smartsoko.merchant.ui.screens.NewOrderAlertBanner
import com.smartsoko.merchant.ui.screens.OrderDetailScreen
import com.smartsoko.merchant.ui.screens.OrdersScreen
import com.smartsoko.merchant.ui.screens.ProductsScreen
import com.smartsoko.merchant.ui.screens.SettingsScreen
import com.smartsoko.merchant.ui.screens.SignUpScreen
import com.smartsoko.merchant.ui.screens.ForgotPasswordScreen
import com.smartsoko.merchant.ui.theme.SmartSokoTheme
import com.smartsoko.merchant.ui.viewmodel.MerchantViewModel
import com.smartsoko.merchant.ui.viewmodel.OrderFilter

class MainActivity : ComponentActivity() {
    private val viewModel: MerchantViewModel by viewModels()

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

                var isAddingProduct by remember { mutableStateOf(false) }
                var productToEdit by remember { mutableStateOf<Product?>(null) }
                var selectedOrder by remember { mutableStateOf<Order?>(null) }
                var isEditingProfile by remember { mutableStateOf(false) }
                var isSigningUp by remember { mutableStateOf(false) }
                var isResettingPassword by remember { mutableStateOf(false) }

                if (!uiState.isAuthenticated) {
                    if (isSigningUp) {
                        SignUpScreen(
                            isLoading = uiState.isLoading,
                            error = uiState.error,
                            onSignUp = { email, password, name, phone, address, description, category, deliveryFee, minOrderAmount, deliveryTime ->
                                viewModel.signUp(
                                    email = email,
                                    password = password,
                                    name = name,
                                    phone = phone,
                                    address = address,
                                    description = description,
                                    category = category,
                                    deliveryFee = deliveryFee.toDoubleOrNull() ?: 0.0,
                                    minOrderAmount = minOrderAmount.toDoubleOrNull() ?: 0.0,
                                    deliveryTime = deliveryTime,
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
                } else if (isEditingProfile && uiState.merchant != null) {
                    val merchant = uiState.merchant!!
                    EditProfileScreen(
                        merchant = merchant,
                        isLoading = uiState.isLoading,
                        onBack = { isEditingProfile = false },
                        onSave = { name, phone, address, desc, fee, min, time ->
                            viewModel.updateMerchantProfile(
                                name = name,
                                phone = phone,
                                address = address,
                                description = desc,
                                deliveryFee = fee,
                                minOrderAmount = min,
                                deliveryTime = time,
                                onSuccess = { isEditingProfile = false },
                                onError = {}
                            )
                        }
                    )
                } else if (selectedOrder != null) {
                    OrderDetailScreen(
                        order = selectedOrder!!,
                        onBack = { selectedOrder = null },
                        onAcceptOrder = { viewModel.acceptOrder(it); selectedOrder = null },
                        onRejectOrder = { viewModel.rejectOrder(it); selectedOrder = null },
                        onMarkReady = { viewModel.markOrderReady(it); selectedOrder = null },
                        onMarkDelivered = { viewModel.markOrderDelivered(it); selectedOrder = null }
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
                } else if (productToEdit != null) {
                    EditProductScreen(
                        product = productToEdit!!,
                        isLoading = uiState.isLoading,
                        onBack = { productToEdit = null },
                        onSave = { id, name, desc, price, origPrice, cat, unit, stock, featured, imageUri ->
                            viewModel.updateProduct(
                                productId = id,
                                name = name,
                                description = desc,
                                price = price,
                                originalPrice = origPrice,
                                category = cat,
                                unit = unit,
                                stockQuantity = stock,
                                featured = featured,
                                imageUri = imageUri,
                                onSuccess = { productToEdit = null },
                                onError = {}
                            )
                        }
                    )
                } else {
                    MerchantApp(
                        onErrorDismiss = { viewModel.clearError() },
                        uiState = uiState,
                        onOrderClick = { selectedOrder = it },
                        onFilterChange = { viewModel.setFilter(it) },
                        onAcceptOrder = { viewModel.acceptOrder(it) },
                        onRejectOrder = { viewModel.rejectOrder(it) },
                        onMarkReady = { viewModel.markOrderReady(it) },
                        onMarkDelivered = { viewModel.markOrderDelivered(it) },
                        onToggleAvailability = { id, available ->
                            viewModel.updateProductAvailability(id, available)
                        },
                        onDeleteProduct = { viewModel.deleteProduct(it) },
                        onEditProduct = { productToEdit = it },
                        onAddProduct = { isAddingProduct = true },
                        onEditProfile = { isEditingProfile = true },
                        onToggleStoreOpen = { viewModel.toggleStoreOpen(it) },
                        onProductSearchChange = { viewModel.setProductSearchQuery(it) },
                        onOrderSearchChange = { viewModel.setOrderSearchQuery(it) },
                        onDismissNewOrderAlert = { viewModel.dismissNewOrderAlert() },
                        onSignOut = { viewModel.signOut() },
                        onRefreshOrders = { viewModel.refreshOrders() },
                        onRefreshProducts = { viewModel.refreshProducts() }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MerchantApp(
    onErrorDismiss: () -> Unit = {},
    uiState: com.smartsoko.merchant.ui.viewmodel.MerchantUiState,
    onOrderClick: (Order) -> Unit,
    onFilterChange: (OrderFilter) -> Unit,
    onAcceptOrder: (String) -> Unit,
    onRejectOrder: (String) -> Unit,
    onMarkReady: (String) -> Unit,
    onMarkDelivered: (String) -> Unit,
    onToggleAvailability: (String, Boolean) -> Unit,
    onDeleteProduct: (String) -> Unit,
    onEditProduct: (com.smartsoko.merchant.data.model.Product) -> Unit,
    onAddProduct: () -> Unit,
    onEditProfile: () -> Unit,
    onToggleStoreOpen: (Boolean) -> Unit,
    onProductSearchChange: (String) -> Unit,
    onOrderSearchChange: (String) -> Unit,
    onDismissNewOrderAlert: () -> Unit,
    onSignOut: () -> Unit,
    onRefreshOrders: () -> Unit,
    onRefreshProducts: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            onErrorDismiss()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Text(
                            uiState.merchant?.name ?: "SmartSoko",
                            fontWeight = FontWeight.Bold
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        titleContentColor = MaterialTheme.colorScheme.onSurface
                    )
                )
                NewOrderAlertBanner(
                    order = uiState.newOrderAlert,
                    onClick = {
                        onOrderClick(it)
                        onDismissNewOrderAlert()
                    },
                    onDismiss = onDismissNewOrderAlert
                )
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 3.dp
            ) {
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
                    icon = { Icon(Icons.Default.BarChart, contentDescription = "Analytics") },
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
                    searchQuery = uiState.orderSearchQuery,
                    onSearchQueryChange = onOrderSearchChange,
                    onOrderClick = onOrderClick,
                    onFilterChange = onFilterChange,
                    onAcceptOrder = onAcceptOrder,
                    onRejectOrder = onRejectOrder,
                    onMarkReady = onMarkReady,
                    onMarkDelivered = onMarkDelivered,
                    onRefresh = onRefreshOrders
                )
                1 -> ProductsScreen(
                    products = uiState.filteredProducts,
                    searchQuery = uiState.productSearchQuery,
                    onSearchQueryChange = onProductSearchChange,
                    onToggleAvailability = onToggleAvailability,
                    onDeleteProduct = onDeleteProduct,
                    onEditProduct = onEditProduct,
                    onAddProduct = onAddProduct,
                    onRefresh = onRefreshProducts
                )
                2 -> AnalyticsScreen(orders = uiState.orders)
                3 -> SettingsScreen(
                    merchant = uiState.merchant,
                    onEditProfile = onEditProfile,
                    onToggleStoreOpen = onToggleStoreOpen,
                    onSignOut = onSignOut
                )
            }
        }
    }
}
