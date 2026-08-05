package com.smartsoko.customer.presentation.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Onboarding : Screen("onboarding")
    object Login : Screen("login")
    object Signup : Screen("signup")
    object Home : Screen("home")
    object ProductList : Screen("product_list?categoryId={categoryId}") {
        fun createRoute(categoryId: String?) = if (categoryId != null) "product_list?categoryId=$categoryId" else "product_list"
    }
    object ProductDetails : Screen("product_details/{productId}") {
        fun createRoute(productId: String) = "product_details/$productId"
    }
    object Cart : Screen("cart")
    object Checkout : Screen("checkout")
    object Orders : Screen("orders")
    object OrderTracking : Screen("order_tracking/{orderId}") {
        fun createRoute(orderId: String) = "order_tracking/$orderId"
    }
    object Profile : Screen("profile")
    object Search : Screen("search/{query}") {
        fun createRoute(query: String) = "search/$query"
    }
    object AddressList : Screen("address_list")
    object AddAddress : Screen("add_address")
    object EditAddress : Screen("edit_address/{addressId}") {
        fun createRoute(addressId: String) = "edit_address/$addressId"
    }
}
