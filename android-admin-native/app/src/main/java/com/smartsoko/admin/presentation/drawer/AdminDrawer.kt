package com.smartsoko.admin.presentation.drawer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartsoko.admin.presentation.theme.*

enum class ScreenRoute(val title: String, val icon: ImageVector) {
    Dashboard("Dashboard", Icons.Default.Dashboard),
    Orders("Orders", Icons.Default.ShoppingBag),
    Inventory("Inventory", Icons.Default.Inventory2),
    Sellers("Sellers", Icons.Default.Store),
    Users("Users", Icons.Default.People),
    Fleet("Fleet", Icons.Default.LocalShipping),
    Analytics("Analytics", Icons.Default.Analytics),
    Notifications("Notifications", Icons.Default.Campaign),
    RBAC("RBAC", Icons.Default.Shield),
    Finance("Finance Ops", Icons.Default.Payments),
    PlatformConfig("Platform Config", Icons.Default.Settings),
}

val platformScreens = listOf(ScreenRoute.Notifications, ScreenRoute.RBAC, ScreenRoute.Finance, ScreenRoute.PlatformConfig)
val harvestScreens = listOf(ScreenRoute.Dashboard, ScreenRoute.Orders, ScreenRoute.Inventory, ScreenRoute.Sellers, ScreenRoute.Users, ScreenRoute.Fleet, ScreenRoute.Analytics)

@Composable
fun AdminDrawerHeader() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(AdminPrimary)
            .padding(24.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(AdminPrimaryLight),
                contentAlignment = Alignment.Center
            ) {
                Text("SA", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            }
            Spacer(Modifier.height(12.dp))
            Text("Admin User", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.W600, fontSize = 16.sp)
            Text("Super Admin", color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
        }
    }
}

@Composable
fun AdminDrawerContent(
    currentRoute: ScreenRoute,
    onNavigate: (ScreenRoute) -> Unit,
    onLogout: () -> Unit
) {
    Column(modifier = Modifier.fillMaxHeight()) {
        AdminDrawerHeader()

        Spacer(Modifier.height(8.dp))

        Text("  Platform Admin",
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
            fontSize = 11.sp, fontWeight = FontWeight.W700, color = AdminTextHint,
            letterSpacing = 1.sp
        )

        platformScreens.forEach { screen ->
            NavigationDrawerItem(
                icon = { Icon(screen.icon, contentDescription = null, modifier = Modifier.size(22.dp)) },
                label = { Text(screen.title, fontSize = 14.sp) },
                selected = currentRoute == screen,
                onClick = { onNavigate(screen) },
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
                shape = RoundedCornerShape(12.dp)
            )
        }

        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), color = AdminBorder)

        Text("  Harvest Admin",
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
            fontSize = 11.sp, fontWeight = FontWeight.W700, color = AdminTextHint,
            letterSpacing = 1.sp
        )

        harvestScreens.forEach { screen ->
            NavigationDrawerItem(
                icon = { Icon(screen.icon, contentDescription = null, modifier = Modifier.size(22.dp)) },
                label = { Text(screen.title, fontSize = 14.sp) },
                selected = currentRoute == screen,
                onClick = { onNavigate(screen) },
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
                shape = RoundedCornerShape(12.dp)
            )
        }

        Spacer(Modifier.weight(1f))

        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = AdminBorder)
        Spacer(Modifier.height(8.dp))

        NavigationDrawerItem(
            icon = { Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(22.dp)) },
            label = { Text("Logout", fontSize = 14.sp) },
            selected = false,
            onClick = onLogout,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(Modifier.height(8.dp))
    }
}
