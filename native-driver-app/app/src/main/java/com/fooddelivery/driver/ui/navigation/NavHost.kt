package com.fooddelivery.driver.ui.navigation

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.rememberSaveable
import androidx.compose.material3.icons.Icons
import androidx.compose.material3.icons.filled.Home
import androidx.compose.material3.icons.filled.Map
import androidx.compose.material3.icons.filled.Chat
import androidx.compose.material3.icons.filled.History
import androidx.compose.material3.icons.filled.Person
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.ComposerKt
import androidx.navigation.NavHostController
import androidx.navigation.compose.ComposableDestination
import androidx.navigation.compose.rememberNavController
import androidx.navigation.compose.navArgument
import androidx.navigation.compose.navGraph
import com.fooddelivery.driver.R
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme

@Composable
fun SmartSokoDriverNavHost(
    modifier: Modifier = Modifier,
    startDestination: String = "home"
) {
    val navController = rememberNavController()
    SmartSokoDriverTheme {
        // We add WindowInsets to handle system bars correctly
        androidx.compose.foundation.layout.WindowInsetsScaffold { paddingValues ->
            SmartSokoDriverNavGraph(
                navController = navController,
                modifier = modifier
                    .padding(bottom = paddingValues.calculateBottomPadding())
                    .padding(top = paddingValues.calculateTopPadding()),
                startDestination = startDestination
            )
        }
    }
}

@Composable
private fun SmartSokoDriverNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = "home",
    viewModel: AppViewModel = hiltViewModel()
) {
    androidx.navigation.compose.NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        // Home screen - shows available orders
        composable("home") {
            HomeScreen(navController = navController)
        }
        
        // Map screen - shows map with navigation
        composable("map") {
            MapScreen(
                activeOrder = viewModel.activeOrder.value,
                driverLocation = viewModel.driverLocation.value,
                onOrderStatusUpdated = { orderId, status ->
                    viewModel.updateOrderStatus(orderId, status)
                },
                onNavigateToDestination = { lat, lng, address ->
                    // Handle navigation - in a real app, this might launch Google Maps or use Mapbox navigation
                    // For now, we'll just show a toast or do nothing
                }
            )
        }
        
        // Chat screen - for chatting with customer
        composable("chat") {
            ChatScreen(navController = navController)
        }
        
        // History screen - shows past orders
        composable("history") {
            HistoryScreen(navController = navController)
        }
        
        // Profile screen - driver profile and settings
        composable("profile") {
            ProfileScreen(navController = navController)
        }
    }
}

@Composable
fun BottomNavigation(
    navController: NavHostController
) {
    val items = listOf(
        BottomNavigationItem("home", stringResource(R.string.nav_home), Home),
        BottomNavigationItem("map", stringResource(R.string.nav_map), Map),
        BottomNavigationItem("chat", stringResource(R.string.nav_chat), Chat),
        BottomNavigationItem("history", stringResource(R.string.nav_history), History),
        BottomNavigationItem("profile", stringResource(R.string.nav_profile), Person)
    )

    NavigationBar {
        val backStackEntry = navController.currentBackStackEntryAsState()
        val currentDestination = backStackEntry.value?.destination
        items.forEach { item ->
            NavigationBarItem(
                selected = currentDestination?.route == item.route,
                onClick = {
                    // Avoid multiple taps for the same destination
                    if (currentDestination?.route != item.route) {
                        navController.navigate(item.route) {
                            // Pop up to the start destination of the graph to avoid
                            // building a large back stack
                            launchSingleTop = true
                            // Restore state when re-navigating to the same destination
                            restoreState = true
                        }
                    }
                },
                icon = { item.icon() },
                label = { item.label }
            )
        }
    }
}

private data class BottomNavigationItem(
    val route: String,
    val label: @Composable () -> Unit,
    val icon: @Composable (Icons.Filled) -> Unit
)

// Helper function to create BottomNavigationItem instances
private fun BottomNavigationItem(
    route: String,
    labelId: Int,
    iconVector: Icons.Filled -> Unit
): BottomNavigationItem = BottomNavigationItem(
    route = route,
    label = { androidx.compose.material3.Text(text = stringResource(labelId)) },
    icon = iconVector
)