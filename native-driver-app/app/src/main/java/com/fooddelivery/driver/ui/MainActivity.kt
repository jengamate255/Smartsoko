package com.fooddelivery.driver.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.fooddelivery.driver.R
import com.fooddelivery.driver.ui.navigation.SmartSokoDriverNavHost
import com.fooddelivery.driver.ui.theme.SmartSokoDriverTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    // Pending navigation targets coming from notification taps / deep links
    private var pendingOrderId by mutableStateOf<String?>(null)
    private var pendingAction by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
        setContent {
            SmartSokoDriverTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .safeDrawingPadding(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    DriverApp(
                        pendingOrderId = pendingOrderId,
                        pendingAction = pendingAction,
                        onPendingHandled = {
                            pendingOrderId = null
                            pendingAction = null
                        }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    /**
     * Extracts a navigation target from notification tap intents
     * (VIEW_ORDER / VIEW_ORDER_STATUS / VIEW_CHAT with an orderId extra)
     * or custom-scheme deep links (smartsoko://driver/order/ORD123).
     */
    private fun handleIntent(intent: Intent?) {
        intent ?: return
        val orderId = intent.getStringExtra("orderId")

        when {
            intent.action == "VIEW_CHAT" && orderId != null -> {
                pendingOrderId = orderId
                pendingAction = "chat"
            }

            (intent.action == "VIEW_ORDER" || intent.action == "VIEW_ORDER_STATUS") && orderId != null -> {
                pendingOrderId = orderId
                pendingAction = "order-detail"
            }

            intent.action == Intent.ACTION_VIEW &&
                intent.data?.scheme == "smartsoko" &&
                intent.data?.host == "driver" -> {
                val path = intent.data?.pathSegments
                if (path != null && path.size == 2 && path[0] == "order") {
                    pendingOrderId = path[1]
                    pendingAction = "order-detail"
                }
            }
        }
    }
}

@Composable
fun DriverApp(
    pendingOrderId: String? = null,
    pendingAction: String? = null,
    onPendingHandled: () -> Unit = {}
) {
    SmartSokoDriverNavHost(
        pendingOrderId = pendingOrderId,
        pendingAction = pendingAction,
        onPendingHandled = onPendingHandled
    )
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
