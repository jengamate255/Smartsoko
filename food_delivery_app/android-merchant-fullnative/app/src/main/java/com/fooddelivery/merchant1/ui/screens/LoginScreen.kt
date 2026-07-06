package com.fooddelivery.merchant1.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.fooddelivery.merchant1.R
import com.fooddelivery.merchant1.util.Validators

@Composable
fun LoginScreen(
    isLoading: Boolean,
    error: String?,
    onSignIn: (String, String) -> Unit,
    onSignUp: () -> Unit,
    onForgotPassword: () -> Unit,
    onClearError: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var attemptedSubmit by remember { mutableStateOf(false) }

    fun validate(): Boolean {
        emailError = Validators.emailError(email)
        passwordError = if (password.isBlank()) "Password is required" else null
        return emailError == null && passwordError == null
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Logo placeholder
        Box(
            modifier = Modifier
                .size(120.dp)
                .padding(bottom = 32.dp),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_launcher_foreground),
                contentDescription = "Logo",
                modifier = Modifier.fillMaxSize()
            )
        }

        Text(
            text = "SmartSoko Merchant",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        Text(
            text = "Manage your business",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        // Error message
        if (error != null) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            ) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            LaunchedEffect(error) {
                kotlinx.coroutines.delay(3000)
                onClearError()
            }
        }

        // Email field
        OutlinedTextField(
            value = email,
            onValueChange = {
                email = it
                if (attemptedSubmit) emailError = Validators.emailError(it)
            },
            label = { Text("Email") },
            isError = emailError != null,
            supportingText = {
                if (emailError != null) Text(emailError!!, color = MaterialTheme.colorScheme.error)
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next
            ),
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        )

        // Password field
        OutlinedTextField(
            value = password,
            onValueChange = {
                password = it
                if (attemptedSubmit) passwordError = if (it.isBlank()) "Password is required" else null
            },
            label = { Text("Password") },
            isError = passwordError != null,
            supportingText = {
                if (passwordError != null) Text(passwordError!!, color = MaterialTheme.colorScheme.error)
            },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp)
        )

        // Forgot Password link
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.End
        ) {
            TextButton(onClick = onForgotPassword) {
                Text("Forgot Password?")
            }
        }

        // Login button
        Button(
            onClick = {
                attemptedSubmit = true
                if (validate()) {
                    onSignIn(email, password)
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            enabled = !isLoading
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Sign In", style = MaterialTheme.typography.titleMedium)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(onClick = onSignUp) {
            Text("Don't have an account? Create Account")
        }
    }
}
