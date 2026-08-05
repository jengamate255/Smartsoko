package com.smartsoko.driver.ui.navigation

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Auth : Screen("auth")
    data object ProfileSetup : Screen("profile_setup")
    data object Home : Screen("home")
    data object Navigation : Screen("navigation/{orderId}") {
        fun createRoute(orderId: String) = "navigation/$orderId"
    }
    data object Earnings : Screen("earnings")
    data object History : Screen("history")
    data object Profile : Screen("profile")
}
