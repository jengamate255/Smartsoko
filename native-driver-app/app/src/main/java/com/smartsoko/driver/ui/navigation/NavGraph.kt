package com.smartsoko.driver.ui.navigation

import androidx.compose.animation.*
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.smartsoko.driver.ui.screen.auth.AuthScreen
import com.smartsoko.driver.ui.screen.auth.ProfileSetupScreen
import com.smartsoko.driver.ui.screen.earnings.EarningsScreen
import com.smartsoko.driver.ui.screen.history.HistoryScreen
import com.smartsoko.driver.ui.screen.home.HomeScreen
import com.smartsoko.driver.ui.screen.nav.NavigationScreen
import com.smartsoko.driver.ui.screen.profile.ProfileScreen
import com.smartsoko.driver.ui.screen.splash.SplashScreen

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home.route, "Home", Icons.Default.Home),
    BottomNavItem(Screen.Earnings.route, "Earnings", Icons.Default.AccountBalanceWallet),
    BottomNavItem(Screen.History.route, "History", Icons.Default.History),
    BottomNavItem(Screen.Profile.route, "Profile", Icons.Default.Person)
)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in listOf(
        Screen.Home.route, Screen.Earnings.route,
        Screen.History.route, Screen.Profile.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                if (selected) {
                                    Icon(item.icon, contentDescription = item.label)
                                } else {
                                    Icon(item.icon, contentDescription = item.label)
                                }
                            },
                            label = {
                                Text(
                                    item.label,
                                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
                                )
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route,
            modifier = Modifier.padding(innerPadding),
            enterTransition = { fadeIn(initialAlpha = 0.3f) },
            exitTransition = { fadeOut(targetAlpha = 0.3f) }
        ) {
            composable(Screen.Splash.route) {
                SplashScreen(
                    onNavigateToAuth = {
                        navController.navigate(Screen.Auth.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    },
                    onNavigateToHome = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    },
                    onNavigateToProfileSetup = {
                        navController.navigate(Screen.ProfileSetup.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Auth.route) {
                AuthScreen(
                    onVerified = { isNew ->
                        if (isNew) {
                            navController.navigate(Screen.ProfileSetup.route) {
                                popUpTo(Screen.Auth.route) { inclusive = true }
                            }
                        } else {
                            navController.navigate(Screen.Home.route) {
                                popUpTo(Screen.Auth.route) { inclusive = true }
                            }
                        }
                    }
                )
            }

            composable(Screen.ProfileSetup.route) {
                ProfileSetupScreen(
                    onComplete = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.ProfileSetup.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToOrder = { orderId ->
                        navController.navigate(Screen.Navigation.createRoute(orderId))
                    }
                )
            }

            composable(
                route = Screen.Navigation.route,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                NavigationScreen(
                    orderId = orderId,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Earnings.route) {
                EarningsScreen()
            }

            composable(Screen.History.route) {
                HistoryScreen()
            }

            composable(Screen.Profile.route) {
                ProfileScreen(
                    onLogout = {
                        navController.navigate(Screen.Auth.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
