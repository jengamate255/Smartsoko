package com.smartsoko.customer.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.smartsoko.customer.presentation.auth.LoginScreen
import com.smartsoko.customer.presentation.auth.SignupScreen
import com.smartsoko.customer.presentation.cart.CartScreen
import com.smartsoko.customer.presentation.checkout.CheckoutScreen
import com.smartsoko.customer.presentation.home.HomeScreen
import com.smartsoko.customer.presentation.onboarding.OnboardingScreen
import com.smartsoko.customer.presentation.orders.OrdersScreen
import com.smartsoko.customer.presentation.profile.ProfileScreen
import com.smartsoko.customer.presentation.productdetails.ProductDetailsScreen
import com.smartsoko.customer.presentation.productlist.ProductListScreen
import com.smartsoko.customer.presentation.search.SearchScreen
import com.smartsoko.customer.presentation.splash.SplashScreen
import com.smartsoko.customer.presentation.address.AddressListScreen
import com.smartsoko.customer.presentation.address.AddressFormScreen
import com.smartsoko.customer.presentation.tracking.OrderTrackingScreen

@Composable
fun SmartsokoNavGraph(
    navController: NavHostController,
    startDestination: String
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToOnboarding = {
                    navController.navigate(Screen.Onboarding.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToSignup = {
                    navController.navigate(Screen.Signup.route)
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Signup.route) {
            SignupScreen(
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Signup.route) { inclusive = true }
                    }
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToProductDetails = { productId ->
                    navController.navigate(Screen.ProductDetails.createRoute(productId))
                },
                onNavigateToCart = {
                    navController.navigate(Screen.Cart.route)
                },
                onNavigateToOrders = {
                    navController.navigate(Screen.Orders.route)
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                },
                onNavigateToSearch = { query ->
                    navController.navigate(Screen.Search.createRoute(query))
                },
                onNavigateToCategory = { categoryId ->
                    navController.navigate(Screen.ProductList.createRoute(categoryId))
                }
            )
        }
        
        composable(
            route = Screen.ProductList.route,
            arguments = listOf(
                navArgument("categoryId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val categoryId = backStackEntry.arguments?.getString("categoryId")
            ProductListScreen(
                categoryId = categoryId,
                onNavigateToProductDetails = { productId ->
                    navController.navigate(Screen.ProductDetails.createRoute(productId))
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(
            route = Screen.ProductDetails.route,
            arguments = listOf(
                navArgument("productId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId") ?: return@composable
            ProductDetailsScreen(
                productId = productId,
                onNavigateToCheckout = {
                    navController.navigate(Screen.Checkout.route)
                },
                onNavigateToCart = {
                    navController.navigate(Screen.Cart.route)
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(Screen.Cart.route) {
            CartScreen(
                onNavigateToCheckout = {
                    navController.navigate(Screen.Checkout.route)
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(Screen.Checkout.route) {
            CheckoutScreen(
                onNavigateToOrders = {
                    navController.navigate(Screen.Orders.route) {
                        popUpTo(Screen.Home.route)
                    }
                },
                onNavigateToAddAddress = {
                    navController.navigate(Screen.AddAddress.route)
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(Screen.Orders.route) {
            OrdersScreen(
                onNavigateToTracking = { orderId ->
                    navController.navigate(Screen.OrderTracking.createRoute(orderId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(
            route = Screen.OrderTracking.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: return@composable
            OrderTrackingScreen(
                navController = navController,
                orderId = orderId
            )
        }
        
        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateToOrders = {
                    navController.navigate(Screen.Orders.route)
                },
                onNavigateToAddresses = {
                    navController.navigate(Screen.AddressList.route)
                },
                onNavigateToPaymentMethods = { /* TODO: Add payment methods screen */ },
                onNavigateToSettings = { /* TODO: Add settings screen */ },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.AddressList.route) {
            AddressListScreen(
                onNavigateToAddAddress = {
                    navController.navigate(Screen.AddAddress.route)
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.AddAddress.route) {
            AddressFormScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.EditAddress.route,
            arguments = listOf(
                navArgument("addressId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val addressId = backStackEntry.arguments?.getString("addressId") ?: return@composable
            AddressFormScreen(
                addressId = addressId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.Search.route,
            arguments = listOf(
                navArgument("query") {
                    type = NavType.StringType
                    defaultValue = ""
                }
            )
        ) { backStackEntry ->
            val query = backStackEntry.arguments?.getString("query") ?: ""
            SearchScreen(
                initialQuery = query,
                onNavigateToProductDetails = { productId ->
                    navController.navigate(Screen.ProductDetails.createRoute(productId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
