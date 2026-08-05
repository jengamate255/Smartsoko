package com.smartsoko.admin.presentation.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.admin.presentation.drawer.AdminDrawerContent
import com.smartsoko.admin.presentation.drawer.ScreenRoute
import com.smartsoko.admin.presentation.dashboard.DashboardContent
import com.smartsoko.admin.presentation.finance.FinanceContent
import com.smartsoko.admin.presentation.notifications.NotificationsContent
import com.smartsoko.admin.presentation.platformconfig.PlatformConfigContent
import com.smartsoko.admin.presentation.rbac.RBACContent
import com.smartsoko.admin.presentation.theme.*
import com.smartsoko.admin.presentation.viewmodel.AdminViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardShell(
    onLogout: () -> Unit,
    viewModel: AdminViewModel = hiltViewModel()
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var currentRoute by remember { mutableStateOf(ScreenRoute.Dashboard) }

    val snackbarHostState = remember { SnackbarHostState() }
    val error by viewModel.error.collectAsStateWithLifecycle()
    val successMessage by viewModel.successMessage.collectAsStateWithLifecycle()

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it, duration = SnackbarDuration.Short)
            viewModel.clearError()
        }
    }
    LaunchedEffect(successMessage) {
        successMessage?.let {
            snackbarHostState.showSnackbar(it, duration = SnackbarDuration.Short)
            viewModel.clearSuccess()
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = MaterialTheme.colorScheme.surface,
                modifier = Modifier.width(300.dp)
            ) {
                AdminDrawerContent(
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        currentRoute = route
                        scope.launch { drawerState.close() }
                    },
                    onLogout = onLogout
                )
            }
        }
    ) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(getTitle(currentRoute), fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            if (currentRoute == ScreenRoute.Dashboard) {
                                Text("Platform Admin", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = AdminHeaderBg,
                        titleContentColor = androidx.compose.ui.graphics.Color.White,
                        navigationIconContentColor = androidx.compose.ui.graphics.Color.White,
                        actionIconContentColor = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f)
                    ),
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Open menu")
                        }
                    },
                    actions = {
                        if (currentRoute != ScreenRoute.Dashboard) {
                            IconButton(onClick = {
                                viewModel.clearError()
                                currentRoute = ScreenRoute.Dashboard
                            }) {
                                Icon(Icons.Default.Close, contentDescription = "Close")
                            }
                        } else {
                            Icon(Icons.Default.Notifications, contentDescription = "Notifications",
                                modifier = Modifier.padding(end = 8.dp))
                            Spacer(Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(androidx.compose.ui.graphics.Color.White)
                                    .padding(end = 16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("SA", color = AdminPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                            }
                            Spacer(Modifier.width(8.dp))
                        }
                    }
                )
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                when (currentRoute) {
                    ScreenRoute.Dashboard -> DashboardContent(viewModel)
                    ScreenRoute.Notifications -> NotificationsContent(viewModel, onBack = { currentRoute = ScreenRoute.Dashboard })
                    ScreenRoute.RBAC -> RBACContent(viewModel, onBack = { currentRoute = ScreenRoute.Dashboard })
                    ScreenRoute.Finance -> FinanceContent(viewModel, onBack = { currentRoute = ScreenRoute.Dashboard })
                    ScreenRoute.PlatformConfig -> PlatformConfigContent(viewModel, onBack = { currentRoute = ScreenRoute.Dashboard })
                    else -> DashboardContent(viewModel)
                }
            }
        }
    }
}

private fun getTitle(route: ScreenRoute): String = when (route) {
    ScreenRoute.Dashboard -> "Dashboard"
    ScreenRoute.Notifications -> "Notifications Broadcast"
    ScreenRoute.RBAC -> "RBAC — Roles & Permissions"
    ScreenRoute.Finance -> "Finance Operations"
    ScreenRoute.PlatformConfig -> "Platform Config"
    else -> route.title
}
