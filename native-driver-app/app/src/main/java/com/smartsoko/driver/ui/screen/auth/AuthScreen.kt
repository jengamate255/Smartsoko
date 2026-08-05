package com.smartsoko.driver.ui.screen.auth

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartsoko.driver.ui.components.ActionButton

@Composable
fun AuthScreen(
    onVerified: (Boolean) -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.verified) {
        if (state.verified) onVerified(state.isNewDriver)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.widthIn(max = 400.dp)
        ) {
            Text(
                text = "SMARTSOKO",
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "Driver Login",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(Modifier.height(32.dp))

            AnimatedContent(targetState = state.otpSent, label = "auth_step") { otpSent ->
                if (!otpSent) {
                    Column {
                        OutlinedTextField(
                            value = state.phone,
                            onValueChange = viewModel::setPhone,
                            label = { Text("Phone Number") },
                            leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            isError = state.error != null,
                            supportingText = state.error?.let { { Text(it) } }
                        )
                        Spacer(Modifier.height(16.dp))
                        ActionButton(
                            text = "Send OTP",
                            onClick = viewModel::sendOtp,
                            enabled = state.phone.length >= 10 && !state.isLoading
                        )
                    }
                } else {
                    Column {
                        OutlinedTextField(
                            value = state.otp,
                            onValueChange = viewModel::setOtp,
                            label = { Text("Enter OTP") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            isError = state.error != null,
                            supportingText = state.error?.let { { Text(it) } }
                        )
                        Spacer(Modifier.height(16.dp))
                        ActionButton(
                            text = "Verify & Login",
                            onClick = viewModel::verifyOtp,
                            enabled = state.otp.length >= 4 && !state.isLoading
                        )
                    }
                }
            }

            if (state.isLoading) {
                Spacer(Modifier.height(16.dp))
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
            }
        }
    }
}
