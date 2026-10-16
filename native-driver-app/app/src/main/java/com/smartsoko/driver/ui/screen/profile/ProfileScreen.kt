package com.smartsoko.driver.ui.screen.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.driver.ui.components.LoadingOverlay
import com.smartsoko.driver.ui.components.OnlineToggle
import com.fooddelivery.driver.di.NavigationEngine
import com.fooddelivery.driver.di.getNavigationEngine
import com.fooddelivery.driver.di.setNavigationEngine
import com.fooddelivery.driver.di.isVoiceGuidanceEnabled
import com.fooddelivery.driver.di.setVoiceGuidanceEnabled
import com.fooddelivery.driver.di.getVoiceVolume
import com.fooddelivery.driver.di.setVoiceVolume
import android.content.SharedPreferences

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    sharedPreferences: SharedPreferences,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var navEngine by remember { mutableStateOf(sharedPreferences.getNavigationEngine()) }
    var voiceEnabled by remember { mutableStateOf(sharedPreferences.isVoiceGuidanceEnabled()) }
    var voiceVolume by remember { mutableStateOf(sharedPreferences.getVoiceVolume()) }

    val onNavEngineChange: (NavigationEngine) -> Unit = { engine ->
        navEngine = engine
        sharedPreferences.setNavigationEngine(engine)
    }
    val onVoiceEnabledChange: (Boolean) -> Unit = { enabled ->
        voiceEnabled = enabled
        sharedPreferences.setVoiceGuidanceEnabled(enabled)
    }
    val onVoiceVolumeChange: (Float) -> Unit = { volume ->
        voiceVolume = volume
        sharedPreferences.setVoiceVolume(volume)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile", fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        if (state.driver == null) {
            LoadingOverlay(modifier = Modifier.padding(padding))
        } else {
            val driver = state.driver!!
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            driver.fullName.take(1).uppercase(),
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(driver.fullName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(driver.phone, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(12.dp))
                    OnlineToggle(isOnline = state.isOnline, onToggle = {})
                }

                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatCard(icon = Icons.Default.Star, value = "%.1f".format(driver.rating), label = "Rating")
                    StatCard(icon = Icons.Default.DeliveryDining, value = "${driver.totalDeliveries}", label = "Deliveries")
                    StatCard(icon = Icons.Default.Verified, value = if (driver.isVerified) "Yes" else "No", label = "Verified")
                }

                Spacer(Modifier.height(24.dp))

                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(vertical = 8.dp)) {
                        SettingsItem(Icons.Default.Notifications, "Notification Settings") {}
                        SettingsItem(Icons.Default.Info, "About") {}
                        SettingsItem(Icons.AutoMirrored.Filled.Help, "Help & Support") {}
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

                        // Navigation Settings Section
                        Text(
                            "Navigation",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                        )

                        SettingsItem(
                            icon = Icons.Default.Map,
                            label = "Navigation Engine"
                        ) {
                            // Handled by dropdown below
                        }
                        NavigationEngineDropdown(
                            selectedEngine = navEngine,
                            onEngineChange = onNavEngineChange
                        )

                        SettingsItem(
                            icon = Icons.Default.VolumeUp,
                            label = "Voice Guidance"
                        ) {
                            // Handled by switch below
                        }
                        VoiceGuidanceSettings(
                            enabled = voiceEnabled,
                            volume = voiceVolume,
                            onEnabledChange = onVoiceEnabledChange,
                            onVolumeChange = onVoiceVolumeChange
                        )

                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                        SettingsItem(Icons.AutoMirrored.Filled.Logout, "Sign Out", isDestructive = true) {
                            viewModel.logout()
                            onLogout()
                        }
                    }
                }

                Spacer(Modifier.height(32.dp))
                Text(
                    "SmartSoko Driver v1.0.0",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun StatCard(icon: ImageVector, value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
        Spacer(Modifier.height(4.dp))
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SettingsItem(
    icon: ImageVector,
    label: String,
    isDestructive: Boolean = false,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(22.dp),
            tint = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(12.dp))
        Text(label, style = MaterialTheme.typography.bodyLarge,
            color = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.weight(1f))
        Icon(Icons.Default.ChevronRight, contentDescription = null, modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun NavigationEngineDropdown(
    selectedEngine: NavigationEngine,
    onEngineChange: (NavigationEngine) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text("Preferred Engine", style = MaterialTheme.typography.bodyMedium)
        DropdownMenu(
            expanded = true,
            onDismissRequest = {},
            modifier = Modifier.width(200.dp)
        ) {
            NavigationEngine.values().forEach { engine ->
                DropdownMenuItem(
                    text = { Text(engine.label) },
                    onClick = { onEngineChange(engine) },
                    leadingIcon = {
                        if (engine == selectedEngine) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun VoiceGuidanceSettings(
    enabled: Boolean,
    volume: Float,
    onEnabledChange: (Boolean) -> Unit,
    onVolumeChange: (Float) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Voice Guidance", style = MaterialTheme.typography.bodyMedium)
            androidx.compose.material3.Switch(
                checked = enabled,
                onCheckedChange = onEnabledChange
            )
        }
        if (enabled) {
            Column(modifier = Modifier.padding(top = 8.dp)) {
                Text("Volume: ${(volume * 100).toInt()}%", style = MaterialTheme.typography.labelMedium)
                androidx.compose.material3.Slider(
                    value = volume,
                    onValueChange = onVolumeChange,
                    valueRange = 0f..1f,
                    steps = 10,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
