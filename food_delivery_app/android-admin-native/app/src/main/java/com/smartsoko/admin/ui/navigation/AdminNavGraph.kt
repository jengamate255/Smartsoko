package com.smartsoko.admin.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.smartsoko.admin.ui.screens.dashboard.DashboardScreen
import com.smartsoko.admin.ui.screens.login.LoginScreen
import com.smartsoko.admin.ui.screens.orders.OrderDetailScreen
import com.smartsoko.admin.ui.screens.orders.OrdersScreen
import com.smartsoko.admin.ui.screens.products.ProductDetailScreen
import com.smartsoko.admin.ui.screens.products.ProductsScreen
import com.smartsoko.admin.ui.screens.support.SupportScreen
import com.smartsoko.admin.ui.screens.users.UserDetailScreen
import com.smartsoko.admin.ui.screens.users.UsersScreen

@Composable
fun AdminNavGraph(navController: NavHostController) {
    val actions = remember(navController) {
        AdminActions(navController)
    }

    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(onLoginSuccess = { actions.navigateToDashboard() })
        }
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                onNavigateToUsers = { actions.navigateToUsers() },
                onNavigateToOrders = { actions.navigateToOrders() },
                onNavigateToProducts = { actions.navigateToProducts() },
                onNavigateToSupport = { actions.navigateToSupport() },
                onNavigateToSettings = { actions.navigateToSettings() },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
        composable(Screen.Users.route) {
            UsersScreen(onUserClick = { userId -> actions.navigateToUserDetail(userId) })
        }
        composable(
            route = Screen.UserDetail.route,
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: return@composable
            UserDetailScreen(userId = userId)
        }
        composable(Screen.Orders.route) {
            OrdersScreen(onOrderClick = { orderId -> actions.navigateToOrderDetail(orderId) })
        }
        composable(
            route = Screen.OrderDetail.route,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType })
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: return@composable
            OrderDetailScreen(orderId = orderId)
        }
        composable(Screen.Products.route) {
            ProductsScreen(onProductClick = { productId -> actions.navigateToProductDetail(productId) })
        }
        composable(
            route = Screen.ProductDetail.route,
            arguments = listOf(navArgument("productId") { type = NavType.StringType })
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId") ?: return@composable
            ProductDetailScreen(productId = productId)
        }
        composable(Screen.Support.route) {
            SupportScreen()
        }
        composable(Screen.Settings.route) {

        }
    }
}

class AdminActions(private val navController: NavHostController) {
    fun navigateToDashboard() {
        navController.navigate(Screen.Dashboard.route) {
            popUpTo(Screen.Login.route) { inclusive = true }
        }
    }
    fun navigateToUsers() { navController.navigate(Screen.Users.route) }
    fun navigateToUserDetail(userId: String) { navController.navigate(Screen.UserDetail.createRoute(userId)) }
    fun navigateToOrders() { navController.navigate(Screen.Orders.route) }
    fun navigateToOrderDetail(orderId: String) { navController.navigate(Screen.OrderDetail.createRoute(orderId)) }
    fun navigateToProducts() { navController.navigate(Screen.Products.route) }
    fun navigateToProductDetail(productId: String) { navController.navigate(Screen.ProductDetail.createRoute(productId)) }
    fun navigateToSupport() { navController.navigate(Screen.Support.route) }
    fun navigateToSettings() { navController.navigate(Screen.Settings.route) }
}
