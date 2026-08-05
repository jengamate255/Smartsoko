package com.smartsoko.customer.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.rememberNavController
import com.smartsoko.customer.presentation.navigation.SmartsokoNavGraph
import com.smartsoko.customer.presentation.theme.SmartsokoTheme
import com.smartsoko.customer.presentation.viewmodel.MainViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    private val mainViewModel: MainViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartsokoTheme {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .safeDrawingPadding(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainNavHost(mainViewModel = mainViewModel)
                }
            }
        }
    }
}

@Composable
fun MainNavHost(mainViewModel: MainViewModel) {
    val navController = rememberNavController()
    val startDestination by mainViewModel.startDestination.collectAsStateWithLifecycle()
    
    SmartsokoNavGraph(
        navController = navController,
        startDestination = startDestination
    )
}