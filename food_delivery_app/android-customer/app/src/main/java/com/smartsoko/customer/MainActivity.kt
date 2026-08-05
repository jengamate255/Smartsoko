package com.smartsoko.customer

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsoko.customer.BuildConfig
import com.smartsoko.customer.data.model.Merchant
import com.smartsoko.customer.data.model.Order
import com.smartsoko.customer.data.model.Product
import com.smartsoko.customer.ui.screens.CartScreen
import com.smartsoko.customer.ui.screens.CheckoutScreen
import com.smartsoko.customer.ui.screens.ForgotPasswordScreen
import com.smartsoko.customer.ui.screens.HomeScreen
import com.smartsoko.customer.ui.screens.LoginScreen
import com.smartsoko.customer.ui.screens.OrderDetailScreen
import com.smartsoko.customer.ui.screens.OrdersScreen
import com.smartsoko.customer.ui.screens.ProductDetailScreen
import com.smartsoko.customer.ui.screens.ProfileScreen
import com.smartsoko.customer.ui.screens.RestaurantMenuScreen
import com.smartsoko.customer.ui.screens.SignUpScreen
import com.smartsoko.customer.ui.theme.SmartSokoTheme
import com.smartsoko.customer.ui.viewmodel.CustomerViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: CustomerViewModel by viewModels()

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
                var selectedRestaurant by remember { mutableStateOf<Merchant?>(null) }
                var selectedProduct by remember { mutableStateOf<Product?>(null) }
                var isCheckingOut by remember { mutableStateOf(false) }
                var selectedOrder by remember { mutableStateOf<Order?>(null) }

                if (!uiState.isAuthenticated) {
                    if (isSigningUp) {
                        SignUpScreen(
                            isLoading = uiState.isLoading,
                            error = uiState.error,
                            onSignUp = { email, password, name, phone, address ->
                                viewModel.signUp(
                                    email = email,
                                    password = password,
                                    name = name,
                                    phone = phone,
                                    address = address,
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
                        onBack = { selectedOrder = null }
                    )
                } else if (isCheckingOut) {
                    CheckoutScreen(
                        defaultAddress = uiState.customer?.address ?: "",
                        cartTotal = viewModel.cartTotal,
                        deliveryFee = uiState.selectedRestaurant?.deliveryFee ?: 0.0,
                        isLoading = uiState.isLoading,
                        error = uiState.error,
                        onBack = { isCheckingOut = false },
                        onClearError = { viewModel.clearError() },
                        onPlaceOrder = { address, paymentMethod ->
                            viewModel.placeOrder(
                                deliveryAddress = address,
                                paymentMethod = paymentMethod,
                                onSuccess = {},
                                onError = {}
                            )
                        },
                        onOrderPlaced = { isCheckingOut = false }
                    )
                } else if (selectedProduct != null) {
                    ProductDetailScreen(
                        product = selectedProduct!!,
                        onBack = { selectedProduct = null },
                        onAddToCart = { product, qty ->
                            repeat(qty) { viewModel.addToCart(product) }
                            selectedProduct = null
                        }
                    )
                } else if (selectedRestaurant != null) {
                    RestaurantMenuScreen(
                        restaurant = selectedRestaurant!!,
                        products = uiState.products,
                        onBack = { selectedRestaurant = null },
                        onProductClick = { selectedProduct = it },
                        onAddToCart = { viewModel.addToCart(it) }
                    )
                } else {
                    CustomerApp(
                        uiState = uiState,
                        cartTotal = viewModel.cartTotal,
                        cartCount = viewModel.cartCount,
                        onRestaurantClick = {
                            viewModel.selectRestaurant(it.id)
                            selectedRestaurant = it
                        },
                        onSearchQueryChange = { viewModel.setSearchQuery(it) },
                        onRefresh = { viewModel.refresh() },
                        onIncreaseCart = { productId ->
                            val current = uiState.cart.firstOrNull { c -> c.productId == productId }?.quantity ?: 0
                            viewModel.updateCartQuantity(productId, current + 1)
                        },
                        onDecreaseCart = { productId ->
                            val current = uiState.cart.firstOrNull { c -> c.productId == productId }?.quantity ?: 1
                            viewModel.updateCartQuantity(productId, current - 1)
                        },
                        onRemoveCart = { viewModel.removeFromCart(it) },
                        onCheckout = { isCheckingOut = true },
                        onContinueShopping = { viewModel.loadRestaurants() },
                        onOrderClick = { selectedOrder = it },
                        onSaveProfile = { name, phone, address ->
                            viewModel.updateProfile(
                                name = name,
                                phone = phone,
                                address = address,
                                onSuccess = {},
                                onError = {}
                            )
                        },
                        onSignOut = { viewModel.signOut() },
                        onClearError = { viewModel.clearError() }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerApp(
    uiState: com.smartsoko.customer.ui.viewmodel.CustomerUiState,
    cartTotal: Double,
    cartCount: Int,
    onRestaurantClick: (Merchant) -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onRefresh: () -> Unit,
    onIncreaseCart: (String) -> Unit,
    onDecreaseCart: (String) -> Unit,
    onRemoveCart: (String) -> Unit,
    onCheckout: () -> Unit,
    onContinueShopping: () -> Unit,
    onOrderClick: (Order) -> Unit,
    onSaveProfile: (String, String, String) -> Unit,
    onSignOut: () -> Unit,
    onClearError: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "SmartSoko",
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
                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                    label = { Text("Home") },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    icon = { BadgedBox(badge = {
                        if (cartCount > 0) {
                            Badge { Text(cartCount.toString()) }
                        }
                    }) { Icon(Icons.Default.ShoppingCart, contentDescription = "Cart") } },
                    label = { Text("Cart") },
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.ReceiptLong, contentDescription = "Orders") },
                    label = { Text("Orders") },
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile") },
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 }
                )
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            when (selectedTab) {
                0 -> HomeScreen(
                    restaurants = uiState.restaurants,
                    searchQuery = uiState.searchQuery,
                    onSearchQueryChange = onSearchQueryChange,
                    onRestaurantClick = onRestaurantClick,
                    onRefresh = onRefresh
                )
                1 -> CartScreen(
                    cart = uiState.cart,
                    cartTotal = cartTotal,
                    deliveryFee = uiState.selectedRestaurant?.deliveryFee ?: 0.0,
                    onIncrease = onIncreaseCart,
                    onDecrease = onDecreaseCart,
                    onRemove = onRemoveCart,
                    onCheckout = onCheckout,
                    onContinueShopping = onContinueShopping
                )
                2 -> OrdersScreen(
                    orders = uiState.orders,
                    onOrderClick = onOrderClick
                )
                3 -> ProfileScreen(
                    customer = uiState.customer,
                    isLoading = uiState.isLoading,
                    error = uiState.error,
                    onSaveProfile = onSaveProfile,
                    onSignOut = onSignOut,
                    onClearError = onClearError
                )
            }
        }
    }
}
