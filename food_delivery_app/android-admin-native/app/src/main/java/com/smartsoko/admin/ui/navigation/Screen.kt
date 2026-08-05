package com.smartsoko.admin.ui.navigation

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Dashboard : Screen("dashboard")
    data object Users : Screen("users")
    data object UserDetail : Screen("users/{userId}") {
        fun createRoute(userId: String) = "users/$userId"
    }
    data object Orders : Screen("orders")
    data object OrderDetail : Screen("orders/{orderId}") {
        fun createRoute(orderId: String) = "orders/$orderId"
    }
    data object Products : Screen("products")
    data object ProductDetail : Screen("products/{productId}") {
        fun createRoute(productId: String) = "products/$productId"
    }
    data object Support : Screen("support")
    data object Settings : Screen("settings")
}
