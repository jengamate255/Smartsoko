package com.fooddelivery.driver.ui.navigation

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.History
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.fooddelivery.driver.R
import com.fooddelivery.driver.ui.screens.ChatScreen
import com.fooddelivery.driver.ui.screens.HistoryScreen
import com.fooddelivery.driver.ui.screens.HomeScreen
import com.fooddelivery.driver.ui.screens.MapScreen
import com.fooddelivery.driver.ui.screens.OrderDetailScreen
import com.fooddelivery.driver.ui.screens.ProfileScreen
import com.fooddelivery.driver.ui.state.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmartSokoDriverNavHost(
    modifier: Modifier = Modifier,
    startDestination: String = "home",
    pendingOrderId: String? = null,
    pendingAction: String? = null,
    onPendingHandled: () -> Unit = {}
) {
    val navController = rememberNavController()
    val viewModel: AppViewModel = hiltViewModel()
    val context = LocalContext.current
    val user by viewModel.user.observeAsState()
    val activeOrder by viewModel.activeOrder.observeAsState()

    // Handle notification taps / deep links once the user session is loaded
    LaunchedEffect(pendingOrderId, pendingAction, user) {
        val orderId = pendingOrderId ?: return@LaunchedEffect
        if (user == null) return@LaunchedEffect
        val route = if (pendingAction == "chat") "chat/$orderId" else "order-detail/$orderId"
        navController.navigate(route) {
            launchSingleTop = true
        }
        onPendingHandled()
    }
    
    // Navigation callback for opening Google Maps
    val navigateToDestination = remember<(Double, Double, String) -> Unit> {
        { lat, lng, _ ->
            val uri = Uri.parse("google.navigation:q=$lat,$lng")
            val intent = Intent(Intent.ACTION_VIEW, uri)
            intent.setPackage("com.google.android.apps.maps")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            try {
                context.startActivity(intent)
            } catch (_: Exception) {
                val webUri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$lat,$lng")
                val webIntent = Intent(Intent.ACTION_VIEW, webUri)
                webIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(webIntent)
            }
        }
    }

    // Call customer callback
    val callCustomer = remember<(String) -> Unit> {
        { phoneNumber ->
            if (phoneNumber.isNotBlank()) {
                val uri = Uri.parse("tel:$phoneNumber")
                val intent = Intent(Intent.ACTION_DIAL, uri)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            }
        }
    }
    
    Scaffold(
        modifier = modifier.fillMaxSize(),
        bottomBar = {
            SmartSokoDriverBottomNavigation(navController = navController)
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            composable("home") {
                HomeScreen(viewModel = viewModel, navController = navController)
            }
            composable("map") {
                MapScreen(
                    activeOrder = activeOrder,
                    driverLocation = viewModel.driverLocation.value,
                    onOrderStatusUpdated = { orderId, status ->
                        viewModel.updateOrderStatus(orderId, status)
                    },
                    onNavigateToDestination = navigateToDestination
                )
            }
            composable("chat") {
                ChatScreen(viewModel = viewModel)
            }
            composable(
                route = "chat/{orderId}",
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                ChatScreen(viewModel = viewModel, orderId = orderId)
            }
            composable("history") {
                HistoryScreen(viewModel = viewModel, navController = navController)
            }
            composable("profile") {
                ProfileScreen(viewModel = viewModel)
            }
            composable(
                route = "order-detail/{orderId}",
                arguments = listOf(navArgument("orderId") { type = NavType.StringType })
            ) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                OrderDetailScreen(
                    viewModel = viewModel,
                    orderId = orderId,
                    onNavigateToMap = navigateToDestination,
                    onCallCustomer = callCustomer
                )
            }
        }
    }
}

@Composable
fun SmartSokoDriverBottomNavigation(navController: NavHostController) {
    val items = listOf(
        BottomNavItem("home", stringResource(R.string.nav_home), Icons.Default.Home),
        BottomNavItem("map", stringResource(R.string.nav_map), Icons.Default.Map),
        BottomNavItem("chat", stringResource(R.string.nav_chat), Icons.Default.Chat),
        BottomNavItem("history", stringResource(R.string.nav_history), Icons.Default.History),
        BottomNavItem("profile", stringResource(R.string.nav_profile), Icons.Default.Person)
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    NavigationBar {
        items.forEach { item ->
            NavigationBarItem(
                icon = { Icon(imageVector = item.icon, contentDescription = item.label) },
                label = { Text(item.label) },
                selected = currentDestination?.route == item.route,
                onClick = {
                    if (currentDestination?.route != item.route) {
                        navController.navigate(item.route) {
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                }
            )
        }
    }
}

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)
