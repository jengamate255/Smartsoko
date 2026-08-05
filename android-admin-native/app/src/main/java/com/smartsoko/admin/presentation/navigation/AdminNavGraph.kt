package com.smartsoko.admin.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.smartsoko.admin.presentation.login.LoginScreen
import com.smartsoko.admin.presentation.shell.DashboardShell

@Composable
fun AdminNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("admin_shell") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }

        composable("admin_shell") {
            DashboardShell(
                onLogout = {
                    navController.navigate("login") {
                        popUpTo("admin_shell") { inclusive = true }
                    }
                }
            )
        }
    }
}
