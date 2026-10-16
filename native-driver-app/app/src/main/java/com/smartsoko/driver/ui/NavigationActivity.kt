package com.smartsoko.driver.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.smartsoko.driver.ui.navigation.AppNavigation
import com.smartsoko.driver.ui.screen.nav.NavigationScreen
import com.smartsoko.driver.ui.theme.SmartSokoDriverTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class NavigationActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SmartSokoDriverTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    NavigationHost(orderId = intent.getStringExtra("orderId") ?: "", onBack = { finish() })
                }
            }
        }
    }
}

@Composable
fun NavigationHost(orderId: String, onBack: () -> Unit) {
    NavigationScreen(
        orderId = orderId,
        onBack = onBack
    )
}