package com.fooddelivery.driver

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fooddelivery.driver.realtime.SocketManager
import com.fooddelivery.driver.util.AppConfig
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Smoke test: signs in with the demo driver account and verifies the
 * WebSocket connects to the backend. Requires:
 *  - a device/emulator with network access
 *  - `adb reverse tcp:3000 tcp:3000` (debug builds talk to localhost)
 */
@RunWith(AndroidJUnit4::class)
class SmokeTest {

    @Test
    fun demoDriver_canSignInAndConnectWebSocket() = runBlocking {
        val auth = FirebaseAuth.getInstance()
        auth.signInWithEmailAndPassword("driver@smartsoko.com", "demo123456").await()

        val token = auth.currentUser?.getIdToken(true)?.await()?.token
        assertTrue("Firebase ID token should be non-blank", !token.isNullOrBlank())

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val socket = SocketManager(
            context = context,
            serverUrl = AppConfig.WEBSOCKET_URL,
            authToken = token!!
        )

        var connected = false
        repeat(30) {
            if (socket.isConnected()) {
                connected = true
                return@repeat
            }
            delay(1000)
        }
        assertTrue("WebSocket should connect to the backend", connected)

        socket.disconnect()
        auth.signOut()
    }
}
