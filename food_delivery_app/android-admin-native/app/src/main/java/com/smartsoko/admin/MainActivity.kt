package com.smartsoko.admin

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.rememberNavController
import com.smartsoko.admin.data.local.TokenManager
import com.smartsoko.admin.data.remote.ApiClient
import com.smartsoko.admin.ui.navigation.AdminNavGraph
import com.smartsoko.admin.ui.navigation.Screen
import com.smartsoko.admin.ui.theme.SmartSokoAdminTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject
    lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        
        // Restore auth token from persistent storage
        tokenManager.getToken()?.let { ApiClient.setToken(it) }

        enableEdgeToEdge()
        setContent {
            SmartSokoAdminTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    val startDestination =
                        if (tokenManager.getToken() != null) Screen.Dashboard.route
                        else Screen.Login.route
                    AdminNavGraph(
                        navController = navController,
                        startDestination = startDestination
                    )
                }
            }
        }
    }
}
