package com.fooddelivery.driver.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.fooddelivery.driver.R
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartSokoDriverTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .safeDrawingPadding(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    DriverApp()
                }
            }
        }
    }
}

@Composable
fun DriverApp() {
    // TODO: Implement navigation and main app content
    // This will be where we set up our navigation graph
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    SmartSokoDriverTheme {
        Surface {
            // This is just a preview - will be replaced with actual content
        }
    }
}