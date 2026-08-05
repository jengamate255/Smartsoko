package com.smartsoko.admin.presentation.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Dashboard : Screen("dashboard")
    object Notifications : Screen("notifications")
    object RBAC : Screen("rbac")
    object Finance : Screen("finance")
    object PlatformConfig : Screen("platform_config")
}
